"use client";

import { useState } from "react";
import type { ProcessedGame } from "./Dashboard";
import ConfBadge from "./ConfBadge";
import FlagIcon from "./FlagIcon";

interface Props {
  games: ProcessedGame[];
  oddsFormat: "percent" | "decimal";
}

export default function BatchPanel({ games, oddsFormat }: Props) {
  const formatProb = (prob: number, decimalsForPercent = 0) => {
    if (oddsFormat === "decimal") {
      if (prob <= 0) return "—";
      return (1 / prob).toFixed(2);
    } else {
      if (decimalsForPercent === 0) return `${Math.round(prob * 100)}%`;
      return `${(prob * 100).toFixed(decimalsForPercent)}%`;
    }
  };
  const [open, setOpen] = useState(false);

  const topBets = games
    .filter((g) => g.is_future)
    .flatMap((g) =>
      g.bets
        .filter((b) => b.isTopPick && (b.conf === "high" || b.conf === "medium"))
        .map((b) => ({ ...b, home: g.home, away: g.away, homeFlag: g.homeFlag, awayFlag: g.awayFlag }))
    )
    .sort((a, b) => (b.conf === "high" ? 1 : 0) - (a.conf === "high" ? 1 : 0))
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-7xl px-4 border-b border-gold/10" id="best-bets">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-5 cursor-pointer group"
      >
        <div className="font-display text-gold text-xl md:text-2xl tracking-widest flex items-center gap-2.5">
          <span>⚡</span> Die besten {topBets.length} Tipps
        </div>
        <span className="text-slate-600 text-sm group-hover:text-slate-400 transition-colors">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="relative overflow-hidden pb-8">
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 font-display text-[160px] leading-none select-none pointer-events-none"
            style={{ color: "rgba(212,168,83,0.03)" }}
          >
            BATCH
          </span>
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
                  <div className="text-sm text-slate-500 truncate flex items-center gap-1.5">
                    <span className="w-4 h-4 inline-flex"><FlagIcon emoji={b.homeFlag} className="w-full h-full" /></span> {b.home} — <span className="w-4 h-4 inline-flex"><FlagIcon emoji={b.awayFlag} className="w-full h-full" /></span> {b.away}
                  </div>
                  <div className="text-base md:text-lg font-semibold text-amber-100">
                    {b.name}: <strong className="text-gold-light">{b.prob ? formatProb(b.prob) : b.val}</strong>
                  </div>
                </div>
                <ConfBadge conf={b.conf} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
