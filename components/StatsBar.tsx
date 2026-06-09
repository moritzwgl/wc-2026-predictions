import type { ProcessedGame } from "./Dashboard";

interface Props {
  games: ProcessedGame[];
  teamCount: number;
}

export default function StatsBar({ games, teamCount }: Props) {
  const avgGoals = (games.reduce((s, g) => s + g.pred.totalGoals, 0) / games.length).toFixed(1);
  const topPicks = games.filter((g) => g.bets.some((b) => b.isTopPick && b.conf === "high")).length;
  const highOver = games.filter((g) => g.pred.over25 >= 0.65).length;

  const items = [
    { val: games.length, lbl: "Spiele" },
    { val: avgGoals, lbl: "Ø Tore/Spiel" },
    { val: topPicks, lbl: "Top Picks" },
    { val: highOver, lbl: "Over 2.5 (≥65%)" },
    { val: teamCount, lbl: "Teams analysiert" },
  ];

  return (
    <div className="flex flex-wrap justify-center border-y border-gold/10">
      {items.map((it, i) => (
        <div
          key={it.lbl}
          className={`flex-1 max-w-[200px] py-6 px-6 text-center ${
            i < items.length - 1 ? "border-r border-gold/10" : ""
          }`}
        >
          <div className="font-display text-4xl md:text-5xl text-gold leading-none">{it.val}</div>
          <div className="text-sm md:text-base text-slate-500 uppercase tracking-widest mt-2">
            {it.lbl}
          </div>
        </div>
      ))}
    </div>
  );
}
