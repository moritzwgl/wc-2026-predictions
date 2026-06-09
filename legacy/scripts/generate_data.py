"""
scripts/generate_data.py
────────────────────────
Liest  data/football.db  und erzeugt zwei JSON-Cache-Dateien:

  data/team_stats.json   – historische Teamstatistiken (seit 2020) + letzte 10 Spiele
  data/fixtures.json     – alle WM 2026 Gruppenspiele + H2H seit 2000 (letzte 5 Begegnungen)

Aufruf:  python scripts/generate_data.py
"""

import json
import sqlite3
from pathlib import Path

ROOT          = Path(__file__).parent.parent
DB_PATH       = ROOT / "data" / "football.db"
STATS_PATH    = ROOT / "data" / "team_stats.json"
FIXTURES_PATH = ROOT / "data" / "fixtures.json"
RANKING_PATH  = ROOT / "data" / "fifa_ranking.json"


def generate(con: sqlite3.Connection) -> None:
    cur = con.cursor()

    # ── 1. All WM-2026 teams ────────────────────────────────────────────────────
    cur.execute("""
        SELECT DISTINCT ht.name
        FROM matches m
        JOIN teams ht ON m.home_team_id = ht.id
        WHERE m.is_future = 1
        UNION
        SELECT DISTINCT at.name
        FROM matches m
        JOIN teams at ON m.away_team_id = at.id
        WHERE m.is_future = 1
    """)
    wc_teams = [row[0] for row in cur.fetchall()]

    # ── 2. Historical stats per team (since 2020) & Form (Last 10) ──────────────
    team_stats = {}
    for team in sorted(wc_teams):
        cur.execute("""
            SELECT
                ROUND(AVG(CASE WHEN m.home_team_id = t.id THEN m.home_score
                               ELSE m.away_score END), 3)       AS avg_scored,
                ROUND(AVG(CASE WHEN m.home_team_id = t.id THEN m.away_score
                               ELSE m.home_score END), 3)       AS avg_conceded,
                COUNT(*)                                         AS games,
                SUM(CASE
                    WHEN m.home_team_id = t.id AND m.home_score > m.away_score THEN 1
                    WHEN m.away_team_id = t.id AND m.away_score > m.home_score THEN 1
                    ELSE 0 END)                                  AS wins
            FROM matches m
            JOIN teams t ON (m.home_team_id = t.id OR m.away_team_id = t.id)
            WHERE m.is_future = 0
              AND m.date >= '2020-01-01'
              AND t.name  = ?
        """, (team,))
        row = cur.fetchone()

        if row and row[2]:
            games = row[2]
            team_stats[team] = {
                "avg_scored":   round(row[0] or 1.3, 3),
                "avg_conceded": round(row[1] or 1.1, 3),
                "games":        games,
                "win_rate":     round((row[3] or 0) / games, 3),
                "recent_matches": []
            }
        else:
            team_stats[team] = {
                "avg_scored":   1.3,
                "avg_conceded": 1.1,
                "games":        0,
                "win_rate":     0.4,
                "recent_matches": []
            }

        # Fetch last 10 matches for the team
        cur.execute("""
            SELECT m.date, ht.name, at.name, m.home_score, m.away_score
            FROM matches m
            JOIN teams ht ON m.home_team_id = ht.id
            JOIN teams at ON m.away_team_id = at.id
            WHERE m.is_future = 0 AND (ht.name = ? OR at.name = ?)
            ORDER BY m.date DESC
            LIMIT 10
        """, (team, team))
        
        for m_date, h_name, a_name, h_score, a_score in cur.fetchall():
            opponent = a_name if h_name == team else h_name
            is_home = h_name == team
            if h_score == a_score:
                res = "D"
            elif (is_home and h_score > a_score) or (not is_home and a_score > h_score):
                res = "W"
            else:
                res = "L"
            
            team_stats[team]["recent_matches"].append({
                "date": m_date,
                "opponent": opponent,
                "score": f"{h_score}:{a_score}" if is_home else f"{a_score}:{h_score}",
                "result": res
            })

    STATS_PATH.write_text(
        json.dumps(team_stats, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"  team_stats.json   – {len(team_stats)} teams")

    # ── 3. WM 2026 group-stage fixtures & H2H (Last 5 since 2000) ──────────────
    cur.execute("""
        SELECT
            m.date,
            ht.name  AS home,
            at.name  AS away,
            v.city,
            v.country
        FROM matches m
        JOIN teams       ht ON m.home_team_id  = ht.id
        JOIN teams       at ON m.away_team_id  = at.id
        JOIN venues      v  ON m.venue_id      = v.id
        JOIN tournaments t  ON m.tournament_id = t.id
        WHERE m.is_future = 1
          AND t.name = 'FIFA World Cup'
        ORDER BY m.date, m.id
    """)
    fixtures = []
    for r in cur.fetchall():
        date, home, away, city, country = r
        
        # Fetch H2H since 2000, limit 5
        cur_h2h = con.cursor()
        cur_h2h.execute("""
            SELECT m.date, ht.name, at.name, m.home_score, m.away_score
            FROM matches m
            JOIN teams ht ON m.home_team_id = ht.id
            JOIN teams at ON m.away_team_id = at.id
            WHERE m.is_future = 0
              AND m.date >= '2000-01-01'
              AND ((ht.name = ? AND at.name = ?) OR (ht.name = ? AND at.name = ?))
            ORDER BY m.date DESC
            LIMIT 5
        """, (home, away, away, home))
        
        h2h_matches = []
        for h_date, h_h_name, h_a_name, h_h_score, h_a_score in cur_h2h.fetchall():
            h2h_matches.append({
                "date": h_date,
                "home": h_h_name,
                "away": h_a_name,
                "home_score": h_h_score,
                "away_score": h_a_score
            })
            
        fixtures.append({
            "date": date, 
            "home": home, 
            "away": away, 
            "city": city, 
            "country": country,
            "h2h": h2h_matches
        })

    FIXTURES_PATH.write_text(
        json.dumps(fixtures, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"  fixtures.json     – {len(fixtures)} matches")

    # ── 4. FIFA Rankings Cache ──────────────────────────────────────────────────
    try:
        # Export only the rankings for the 48 World Cup teams to keep it clean
        placeholders = ",".join("?" * len(wc_teams))
        cur.execute(f"SELECT name, rank, points FROM teams WHERE name IN ({placeholders})", wc_teams)
        rankings = [{"team": row[0], "rank": row[1], "points": row[2]} for row in cur.fetchall()]
        RANKING_PATH.write_text(
            json.dumps(rankings, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"  fifa_ranking.json – {len(rankings)} teams")
    except sqlite3.OperationalError:
        print("  fifa_ranking.json – skipped (columns rank/points not found in teams)")


def main() -> None:
    if not DB_PATH.exists():
        print(f"Error: {DB_PATH} not found.")
        print("Run  python scripts/convert_to_sqlite.py  first.")
        raise SystemExit(1)

    print(f"Reading {DB_PATH} ...")
    con = sqlite3.connect(DB_PATH)
    try:
        generate(con)
    finally:
        con.close()
    print(f"\nDone. Cache files written to {ROOT / 'data'}/")


if __name__ == "__main__":
    main()
