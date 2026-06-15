"use client";

import { useState } from "react";
import type { ProcessedGame } from "./Dashboard";
import MatchCard from "./MatchCard";

function formatDate(d: string): string {
  return new Date(d + "T12:00:00Z").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface Props {
  games: ProcessedGame[];
  oddsFormat: "percent" | "decimal";
}

function DateGroup({ date, gs, oddsFormat }: { date: string; gs: ProcessedGame[]; oddsFormat: "percent" | "decimal" }) {
  return (
    <div className="day-group mb-8 animate-fade-up" style={{ animationFillMode: "both" }}>
      <div className="flex items-center gap-4 mb-3.5">
        <h2 className="font-display text-gold tracking-widest text-xl md:text-2xl whitespace-nowrap">
          {formatDate(date)}
        </h2>
        <div className="flex-1 h-px bg-gold/10" />
        <span className="text-sm text-slate-500 whitespace-nowrap font-mono">
          {gs.length} Spiel{gs.length > 1 ? "e" : ""}
        </span>
      </div>
      {gs.map((g) => (
        <MatchCard key={g.id} game={g} oddsFormat={oddsFormat} />
      ))}
    </div>
  );
}

export default function MatchList({ games, oddsFormat }: Props) {
  const [finishedOpen, setFinishedOpen] = useState(false);

  if (games.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500 text-lg md:text-xl">
        Keine Spiele gefunden
      </div>
    );
  }

  const finished = games.filter((g) => !g.is_future);
  const upcoming = games.filter((g) => g.is_future);

  const toByDate = (list: ProcessedGame[]) => {
    const byDate: Record<string, ProcessedGame[]> = {};
    list.forEach((g) => {
      (byDate[g.date] = byDate[g.date] ?? []).push(g);
    });
    return byDate;
  };

  const upcomingByDate = toByDate(upcoming);
  const finishedByDate = toByDate(finished);

  return (
    <div>
      {/* Abgeschlossene Spiele */}
      {finished.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setFinishedOpen((v) => !v)}
            className="w-full flex items-center gap-4 mb-3.5 group"
          >
            <span className="font-display text-slate-400 tracking-widest text-xl md:text-2xl whitespace-nowrap group-hover:text-slate-300 transition-colors">
              Abgeschlossene Spiele
            </span>
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-sm text-slate-600 whitespace-nowrap font-mono group-hover:text-slate-500 transition-colors">
              {finished.length} Spiel{finished.length > 1 ? "e" : ""}
            </span>
            <span className="text-slate-600 text-sm group-hover:text-slate-400 transition-colors shrink-0">
              {finishedOpen ? "▲" : "▼"}
            </span>
          </button>

          {finishedOpen && (
            <div className="animate-fade-up" style={{ animationFillMode: "both" }}>
              {Object.entries(finishedByDate).map(([date, gs]) => (
                <DateGroup key={date} date={date} gs={gs} oddsFormat={oddsFormat} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kommende Spiele */}
      {Object.entries(upcomingByDate).map(([date, gs]) => (
        <DateGroup key={date} date={date} gs={gs} oddsFormat={oddsFormat} />
      ))}
    </div>
  );
}