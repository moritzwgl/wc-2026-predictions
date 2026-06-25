import type { ProcessedGame } from "@/components/Dashboard";
import wcTeams from "@/data/worldcup.teams.json";

export interface TeamStanding {
  team: string;
  flag: string;
  group: string;
  rank: number | null;
  played: number;
  /** Expected points (weighted by win/draw/loss probabilities) */
  pts: number;
  /** Expected wins */
  w: number;
  /** Expected draws */
  d: number;
  /** Expected losses */
  l: number;
  /** Expected goals for */
  gf: number;
  /** Expected goals against */
  ga: number;
  /** Expected goal difference */
  gd: number;
  /** Actual games played */
  playedActual: number;
  /**
   * Advancement status:
   * "1st"   = 1st place → Round of 32 (certain)
   * "2nd"   = 2nd place → Round of 32 (certain)
   * "3rd-in" = 3rd place AND among best 8 third-placed → Round of 32
   * "3rd-out"= 3rd place but NOT advancing
   * "4th"   = 4th place → eliminated
   */
  advanceStatus: "1st" | "2nd" | "3rd-in" | "3rd-out" | "4th";
  /** Probability of advancing to Round of 32 (top-2 or best-8 third) */
  pAdvance: number;
  /** Whether the team's group has finished all its matches */
  isGroupFinished?: boolean;
}

export interface ThirdPlaceStanding extends TeamStanding {
  thirdRank: number; // 1–12 among all third-place teams
  advances: boolean; // true if in best 8
}

export interface GroupStandingsResult {
  byGroup: Record<string, TeamStanding[]>;
  thirdPlaces: ThirdPlaceStanding[];
}

// Build team → group & flag mapping from the JSON
const teamGroupMap: Record<string, { group: string; flag: string; name: string }> = {};
for (const t of wcTeams as Array<{ name: string; name_normalised?: string; group: string; flag_icon: string }>) {
  teamGroupMap[t.name] = { group: t.group, flag: t.flag_icon, name: t.name };
  if (t.name_normalised) {
    teamGroupMap[t.name_normalised] = { group: t.group, flag: t.flag_icon, name: t.name };
  }
}

// Explicit alias map: DB fixture name → worldcup.teams.json name
const TEAM_ALIASES: Record<string, string> = {
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "United States": "USA",
  "Türkiye": "Turkey",
  "Cote d'Ivoire": "Ivory Coast",
  "Cabo Verde": "Cape Verde",
  "Congo DR": "DR Congo",
  "Korea Republic": "South Korea",
  "IR Iran": "Iran",
  "Czechia": "Czech Republic",
};

