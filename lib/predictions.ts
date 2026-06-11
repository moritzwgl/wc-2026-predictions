import type { TeamStats, TeamInfo } from "./queries";

const GLOBAL_AVG = 1.42;
const HOME_ADVANTAGE = 1.12;
const MAX_GOALS = 7;

export interface ScoreProb {
  h: number;
  a: number;
  p: number;
}

export interface Prediction {
  lambdaH: number;
  lambdaA: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  topScores: ScoreProb[];
  totalGoals: number;
  btts: number;
  over15: number;
  over25: number;
  over35: number;
}

export interface Bet {
  name: string;
  val: string;
  prob?: number;
  conf: "high" | "medium" | "low";
  icon: string;
  isTopPick: boolean;
}

function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda) * Math.pow(lambda, k);
  for (let i = 1; i <= k; i++) p /= i;
  return p;
}

/**
 * Calculates a weighted form score for a team based on their last N matches.
 * Newer matches receive exponentially higher weight.
 * Returns a value between -1 (terrible form) and +1 (perfect form).
 */
function calcFormFactor(recentMatches: { result: "W" | "D" | "L" }[]): number {
  if (recentMatches.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  // Most recent match has highest weight (index 0 = most recent)
  for (let i = 0; i < recentMatches.length; i++) {
    const weight = Math.pow(0.75, i); // exponential decay: newest = 1.0, next = 0.75, etc.
    const score =
      recentMatches[i].result === "W" ? 1 :
        recentMatches[i].result === "D" ? 0 : -1;
    weightedSum += score * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export function predictMatch(
  home: string,
  away: string,
  teamStats: Record<string, TeamStats>,
  flags: Record<string, TeamInfo>
): Prediction {
  const DEFAULT_STATS: TeamStats = {
    avg_scored: 1.3, avg_conceded: 1.1, win_rate: 0.4, games: 0, recent_matches: [],
  };
  const h = teamStats[home] ?? DEFAULT_STATS;
  const a = teamStats[away] ?? DEFAULT_STATS;

  let lambdaH = (h.avg_scored / GLOBAL_AVG) * (a.avg_conceded / GLOBAL_AVG) * GLOBAL_AVG * HOME_ADVANTAGE;
  let lambdaA = (a.avg_scored / GLOBAL_AVG) * (h.avg_conceded / GLOBAL_AVG) * GLOBAL_AVG;

  // --- FIFA Ranking factor (stronger weight: ±40%, scaled by 1000 pts gap) ---
  const homePoints = flags[home]?.points ?? 1400;
  const awayPoints = flags[away]?.points ?? 1400;
  const rankFactor = Math.min(0.4, Math.max(-0.4, (homePoints - awayPoints) / 1000));

  lambdaH = lambdaH * (1 + rankFactor);
  lambdaA = lambdaA * (1 - rankFactor);

  // --- Recent form factor (last 10 games, exponentially weighted, ±15% effect) ---
  const homeForm = calcFormFactor(h.recent_matches);
  const awayForm = calcFormFactor(a.recent_matches);
  const FORM_STRENGTH = 0.15;
  lambdaH = lambdaH * (1 + homeForm * FORM_STRENGTH);
  lambdaA = lambdaA * (1 + awayForm * FORM_STRENGTH);

  lambdaH = Math.max(0.3, Math.min(lambdaH, 6));
  lambdaA = Math.max(0.3, Math.min(lambdaA, 6));

  let homeWin = 0, draw = 0, awayWin = 0;
  const scores: ScoreProb[] = [];

  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = poissonPMF(i, lambdaH) * poissonPMF(j, lambdaA);
      scores.push({ h: i, a: j, p });
      if (i > j) homeWin += p;
      else if (i === j) draw += p;
      else awayWin += p;
    }
  }
  scores.sort((x, y) => y.p - x.p);

  const totalG = lambdaH + lambdaA;
  const btts = (1 - poissonPMF(0, lambdaH)) * (1 - poissonPMF(0, lambdaA));

  return {
    lambdaH: +lambdaH.toFixed(2),
    lambdaA: +lambdaA.toFixed(2),
    homeWin: +homeWin.toFixed(3),
    draw: +draw.toFixed(3),
    awayWin: +awayWin.toFixed(3),
    topScores: scores.slice(0, 5),
    totalGoals: +totalG.toFixed(2),
    btts: +btts.toFixed(3),
    over15: +(1 - poissonPMF(0, totalG) - poissonPMF(1, totalG)).toFixed(3),
    over25: +(1 - [0, 1, 2].reduce((s, k) => s + poissonPMF(k, totalG), 0)).toFixed(3),
    over35: +(1 - [0, 1, 2, 3].reduce((s, k) => s + poissonPMF(k, totalG), 0)).toFixed(3),
  };
}

// Minimum odds to display a bet (odds = 1/prob, so odds > 1.2 means prob < 1/1.2)
const MIN_ODDS = 1.2;
const MAX_PROB_FOR_ODDS = 1 / MIN_ODDS; // ≈ 0.833

function toOdds(prob: number): string {
  if (prob <= 0) return "—";
  return (1 / prob).toFixed(2);
}

export function getBets(
  game: { home: string; away: string },
  pred: Prediction
): Bet[] {
  const bets: Bet[] = [];
  const fav = pred.homeWin > pred.awayWin ? game.home : game.away;
  const favP = Math.max(pred.homeWin, pred.awayWin);
  const top = pred.topScores[0];

  if (favP >= 0.5 && favP < MAX_PROB_FOR_ODDS)
    bets.push({
      name: `Sieg ${fav}`,
      val: toOdds(favP),
      prob: favP,
      conf: favP >= 0.7 ? "high" : "medium",
      icon: "🏆",
      isTopPick: favP >= 0.65,
    });

  if (pred.over15 >= 0.58 && pred.over15 < MAX_PROB_FOR_ODDS)
    bets.push({
      name: "Über 1.5 Tore",
      val: toOdds(pred.over15),
      prob: pred.over15,
      conf: pred.over15 >= 0.80 ? "high" : "medium",
      icon: "⚽",
      isTopPick: pred.over15 >= 0.85,
    });

  if (pred.over25 >= 0.45 && pred.over25 < MAX_PROB_FOR_ODDS)
    bets.push({
      name: "Über 2.5 Tore",
      val: toOdds(pred.over25),
      prob: pred.over25,
      conf: pred.over25 >= 0.7 ? "high" : "medium",
      icon: "⚽",
      isTopPick: pred.over25 >= 0.65,
    });

  if (pred.btts >= 0.45 && pred.btts < MAX_PROB_FOR_ODDS)
    bets.push({
      name: "Beide Teams treffen",
      val: toOdds(pred.btts),
      prob: pred.btts,
      conf: pred.btts >= 0.68 ? "high" : "medium",
      icon: "🎯",
      isTopPick: pred.btts >= 0.6,
    });

  if (pred.over35 >= 0.35 && pred.over35 < MAX_PROB_FOR_ODDS)
    bets.push({
      name: "Über 3.5 Tore",
      val: toOdds(pred.over35),
      prob: pred.over35,
      conf: "medium",
      icon: "🔥",
      isTopPick: false,
    });

  if (pred.draw >= 0.25 && pred.draw < MAX_PROB_FOR_ODDS)
    bets.push({
      name: "Unentschieden",
      val: toOdds(pred.draw),
      prob: pred.draw,
      conf: "medium",
      icon: "🤝",
      isTopPick: false,
    });

  // Score tip: always shown, no odds filter (not prob-based)
  bets.push({
    name: "Ergebnis-Tipp",
    val: `${top.h}:${top.a}`,
    conf: top.p >= 0.12 ? "high" : top.p >= 0.08 ? "medium" : "low",
    icon: "📊",
    isTopPick: false,
  });

  return bets;
}

