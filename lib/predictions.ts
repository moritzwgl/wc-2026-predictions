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

  const homePoints = flags[home]?.points ?? 1400;
  const awayPoints = flags[away]?.points ?? 1400;
  const rankFactor = Math.min(0.2, Math.max(-0.2, (homePoints - awayPoints) / 2000));

  lambdaH = Math.max(0.3, Math.min(lambdaH * (1 + rankFactor), 6));
  lambdaA = Math.max(0.3, Math.min(lambdaA * (1 - rankFactor), 6));

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

export function getBets(
  game: { home: string; away: string },
  pred: Prediction
): Bet[] {
  const bets: Bet[] = [];
  const fav = pred.homeWin > pred.awayWin ? game.home : game.away;
  const favP = Math.max(pred.homeWin, pred.awayWin);
  const top = pred.topScores[0];

  if (favP >= 0.6)
    bets.push({
      name: `Sieg ${fav}`,
      val: `${Math.round(favP * 100)}%`,
      prob: favP,
      conf: favP >= 0.7 ? "high" : "medium",
      icon: "🏆",
      isTopPick: favP >= 0.65,
    });

  if (pred.over15 >= 0.80)
    bets.push({
      name: "Über 1.5 Tore",
      val: `${Math.round(pred.over15 * 100)}%`,
      prob: pred.over15,
      conf: pred.over15 >= 0.90 ? "high" : "medium",
      icon: "⚽",
      isTopPick: pred.over15 >= 0.85,
    });

  if (pred.over25 >= 0.58)
    bets.push({
      name: "Über 2.5 Tore",
      val: `${Math.round(pred.over25 * 100)}%`,
      prob: pred.over25,
      conf: pred.over25 >= 0.7 ? "high" : "medium",
      icon: "⚽",
      isTopPick: pred.over25 >= 0.65,
    });

  if (pred.btts >= 0.55)
    bets.push({
      name: "Beide Teams treffen",
      val: `${Math.round(pred.btts * 100)}%`,
      prob: pred.btts,
      conf: pred.btts >= 0.68 ? "high" : "medium",
      icon: "🎯",
      isTopPick: pred.btts >= 0.6,
    });

  if (pred.over35 >= 0.45)
    bets.push({
      name: "Über 3.5 Tore",
      val: `${Math.round(pred.over35 * 100)}%`,
      prob: pred.over35,
      conf: "medium",
      icon: "🔥",
      isTopPick: false,
    });

  if (pred.draw >= 0.28)
    bets.push({
      name: "Unentschieden",
      val: `${Math.round(pred.draw * 100)}%`,
      prob: pred.draw,
      conf: "medium",
      icon: "🤝",
      isTopPick: false,
    });

  bets.push({
    name: "Ergebnis-Tipp",
    val: `${top.h}:${top.a}`,
    conf: top.p >= 0.12 ? "high" : top.p >= 0.08 ? "medium" : "low",
    icon: "📊",
    isTopPick: false,
  });

  return bets;
}
