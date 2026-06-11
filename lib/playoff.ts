import type { TeamStanding, ThirdPlaceStanding } from "./groupStandings";

// --- Types ---

export interface PlayoffTeam {
  team: string;
  flag: string;
  rank: number | null;
  points: number; // FIFA points used for matchup simulation
  pts: number; // expected group stage points (strength indicator)
  gd: number; // expected group stage goal difference
  seed: string; // e.g. "1A", "2B", "3C"
  group: string;
}

export interface PlayoffMatchup {
  id: number;
  round: string;
  teamA: PlayoffTeam | null;
  teamB: PlayoffTeam | null;
  /** Expected probability that teamA wins this matchup (0.5 if unknown) */
  probA: number;
  probB: number;
  /** The predicted winner */
  winner: PlayoffTeam | null;
  /** Winner probability */
  winnerProb: number;
}

export interface PlayoffBracket {
  roundOf32: PlayoffMatchup[];
  roundOf16: PlayoffMatchup[];
  quarterFinals: PlayoffMatchup[];
  semiFinals: PlayoffMatchup[];
  final: PlayoffMatchup;
  champion: PlayoffTeam | null;
}

// --- Round of 32 fixed bracket (from Wikipedia / FIFA official) ---
// Format: [slot, teamA_seed, teamB_seed]
// Seed format: "1A" = Winner Group A, "2B" = Runner-up Group B, "3C" = Best 3rd from Group C pool
// For 3rd place seeds, we assign the most likely best 8 third-place teams
const R32_BRACKET: Array<{ id: number; a: string; b: string; label: string }> = [
  { id: 1,  a: "2A", b: "2B", label: "2. Gruppe A vs 2. Gruppe B" },
  { id: 2,  a: "1C", b: "2F", label: "1. Gruppe C vs 2. Gruppe F" },
  { id: 3,  a: "1E", b: "3X", label: "1. Gruppe E vs bester 3." },
  { id: 4,  a: "1F", b: "2C", label: "1. Gruppe F vs 2. Gruppe C" },
  { id: 5,  a: "2E", b: "2I", label: "2. Gruppe E vs 2. Gruppe I" },
  { id: 6,  a: "1I", b: "3X", label: "1. Gruppe I vs bester 3." },
  { id: 7,  a: "1A", b: "3X", label: "1. Gruppe A vs bester 3." },
  { id: 8,  a: "1L", b: "3X", label: "1. Gruppe L vs bester 3." },
  { id: 9,  a: "1G", b: "3X", label: "1. Gruppe G vs bester 3." },
  { id: 10, a: "1D", b: "3X", label: "1. Gruppe D vs bester 3." },
  { id: 11, a: "1H", b: "2J", label: "1. Gruppe H vs 2. Gruppe J" },
  { id: 12, a: "2K", b: "2L", label: "2. Gruppe K vs 2. Gruppe L" },
  { id: 13, a: "1B", b: "3X", label: "1. Gruppe B vs bester 3." },
  { id: 14, a: "2D", b: "2G", label: "2. Gruppe D vs 2. Gruppe G" },
  { id: 15, a: "1J", b: "2H", label: "1. Gruppe J vs 2. Gruppe H" },
  { id: 16, a: "1K", b: "3X", label: "1. Gruppe K vs bester 3." },
];

// Round of 16: pairs of R32 match IDs that play each other
// Winners of match 1 vs 3, 2 vs 4, 5 vs 7, 6 vs 8, etc. (Wikipedia bracket structure)
const R16_PAIRS = [
  [1, 3],   // M73 vs M75
  [2, 4],   // M74 vs M77 (note: 77 = match 4 in our numbering)
  [5, 7],   // M76 vs M78
  [6, 8],   // M79 vs M80
  [13, 9],  // M83 vs M84
  [14, 10], // M81 vs M82
  [11, 15], // M86 vs M88
  [12, 16], // M85 vs M87
];

const QF_PAIRS = [
  [0, 1], [2, 3], [4, 5], [6, 7]
]; // indices into R16 results

const SF_PAIRS = [
  [0, 1], [2, 3] // indices into QF results
];

// --- Simulation ---

function poissonPMF(k: number, lam: number): number {
  if (lam <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lam) * Math.pow(lam, k);
  for (let i = 1; i <= k; i++) p /= i;
  return p;
}

/**
 * Compute win probability for team A vs team B using FIFA points-based Elo-like formula.
 * Returns probability that A wins (in a knockout match, no draws).
 */
