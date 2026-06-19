/**
 * Fetches completed FIFA World Cup 2026 results from the ESPN public API
 * and writes scores into data/football.db, then re-exports the JSON snapshots.
 *
 * Usage:
 *   npm run update-results
 *
 * No API key required – uses ESPN's public (unofficial) scoreboard endpoint.
 */

import Database from "better-sqlite3";
import path from "path";
import { execSync } from "child_process";

const DB_PATH = path.join(process.cwd(), "data", "football.db");

// WC 2026 date range (group stage → final)
const WC_FROM = "20260611";
const WC_TO   = "20260722";

const ESPN_URL =
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard` +
  `?dates=${WC_FROM}-${WC_TO}&limit=200`;

// ESPN displayName → name used in our DB (only entries that actually differ)
const ESPN_TO_DB: Record<string, string> = {
  "Korea Republic":        "South Korea",
  "Czechia":               "Czech Republic",
  "USA":                   "United States",
  "Bosnia & Herzegovina":  "Bosnia and Herzegovina",
  "Bosnia-Herzegovina":    "Bosnia and Herzegovina",
  "Cote d'Ivoire":         "Ivory Coast",
  "Côte d'Ivoire":         "Ivory Coast",
  "Cabo Verde":            "Cape Verde",
  "Türkiye":               "Turkey",
  "IR Iran":               "Iran",
  "Congo DR":              "DR Congo",
  "Republic of Ireland":   "Ireland",
  "North Macedonia":       "North Macedonia",
};

function toDbName(espnName: string): string {
  return ESPN_TO_DB[espnName] ?? espnName;
}

interface ParsedMatch {
  date: string;      // YYYY-MM-DD
  espnHomeTeam: string;
  espnAwayTeam: string;
  homeScore: number;
  awayScore: number;
}

function parseEvents(events: any[]): ParsedMatch[] {
  const result: ParsedMatch[] = [];

  for (const ev of events) {
    const comp = ev.competitions?.[0];
    if (!comp?.status?.type?.completed) continue;

    const competitors: any[] = comp.competitors ?? [];
    const homeComp = competitors.find((c: any) => c.homeAway === "home");
    const awayComp = competitors.find((c: any) => c.homeAway === "away");
    if (!homeComp || !awayComp) continue;

    const homeScore = parseInt(homeComp.score, 10);
    const awayScore = parseInt(awayComp.score, 10);
    if (isNaN(homeScore) || isNaN(awayScore)) continue;

    // ev.date is ISO-8601, e.g. "2026-06-11T19:00Z" – keep only YYYY-MM-DD
    const date = (ev.date as string).substring(0, 10);

    result.push({
      date,
      espnHomeTeam: toDbName(homeComp.team.displayName),
      espnAwayTeam: toDbName(awayComp.team.displayName),
      homeScore,
      awayScore,
    });
  }

  return result;
}

async function main() {
  console.log(`Fetching WC 2026 results from ESPN…`);

  const res = await fetch(ESPN_URL);
  if (!res.ok) throw new Error(`ESPN API returned HTTP ${res.status}`);

  const data = await res.json();
  const events: any[] = data.events ?? [];
  const matches = parseEvents(events);

  console.log(`  ${events.length} events found, ${matches.length} completed\n`);

  const db = new Database(DB_PATH);

  // Find a WC 2026 DB record by date + the two teams (in either order).
  // The DB stores local match dates; ESPN uses UTC dates. For early-morning
  // UTC kickoffs (00:xx – 06:xx) the ESPN date is one day ahead of the DB
  // date, so we try both the given date AND the previous calendar day.
  const findStmt = db.prepare<[string, string, string, string, string]>(`
    SELECT
      m.id,
      ht.name AS home,
      at.name AS away,
      m.is_future,
      m.home_score,
      m.away_score
    FROM   matches m
    JOIN   teams       ht ON m.home_team_id  = ht.id
    JOIN   teams       at ON m.away_team_id  = at.id
    JOIN   tournaments t  ON m.tournament_id = t.id
    WHERE  t.name = 'FIFA World Cup 2026'
      AND  m.date = ?
      AND  (
             (ht.name = ? AND at.name = ?)
          OR (ht.name = ? AND at.name = ?)
           )
  `);

  function prevDay(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().substring(0, 10);
  }

  function findRow(m: ParsedMatch) {
    const args: [string, string, string, string, string] = [
      m.date, m.espnHomeTeam, m.espnAwayTeam, m.espnAwayTeam, m.espnHomeTeam,
    ];
    return (
      findStmt.get(...args) ??
      findStmt.get(prevDay(m.date), m.espnHomeTeam, m.espnAwayTeam, m.espnAwayTeam, m.espnHomeTeam)
    ) as { id: number; home: string; away: string; is_future: number; home_score: number | null; away_score: number | null } | undefined;
  }

  const updateStmt = db.prepare<[number, number, number]>(`
    UPDATE matches
    SET    home_score = ?,
           away_score = ?,
           is_future  = 0
    WHERE  id = ?
  `);

  let updated  = 0;
  let upToDate = 0;
  let missing  = 0;

  for (const m of matches) {
    const row = findRow(m);

    if (!row) {
      console.warn(`  ✗ NOT FOUND  ${m.date}  ${m.espnHomeTeam} – ${m.espnAwayTeam}`);
      missing++;
      continue;
    }

    // Determine which score goes with which DB team
    const espnHomeIsDbHome = row.home === m.espnHomeTeam;
    const dbHomeScore = espnHomeIsDbHome ? m.homeScore : m.awayScore;
    const dbAwayScore = espnHomeIsDbHome ? m.awayScore : m.homeScore;

    if (
      row.is_future === 0 &&
      row.home_score === dbHomeScore &&
      row.away_score === dbAwayScore
    ) {
      upToDate++;
      continue;
    }

    updateStmt.run(dbHomeScore, dbAwayScore, row.id);
    console.log(`  ✓ ${m.date}  ${row.home} ${dbHomeScore}–${dbAwayScore} ${row.away}`);
    updated++;
  }

  console.log(
    `\nResult: ${updated} updated · ${upToDate} already up-to-date · ${missing} not matched in DB`,
  );

  if (updated > 0) {
    console.log("\nRe-exporting JSON snapshots…");
    execSync("npm run export-data", { stdio: "inherit" });
    console.log("Done.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});