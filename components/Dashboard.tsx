"use client";

import { useState, useMemo } from "react";
import type { TeamStats, H2HMatch } from "@/lib/queries";
import type { Prediction, Bet } from "@/lib/predictions";
import type { TeamStanding, ThirdPlaceStanding } from "@/lib/groupStandings";
import type { PlayoffBracket } from "@/lib/playoff";
import Header from "./Header";
import StatsBar from "./StatsBar";
import FilterBar, { type FilterType } from "./FilterBar";
import BatchPanel from "./BatchPanel";
import MatchList from "./MatchList";
import GroupStandings from "./GroupStandings";
import PlayoffBracketView from "./PlayoffBracket";

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
  is_future: boolean;
  actual_home_score: number | null;
  actual_away_score: number | null;
  kickoff_utc: string | null;
}

interface Props {
  games: ProcessedGame[];
  groupStandings: Record<string, TeamStanding[]>;
  thirdPlaces: ThirdPlaceStanding[];
  playoffBracket: PlayoffBracket;
}

type ViewTab = "matches" | "groups" | "playoffs";

export default function Dashboard({ games, groupStandings, thirdPlaces, playoffBracket }: Props) {
  const [currentFilter, setCurrentFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [oddsFormat, setOddsFormat] = useState<"percent" | "decimal">("percent");
  const [activeTab, setActiveTab] = useState<ViewTab>("matches");

  const filtered = useMemo(() => {
    return games.filter((g) => {
      const matchesSearch =
        !searchTerm ||
        g.home.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.away.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesFilter = true;
      if (currentFilter === "over15") matchesFilter = g.pred.over15 >= 0.80;
      if (currentFilter === "over") matchesFilter = g.pred.over25 >= 0.58;
      if (currentFilter === "fav") matchesFilter = Math.max(g.pred.homeWin, g.pred.awayWin) >= 0.7;

      return matchesSearch && matchesFilter;
    });
  }, [games, currentFilter, searchTerm]);

  const teamCount = useMemo(
    () => new Set(games.flatMap((g) => [g.home, g.away])).size,
    [games]
  );

  const TAB_STYLES = (active: boolean) => ({
    background: active ? "#d4a853" : "transparent",
    borderColor: active ? "#d4a853" : "rgba(212,168,83,0.15)",
    color: active ? "#060a10" : "#94a3b8",
    fontWeight: active ? 600 : 500,
  });

  return (
    <div className="min-h-screen text-slate-200 font-sans">
      <Header />
      <StatsBar games={games} teamCount={teamCount} />

      {/* Tab Navigation */}
      <div className="glass border-b border-gold/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => setActiveTab("matches")}
            className="px-5 py-2 rounded-lg border text-sm font-medium transition-all"
            style={TAB_STYLES(activeTab === "matches")}
          >
            📅 Spielplan
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className="px-5 py-2 rounded-lg border text-sm font-medium transition-all"
            style={TAB_STYLES(activeTab === "groups")}
          >
            🏆 Gruppentabellen
          </button>
          <button
            onClick={() => setActiveTab("playoffs")}
            className="px-5 py-2 rounded-lg border text-sm font-medium transition-all"
            style={TAB_STYLES(activeTab === "playoffs")}
          >
            🎯 Playoffs
          </button>
        </div>
      </div>

      {activeTab === "matches" ? (
        <>
          <FilterBar
            currentFilter={currentFilter}
            searchTerm={searchTerm}
            matchCount={filtered.length}
            onFilterChange={setCurrentFilter}
            onSearch={setSearchTerm}
            oddsFormat={oddsFormat}
            onOddsFormatChange={setOddsFormat}
          />
          <BatchPanel games={games} oddsFormat={oddsFormat} />
          <main className="max-w-7xl mx-auto px-4 py-8">
            <MatchList games={filtered} oddsFormat={oddsFormat} />
          </main>
        </>
      ) : activeTab === "groups" ? (
        <GroupStandings standings={groupStandings} thirdPlaces={thirdPlaces} />
      ) : (
        <PlayoffBracketView bracket={playoffBracket} />
      )}

      <footer className="text-center py-8 text-slate-600 text-sm border-t border-gold/10">
        FIFA World Cup 2026 · Datenbasierte Vorhersagen · Poisson-Modell
      </footer>
    </div>
  );
}
