import type { ProcessedGame } from "./Dashboard";
import ConfBadge from "./ConfBadge";

interface Props {
  games: ProcessedGame[];
}

export default function BatchPanel({ games }: Props) {
  const topBets = games
    .flatMap((g) =>
      g.bets
        .filter((b) => b.isTopPick && (b.conf === "high" || b.conf === "medium"))
        .map((b) => ({ ...b, home: g.home, away: g.away, homeFlag: g.homeFlag, awayFlag: g.awayFlag }))
    )
    .sort((a, b) => (b.conf === "high" ? 1 : 0) - (a.conf === "high" ? 1 : 0))
    .slice(0, 12);

  return (
    <div
      className="relative mx-auto max-w-7xl px-4 py-10 border-b border-gold/10 overflow-hidden"
    >
      <span
        className="absolute right-6 top-1/2 -translate-y-1/2 font-display text-[160px] leading-none select-none pointer-events-none"
        style={{ color: "rgba(212,168,83,0.03)" }}
      >
        BATCH
      </span>

      <div className="font-display text-gold text-2xl md:text-3xl tracking-widest mb-6 flex items-center gap-2.5">
        <span>⚡</span> Batch-Empfehlungen · Top {topBets.length} Tipps
      </div>

      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
      >
        {topBets.map((b, i) => (
          <div
            key={i}
            className="flex items-center gap-3 md:gap-4 rounded-lg border border-gold/[0.12] px-4 py-3 hover:border-gold/30 transition-all"
            style={{ background: "rgba(6,10,16,0.6)" }}
          >
            <span className="text-xl md:text-2xl shrink-0">{b.icon}</span>
            <div className="flex-1 min-w-0 leading-snug">
              <div className="text-sm text-slate-500 truncate">
                {b.homeFlag} {b.home} — {b.awayFlag} {b.away}
              </div>
              <div className="text-base md:text-lg font-semibold text-amber-100">
                {b.name}: <strong className="text-gold-light">{b.val}</strong>
              </div>
            </div>
            <ConfBadge conf={b.conf} />
          </div>
        ))}
      </div>
    </div>
  );
}