export function computeGroupStandings(
  games: ProcessedGame[],
  flags: Record<string, { rank: number | null; flag_icon: string }>
): GroupStandingsResult {
  // Initialize standings for all WC teams
  const standings: Record<string, TeamStanding> = {};

  for (const t of wcTeams as Array<{ name: string; name_normalised?: string; group: string; flag_icon: string }>) {
    const key = t.name;
    standings[key] = {
      team: t.name,
      flag: t.flag_icon,
      group: t.group,
      rank: flags[t.name]?.rank ?? flags[t.name_normalised ?? ""]?.rank ?? null,
      played: 0,
      playedActual: 0,
      pts: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      advanceStatus: "4th",
      pAdvance: 0,
    };
  }

  // Resolve DB team names to worldcup.teams.json keys
  function resolveTeam(name: string): string | null {
    if (standings[name]) return name;
    const aliased = TEAM_ALIASES[name];
    if (aliased && standings[aliased]) return aliased;
    for (const t of wcTeams as Array<{ name: string; name_normalised?: string }>) {
      if (t.name_normalised === name) return t.name;
    }
    return null;
  }

  // Accumulate expected stats for each group game
  const groupGames = games.filter((g) => {
    const hk = resolveTeam(g.home);
    const ak = resolveTeam(g.away);
    if (!hk || !ak) return false;
    return standings[hk]?.group === standings[ak]?.group;
  });

  for (const g of groupGames) {
    const hk = resolveTeam(g.home)!;
    const ak = resolveTeam(g.away)!;

    const isPlayed = !g.is_future && g.actual_home_score != null && g.actual_away_score != null;

    let hWin: number, draw: number, aWin: number, hGoals: number, aGoals: number;

    if (isPlayed) {
      const hs = g.actual_home_score!;
      const as_ = g.actual_away_score!;
      hWin = hs > as_ ? 1 : 0;
      draw = hs === as_ ? 1 : 0;
      aWin = hs < as_ ? 1 : 0;
      hGoals = hs;
      aGoals = as_;
    } else {
      const p = g.pred;
      hWin = p.homeWin;
      draw = p.draw;
      aWin = p.awayWin;
      hGoals = p.lambdaH;
      aGoals = p.lambdaA;
    }

    standings[hk].pts += hWin * 3 + draw;
    standings[ak].pts += aWin * 3 + draw;

    standings[hk].w += hWin;
    standings[hk].d += draw;
    standings[hk].l += aWin;
    standings[ak].w += aWin;
    standings[ak].d += draw;
    standings[ak].l += hWin;

    standings[hk].gf += hGoals;
    standings[hk].ga += aGoals;
    standings[ak].gf += aGoals;
    standings[ak].ga += hGoals;

    standings[hk].played += 1;
    standings[ak].played += 1;
    if (isPlayed) {
      standings[hk].playedActual += 1;
      standings[ak].playedActual += 1;
    }
  }

  for (const s of Object.values(standings)) {
    s.gd = s.gf - s.ga;
  }

  // Sort criteria: pts → gd → gf → FIFA rank (lower = better)
  function sortStandings(a: TeamStanding, b: TeamStanding): number {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    // FIFA rank: lower number = better team
    const ra = a.rank ?? 999;
    const rb = b.rank ?? 999;
    return ra - rb;
  }

  // Build per-group sorted arrays
  const byGroup: Record<string, TeamStanding[]> = {};
  for (const s of Object.values(standings)) {
    if (!byGroup[s.group]) byGroup[s.group] = [];
    byGroup[s.group].push(s);
  }

  // Collect all 3rd-place teams
  const thirdPlaceTeams: TeamStanding[] = [];

  for (const group of Object.keys(byGroup)) {
    byGroup[group].sort(sortStandings);
    const teams = byGroup[group];

    // Assign group position labels
    for (let i = 0; i < teams.length; i++) {
      if (i === 0) teams[i].advanceStatus = "1st";
      else if (i === 1) teams[i].advanceStatus = "2nd";
      else if (i === 2) {
        teams[i].advanceStatus = "3rd-out"; // will be updated below
        thirdPlaceTeams.push(teams[i]);
      } else {
        teams[i].advanceStatus = "4th";
      }
    }
  }

  // Sort all 12 third-place teams: same criteria as group stage
  thirdPlaceTeams.sort(sortStandings);

  // Best 8 of 12 third-place teams advance (WM 2026 rule)
  const THIRD_PLACE_ADVANCING = 8;
  const thirdPlaces: ThirdPlaceStanding[] = thirdPlaceTeams.map((t, i) => {
    const advances = i < THIRD_PLACE_ADVANCING;
    if (advances) {
      // Update the team's status in byGroup too
      t.advanceStatus = "3rd-in";
    }
    return {
      ...t,
      thirdRank: i + 1,
      advances,
    };
  });

  // Compute advancement probabilities using softmax within each group
  for (const group of Object.keys(byGroup)) {
    const teams = byGroup[group];
    const isGroupFinished = teams.every((t) => t.playedActual === 3);

    const temp = 2.0;
    const expVals = teams.map((t) => Math.exp(t.pts / temp));
    const expSum = expVals.reduce((s, e) => s + e, 0);
    const softmax = expVals.map((e) => e / expSum);

    for (let i = 0; i < teams.length; i++) {
      teams[i].isGroupFinished = isGroupFinished;
      if (isGroupFinished) {
        // If finished, probability is 100% if advancing, 0% if out.
        // Wait, 3rd place advancement depends on other groups.
        // We handle that below for 3rd place, but for 1st/2nd it's 1.
        teams[i].pAdvance = (teams[i].advanceStatus === "1st" || teams[i].advanceStatus === "2nd" || teams[i].advanceStatus === "3rd-in") ? 1 : 0;
      } else {
        if (i === 0) {
          // 1st place: high probability, softmax-weighted
          teams[i].pAdvance = Math.min(0.97, softmax[i] * teams.length * 0.6 + 0.4);
        } else if (i === 1) {
          // 2nd place: moderate-high probability
          teams[i].pAdvance = Math.min(0.92, softmax[i] * teams.length * 0.5 + 0.3);
        } else if (i === 2) {
          // 3rd place: chance depends on being in best 8 of 12
          // Expected ~67% of 3rd-place teams advance (8/12)
          teams[i].pAdvance = Math.min(0.65, softmax[i] * teams.length * 0.3 + 0.1);
        } else {
          // 4th place: very low chance
          teams[i].pAdvance = Math.min(0.12, softmax[i] * teams.length * 0.1);
        }
      }
    }
  }

  // Set 100% or 0% probability for 3rd place teams if the *entire* group stage is finished?
  // Or just use the already computed advances flag for 3rd place teams if their group is finished?
  // If their group is finished, we already set pAdvance above. But wait, if their group is finished but others aren't, they might be "3rd-in" now but pushed to "3rd-out" later.
  // Actually, we can check if ALL groups are finished for 3rd place teams.
  // Let's check if all matches are played to be safe for 3rd place certainty.
  const isTournamentFinished = Object.values(byGroup).every(groupTeams => groupTeams.every(t => t.playedActual === 3));

  for (const t of thirdPlaces) {
    if (isTournamentFinished) {
      t.pAdvance = t.advances ? 1 : 0;
    } else {
      // If tournament not finished but group is finished, pAdvance could be a heuristic.
      // But we leave it as 1 or 0 based on current standing if group is finished, as set above.
      // Wait, if group is finished, the team might be "3rd-in" right now but could fall out later.
      // A better UX is to show the current hypothetical status if tournament ended today, but keep probability.
      // Wait, the user asked to show final values if the GROUP has played all matches.
      // If the group has played all matches, its values are final.
    }
  }

  return { byGroup, thirdPlaces };
}