function computeWinProb(a: PlayoffTeam, b: PlayoffTeam): number {
  const ptsA = a.points ?? 1400;
  const ptsB = b.points ?? 1400;

  // Base Elo-style probability
  const diff = (ptsA - ptsB) / 600;
  const eloProb = 1 / (1 + Math.pow(10, -diff));

  // Also factor in group stage performance (pts and GD)
  const perfA = a.pts + a.gd * 0.3;
  const perfB = b.pts + b.gd * 0.3;
  const totalPerf = Math.abs(perfA - perfB) + 0.01;
  const perfProb = (perfA + 1) / (perfA + perfB + 2);

  // Weighted blend: 70% FIFA ranking, 30% group performance
  const blended = eloProb * 0.7 + perfProb * 0.3;

  // Squish slightly toward 50% – knockout games are unpredictable
  return 0.5 + (blended - 0.5) * 0.85;
}

function simulateMatchup(
  id: number,
  round: string,
  teamA: PlayoffTeam | null,
  teamB: PlayoffTeam | null
): PlayoffMatchup {
  if (!teamA || !teamB) {
    return { id, round, teamA, teamB, probA: 0.5, probB: 0.5, winner: teamA ?? teamB, winnerProb: 1 };
  }
  const probA = computeWinProb(teamA, teamB);
  const probB = 1 - probA;
  const winner = probA >= probB ? teamA : teamB;
  return {
    id,
    round,
    teamA,
    teamB,
    probA: +probA.toFixed(3),
    probB: +probB.toFixed(3),
    winner,
    winnerProb: +(Math.max(probA, probB)).toFixed(3),
  };
}

/**
 * Build playoff team from a standing entry plus FIFA points lookup.
 */
function toPlayoffTeam(
  standing: TeamStanding,
  seed: string,
  fifaPoints: Record<string, number>
): PlayoffTeam {
  const pts = fifaPoints[standing.team] ?? fifaPoints[standing.team.toLowerCase()] ?? 1400;
  return {
    team: standing.team,
    flag: standing.flag,
    rank: standing.rank,
    points: pts,
    pts: standing.pts,
    gd: standing.gd,
    seed,
    group: standing.group,
  };
}

/**
 * Main entry point: compute the full playoff bracket from group standings.
 */
export function computePlayoffBracket(
  byGroup: Record<string, TeamStanding[]>,
  thirdPlaces: ThirdPlaceStanding[],
  fifaPoints: Record<string, number>
): PlayoffBracket {
  // Build lookup: seed → PlayoffTeam
  // Seeds: "1A"=winner group A, "2A"=runner-up group A, "3X"=next best 3rd
  const seedMap: Record<string, PlayoffTeam> = {};

  for (const [group, teams] of Object.entries(byGroup)) {
    if (teams[0]) seedMap[`1${group}`] = toPlayoffTeam(teams[0], `1${group}`, fifaPoints);
    if (teams[1]) seedMap[`2${group}`] = toPlayoffTeam(teams[1], `2${group}`, fifaPoints);
  }

  // Assign 3rd place slots: use the best 8 third-placed teams (already ranked)
  const advancing3rd = thirdPlaces.filter((t) => t.advances);

  // Round of 32 – assign 3rd place teams to "3X" slots in order
  let third3rdIdx = 0;
  const r32Matchups: PlayoffMatchup[] = R32_BRACKET.map(({ id, a, b, label }) => {
    const teamA = seedMap[a] ?? null;
    let teamB: PlayoffTeam | null = null;

    if (b === "3X") {
      const t3 = advancing3rd[third3rdIdx++];
      if (t3) {
        teamB = toPlayoffTeam(t3, `3${t3.group}`, fifaPoints);
      }
    } else {
      teamB = seedMap[b] ?? null;
    }

    return simulateMatchup(id, "Round of 32", teamA, teamB);
  });

  // Round of 16
  const r16Matchups: PlayoffMatchup[] = R16_PAIRS.map(([ai, bi], i) => {
    const winA = r32Matchups[ai - 1]?.winner ?? null;
    const winB = r32Matchups[bi - 1]?.winner ?? null;
    return simulateMatchup(i + 17, "Round of 16", winA, winB);
  });

  // Quarter-finals
  const qfMatchups: PlayoffMatchup[] = QF_PAIRS.map(([ai, bi], i) => {
    const winA = r16Matchups[ai]?.winner ?? null;
    const winB = r16Matchups[bi]?.winner ?? null;
    return simulateMatchup(i + 25, "Viertelfinale", winA, winB);
  });

  // Semi-finals
  const sfMatchups: PlayoffMatchup[] = SF_PAIRS.map(([ai, bi], i) => {
    const winA = qfMatchups[ai]?.winner ?? null;
    const winB = qfMatchups[bi]?.winner ?? null;
    return simulateMatchup(i + 29, "Halbfinale", winA, winB);
  });

  // Final
  const finalMatchup = simulateMatchup(
    31,
    "Finale",
    sfMatchups[0]?.winner ?? null,
    sfMatchups[1]?.winner ?? null
  );

  return {
    roundOf32: r32Matchups,
    roundOf16: r16Matchups,
    quarterFinals: qfMatchups,
    semiFinals: sfMatchups,
    final: finalMatchup,
    champion: finalMatchup.winner,
  };
}
