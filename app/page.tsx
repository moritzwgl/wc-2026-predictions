import { getFixtures, getTeamStats, getTeamFlags } from "@/lib/queries";
import { predictMatch, getBets } from "@/lib/predictions";
import { computeGroupStandings } from "@/lib/groupStandings";
import { computePlayoffBracket } from "@/lib/playoff";
import Dashboard, { type ProcessedGame } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default function Page() {
  const fixtures = getFixtures();
  const flags = getTeamFlags();

  const teamSet = new Set<string>();
  fixtures.forEach((f) => { teamSet.add(f.home); teamSet.add(f.away); });
  const teams = Array.from(teamSet);
  const teamStats = getTeamStats(teams);

  const games: ProcessedGame[] = fixtures.map((f, i) => {
    const pred = predictMatch(f.home, f.away, teamStats, flags);
    const bets = getBets(f, pred);
    return {
      id: i,
      date: f.date,
      home: f.home,
      away: f.away,
      city: f.city,
      country: f.country,
      homeFlag: flags[f.home]?.flag_icon ?? "🏴",
      awayFlag: flags[f.away]?.flag_icon ?? "🏴",
      homeRank: flags[f.home]?.rank ?? null,
      awayRank: flags[f.away]?.rank ?? null,
      homeStats: teamStats[f.home],
      awayStats: teamStats[f.away],
      h2h: f.h2h,
      pred,
      bets,
      is_future: f.is_future === 1,
      actual_home_score: f.home_score,
      actual_away_score: f.away_score,
      kickoff_utc: f.kickoff_utc ?? null,
    };
  });

  const { byGroup, thirdPlaces } = computeGroupStandings(games, flags);

  // Build FIFA points lookup for playoff simulation
  const fifaPoints: Record<string, number> = {};
  for (const [name, info] of Object.entries(flags)) {
    if (info.points != null) fifaPoints[name] = info.points;
  }

  const playoffBracket = computePlayoffBracket(byGroup, thirdPlaces, fifaPoints);

  return <Dashboard games={games} groupStandings={byGroup} thirdPlaces={thirdPlaces} playoffBracket={playoffBracket} />;
}


