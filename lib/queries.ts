import { getDb } from "./db";

export interface TeamInfo {
  name: string;
  flag_icon: string;
  rank: number | null;
  points: number | null;
}

export interface TeamStats {
  avg_scored: number;
  avg_conceded: number;
  games: number;
  win_rate: number;
  recent_matches: RecentMatch[];
}

export interface RecentMatch {
  date: string;
  opponent: string;
  score: string;
  result: "W" | "D" | "L";
}

export interface H2HMatch {
  date: string;
  home: string;
  away: string;
  home_score: number;
  away_score: number;
}

export interface Fixture {
  date: string;
  home: string;
  away: string;
  city: string;
  country: string;
  h2h: H2HMatch[];
}

let cachedJsonData: any = null;
function getJsonData() {
  if (cachedJsonData) return cachedJsonData;
  const fs = require('fs');
  const path = require('path');
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', file), 'utf8'));
  
  cachedJsonData = {
    matches: read('matches.json'),
    teams: read('teams.json'),
    tournaments: read('tournaments.json'),
    venues: read('venues.json')
  };
  return cachedJsonData;
}

export function getTeamFlags(): Record<string, TeamInfo> {
  if (process.env.NODE_ENV === "production") {
    const { teams } = getJsonData();
    const result: Record<string, TeamInfo> = {};
    for (const r of teams) {
      if (r.flag_icon) {
        result[r.name] = { name: r.name, flag_icon: r.flag_icon, rank: r.rank, points: r.points };
      }
    }
    return result;
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT name, flag_icon, rank, points FROM teams WHERE flag_icon IS NOT NULL`
    )
    .all() as { name: string; flag_icon: string; rank: number | null; points: number | null }[];

  return Object.fromEntries(rows.map((r) => [r.name, r]));
}

export function getFixtures(): Fixture[] {
  if (process.env.NODE_ENV === "production") {
    const { matches, teams, venues, tournaments } = getJsonData();
    const wcTournament = tournaments.find((t: any) => t.name === 'FIFA World Cup 2026');
    if (!wcTournament) return [];
    
    const futureMatches = matches.filter((m: any) => m.is_future === 1 && m.tournament_id === wcTournament.id);
    const teamMap = new Map<number, any>(teams.map((t: any) => [t.id, t]));
    const venueMap = new Map<number, any>(venues.map((v: any) => [v.id, v]));

    futureMatches.sort((a: any, b: any) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.id - b.id;
    });

    return futureMatches.map((m: any) => {
      const ht = teamMap.get(m.home_team_id);
      const at = teamMap.get(m.away_team_id);
      const v = venueMap.get(m.venue_id);

      const pastMatches = matches.filter((pm: any) => 
        pm.is_future === 0 && pm.date >= '2000-01-01' && 
        ((pm.home_team_id === m.home_team_id && pm.away_team_id === m.away_team_id) || 
         (pm.home_team_id === m.away_team_id && pm.away_team_id === m.home_team_id))
      );
      pastMatches.sort((a: any, b: any) => b.date.localeCompare(a.date));
      const h2h = pastMatches.slice(0, 5).map((pm: any) => ({
        date: pm.date,
        home: teamMap.get(pm.home_team_id).name,
        away: teamMap.get(pm.away_team_id).name,
        home_score: pm.home_score,
        away_score: pm.away_score
      }));

      return {
        date: m.date,
        home: ht.name,
        away: at.name,
        city: v.city,
        country: v.country,
        h2h
      };
    });
  }

  const db = getDb();

  const rows = db
    .prepare(
      `SELECT m.date, ht.name AS home, at.name AS away, v.city, v.country
       FROM matches m
       JOIN teams       ht ON m.home_team_id  = ht.id
       JOIN teams       at ON m.away_team_id  = at.id
       JOIN venues      v  ON m.venue_id      = v.id
       JOIN tournaments t  ON m.tournament_id = t.id
       WHERE m.is_future = 1 AND t.name = 'FIFA World Cup 2026'
       ORDER BY m.date, m.id`
    )
    .all() as { date: string; home: string; away: string; city: string; country: string }[];

  const h2hStmt = db.prepare(
    `SELECT m.date, ht.name AS home, at.name AS away, m.home_score, m.away_score
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.is_future = 0
       AND m.date >= '2000-01-01'
       AND ((ht.name = ? AND at.name = ?) OR (ht.name = ? AND at.name = ?))
     ORDER BY m.date DESC
     LIMIT 5`
  );

  return rows.map((r) => ({
    ...r,
    h2h: h2hStmt.all(r.home, r.away, r.away, r.home) as H2HMatch[],
  }));
}

export function getTeamStats(teamsNames: string[]): Record<string, TeamStats> {
  if (process.env.NODE_ENV === "production") {
    const { matches, teams } = getJsonData();
    const result: Record<string, TeamStats> = {};
    const teamMapByName = new Map<string, any>(teams.map((t: any) => [t.name, t]));
    const teamMapById = new Map<number, any>(teams.map((t: any) => [t.id, t]));

    for (const team of teamsNames) {
      const tInfo = teamMapByName.get(team);
      if (!tInfo) continue;
      const tid = tInfo.id;
      
      const teamMatches = matches.filter((m: any) => 
        m.is_future === 0 && m.date >= '2020-01-01' && 
        (m.home_team_id === tid || m.away_team_id === tid)
      );

      let totalScored = 0;
      let totalConceded = 0;
      let wins = 0;

      for (const m of teamMatches) {
        const isHome = m.home_team_id === tid;
        const scored = isHome ? m.home_score : m.away_score;
        const conceded = isHome ? m.away_score : m.home_score;
        totalScored += scored;
        totalConceded += conceded;
        if (scored > conceded) wins++;
      }
      const games = teamMatches.length;

      const recentMatchesAll = matches.filter((m: any) => m.is_future === 0 && (m.home_team_id === tid || m.away_team_id === tid));
      recentMatchesAll.sort((a: any, b: any) => b.date.localeCompare(a.date));
      const recentRows = recentMatchesAll.slice(0, 10);
      
      const recent_matches: RecentMatch[] = recentRows.map((m: any) => {
        const isHome = m.home_team_id === tid;
        const scored = isHome ? m.home_score : m.away_score;
        const conceded = isHome ? m.away_score : m.home_score;
        const res: "W" | "D" | "L" = scored > conceded ? "W" : scored === conceded ? "D" : "L";
        const opName = teamMapById.get(isHome ? m.away_team_id : m.home_team_id).name;
        return {
          date: m.date,
          opponent: opName,
          score: `${scored}:${conceded}`,
          result: res,
        };
      });

      result[team] = {
        avg_scored: games > 0 ? Math.round((totalScored / games) * 1000) / 1000 : 1.3,
        avg_conceded: games > 0 ? Math.round((totalConceded / games) * 1000) / 1000 : 1.1,
        games,
        win_rate: games > 0 ? Math.round((wins / games) * 1000) / 1000 : 0.4,
        recent_matches,
      };
    }
    return result;
  }

  const db = getDb();

  const statsStmt = db.prepare(
    `SELECT
       ROUND(AVG(CASE WHEN m.home_team_id = t.id THEN m.home_score ELSE m.away_score END), 3) AS avg_scored,
       ROUND(AVG(CASE WHEN m.home_team_id = t.id THEN m.away_score ELSE m.home_score END), 3) AS avg_conceded,
       COUNT(*) AS games,
       SUM(CASE
             WHEN m.home_team_id = t.id AND m.home_score > m.away_score THEN 1
             WHEN m.away_team_id = t.id AND m.away_score > m.home_score THEN 1
             ELSE 0 END) AS wins
     FROM matches m
     JOIN teams t ON (m.home_team_id = t.id OR m.away_team_id = t.id)
     WHERE m.is_future = 0 AND m.date >= '2020-01-01' AND t.name = ?`
  );

  const recentStmt = db.prepare(
    `SELECT m.date, ht.name AS home, at.name AS away, m.home_score, m.away_score
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.is_future = 0 AND (ht.name = ? OR at.name = ?)
     ORDER BY m.date DESC
     LIMIT 10`
  );

  const result: Record<string, TeamStats> = {};

  for (const team of teamsNames) {
    const row = statsStmt.get(team) as {
      avg_scored: number | null;
      avg_conceded: number | null;
      games: number;
      wins: number;
    } | undefined;

    const games = row?.games ?? 0;
    const recentRows = recentStmt.all(team, team) as {
      date: string; home: string; away: string; home_score: number; away_score: number;
    }[];

    const recent_matches: RecentMatch[] = recentRows.map((m) => {
      const isHome = m.home === team;
      const scored = isHome ? m.home_score : m.away_score;
      const conceded = isHome ? m.away_score : m.home_score;
      const result: "W" | "D" | "L" =
        scored > conceded ? "W" : scored === conceded ? "D" : "L";
      return {
        date: m.date,
        opponent: isHome ? m.away : m.home,
        score: `${scored}:${conceded}`,
        result,
      };
    });

    result[team] = {
      avg_scored: row?.avg_scored ?? 1.3,
      avg_conceded: row?.avg_conceded ?? 1.1,
      games,
      win_rate: games > 0 ? Math.round(((row?.wins ?? 0) / games) * 1000) / 1000 : 0.4,
      recent_matches,
    };
  }

  return result;
}
