"use client";

import { useState, useMemo } from "react";
import type { TeamStats, H2HMatch } from "@/lib/queries";
import type { Prediction, Bet } from "@/lib/predictions";
import Header from "./Header";
import StatsBar from "./StatsBar";
import FilterBar, { type FilterType } from "./FilterBar";
import BatchPanel from "./BatchPanel";
import MatchList from "./MatchList";

export interface ProcessedGame {
  id: number;
  date: string;
  home: string;
  away: string;
  city: string;
  country: string;
  homeFlag: string;
  awayFlag: string;
  homeRank: number | null;
  awayRank: number | null;
  homeStats: TeamStats;
  awayStats: TeamStats;
  h2h: H2HMatch[];
  pred: Prediction;
  bets: Bet[];
}

interface Props {
  games: ProcessedGame[];
}

export default function Dashboard({ games }: Props) {
  const [currentFilter, setCurrentFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    return games.filter((g) => {
      const matchesSearch =
        !searchTerm ||
        g.home.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.away.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesFilter = true;
      if (currentFilter === "top") matchesFilter = g.bets.some((b) => b.isTopPick);
      if (currentFilter === "over") matchesFilter = g.pred.over25 >= 0.58;
      if (currentFilter === "fav") matchesFilter = Math.max(g.pred.homeWin, g.pred.awayWin) >= 0.7;

      return matchesSearch && matchesFilter;
    });
  }, [games, currentFilter, searchTerm]);

  const teamCount = useMemo(
    () => new Set(games.flatMap((g) => [g.home, g.away])).size,
    [games]
  );

  return (
    <div className="min-h-screen text-slate-200 font-sans">
      <Header />
      <StatsBar games={games} teamCount={teamCount} />
      <FilterBar
        currentFilter={currentFilter}
        searchTerm={searchTerm}
        matchCount={filtered.length}
        onFilterChange={setCurrentFilter}
        onSearch={setSearchTerm}
      />
      <BatchPanel games={games} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <MatchList games={filtered} />
      </main>
      <footer className="text-center py-8 text-slate-600 text-sm border-t border-gold/10">
        FIFA World Cup 2026 · Datenbasierte Vorhersagen · Poisson-Modell
      </footer>
    </div>
  );
}
