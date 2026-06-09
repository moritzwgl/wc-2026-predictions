"""
scripts/convert_to_sqlite.py
────────────────────────────
Liest  data/results.csv  und schreibt eine normalisierte SQLite-DB
nach   data/football.db

Schema:
  teams        (id, name)
  tournaments  (id, name)
  venues       (id, city, country)
  matches      (id, date, home_team_id, away_team_id, home_score, away_score,
                tournament_id, venue_id, neutral, is_future)
"""

import csv
import sqlite3
from pathlib import Path

# Paths relative to the project root (one level above scripts/)
ROOT     = Path(__file__).parent.parent
CSV_PATH = ROOT / "data" / "results.csv"
DB_PATH  = ROOT / "data" / "football.db"


def get_or_insert(table, cache, cur, **fields):
    """Return the rowid for a record, inserting it if it doesn't exist."""
    key = tuple(fields.values())
    if key not in cache:
        cols         = ", ".join(fields.keys())
        placeholders = ", ".join("?" * len(fields))
        cur.execute(
            f"INSERT OR IGNORE INTO {table} ({cols}) VALUES ({placeholders})",
            list(fields.values()),
        )
        cur.execute(
            f"SELECT id FROM {table} WHERE " + " AND ".join(f"{k} = ?" for k in fields),
            list(fields.values()),
        )
        cache[key] = cur.fetchone()[0]
    return cache[key]


def main() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"Removed existing database: {DB_PATH}")

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # ── Schema ──────────────────────────────────────────────────────────────────
    cur.executescript("""
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE teams (
            id     INTEGER PRIMARY KEY,
            name   TEXT    NOT NULL UNIQUE,
            rank   INTEGER,
            points REAL
        );

        CREATE TABLE tournaments (
            id   INTEGER PRIMARY KEY,
            name TEXT    NOT NULL UNIQUE
        );

        CREATE TABLE venues (
            id      INTEGER PRIMARY KEY,
            city    TEXT NOT NULL,
            country TEXT NOT NULL,
            UNIQUE (city, country)
        );

        CREATE TABLE matches (
            id            INTEGER PRIMARY KEY,
            date          TEXT    NOT NULL,
            home_team_id  INTEGER NOT NULL REFERENCES teams(id),
            away_team_id  INTEGER NOT NULL REFERENCES teams(id),
            home_score    INTEGER,
            away_score    INTEGER,
            tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
            venue_id      INTEGER NOT NULL REFERENCES venues(id),
            neutral       INTEGER NOT NULL CHECK(neutral IN (0,1)),
            is_future     INTEGER NOT NULL CHECK(is_future IN (0,1)) DEFAULT 0
        );

        CREATE INDEX idx_matches_date       ON matches(date);
        CREATE INDEX idx_matches_home_team  ON matches(home_team_id);
        CREATE INDEX idx_matches_away_team  ON matches(away_team_id);
        CREATE INDEX idx_matches_tournament ON matches(tournament_id);
        CREATE INDEX idx_matches_is_future  ON matches(is_future);
    """)

    teams_cache       = {}
    tournaments_cache = {}
    venues_cache      = {}
    matches_rows      = []

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            home_team_id  = get_or_insert("teams",       teams_cache,       cur, name=row["home_team"])
            away_team_id  = get_or_insert("teams",       teams_cache,       cur, name=row["away_team"])
            tournament_id = get_or_insert("tournaments", tournaments_cache,  cur, name=row["tournament"])
            venue_id      = get_or_insert("venues",      venues_cache,       cur,
                                          city=row["city"], country=row["country"])

            score_raw  = row["home_score"].strip().upper()
            is_future  = 1 if score_raw == "NA" else 0
            home_score = None if is_future else int(row["home_score"])
            away_score = None if is_future else int(row["away_score"])
            neutral    = 1 if row["neutral"].strip().upper() == "TRUE" else 0

            matches_rows.append((
                row["date"], home_team_id, away_team_id,
                home_score, away_score,
                tournament_id, venue_id, neutral, is_future,
            ))

    cur.executemany("""
        INSERT INTO matches
            (date, home_team_id, away_team_id, home_score, away_score,
             tournament_id, venue_id, neutral, is_future)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, matches_rows)

    # ── DELETE NON-WC TEAMS ─────────────────────────────────────────────────────
    # Find all WC team IDs (teams that have future matches)
    cur.execute("""
        CREATE TEMP TABLE wc_team_ids AS
        SELECT DISTINCT home_team_id AS team_id FROM matches WHERE is_future = 1
        UNION
        SELECT DISTINCT away_team_id AS team_id FROM matches WHERE is_future = 1
    """)
    
    # Delete matches where at least one team is NOT a WC team
    cur.execute("""
        DELETE FROM matches 
        WHERE home_team_id NOT IN wc_team_ids 
           OR away_team_id NOT IN wc_team_ids
    """)
    
    # Delete teams that are NOT WC teams
    cur.execute("""
        DELETE FROM teams 
        WHERE id NOT IN wc_team_ids
    """)

    con.commit()

    stats = {
        "matches (total)":  cur.execute("SELECT COUNT(*) FROM matches").fetchone()[0],
        "matches (played)": cur.execute("SELECT COUNT(*) FROM matches WHERE is_future=0").fetchone()[0],
        "matches (future)": cur.execute("SELECT COUNT(*) FROM matches WHERE is_future=1").fetchone()[0],
        "teams":            cur.execute("SELECT COUNT(*) FROM teams").fetchone()[0],
        "tournaments":      cur.execute("SELECT COUNT(*) FROM tournaments").fetchone()[0],
        "venues":           cur.execute("SELECT COUNT(*) FROM venues").fetchone()[0],
    }
    con.close()

    print(f"\nDatabase created: {DB_PATH}")
    print(f"   Size: {DB_PATH.stat().st_size / 1024:.1f} KB\n")
    for label, value in stats.items():
        print(f"   {label:<22} {value:>7,}")


if __name__ == "__main__":
    main()
