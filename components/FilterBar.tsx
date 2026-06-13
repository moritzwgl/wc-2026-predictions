"use client";

export type FilterType = "all" | "over15" | "over" | "fav";

interface Props {
  currentFilter: FilterType;
  searchTerm: string;
  matchCount: number;
  oddsFormat: "percent" | "decimal";
  onFilterChange: (f: FilterType) => void;
  onSearch: (v: string) => void;
  onOddsFormatChange: (f: "percent" | "decimal") => void;
}

const FILTERS: { id: FilterType; label: string; tooltip: string }[] = [
  { id: "all", label: "Alle Spiele", tooltip: "Alle 72 Gruppenspiele anzeigen" },
  { id: "over15", label: "⚽ Over 1.5", tooltip: "Spiele mit ≥80% Wahrscheinlichkeit für mindestens 2 Tore" },
  { id: "over", label: "⚽ Over 2.5", tooltip: "Spiele mit ≥58% Wahrscheinlichkeit für mindestens 3 Tore" },
  { id: "fav", label: "🏆 Favorit ≥70%", tooltip: "Spiele mit einem klaren Favoriten (Siegchance ≥70%)" },
];

export default function FilterBar({
  currentFilter,
  searchTerm,
  matchCount,
  oddsFormat,
  onFilterChange,
  onSearch,
  onOddsFormatChange,
}: Props) {
  return (
    <div className="glass sticky top-0 z-20 border-b border-gold/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => {
            const active = currentFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                title={f.tooltip}
                className="filter-btn px-4 py-2 rounded-lg border text-sm font-medium transition-all"
                style={{
                  background: active ? "#d4a853" : "transparent",
                  borderColor: active ? "#d4a853" : "rgba(212,168,83,0.15)",
                  color: active ? "#060a10" : "#94a3b8",
                  fontWeight: active ? 600 : 500,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => onOddsFormatChange(oddsFormat === "percent" ? "decimal" : "percent")}
            className="bg-white/5 border border-gold/15 rounded-lg px-3 py-2 text-sm text-slate-300 hover:border-gold/40 transition-colors whitespace-nowrap"
            title="Darstellung zwischen Prozent und Quoten umschalten"
          >
            {oddsFormat === "percent" ? "Format: %" : "Format: Quoten"}
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Team suchen …"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              className="bg-white/5 border border-gold/15 rounded-lg px-4 py-2 pr-8 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-gold/40 w-48"
            />
            {searchTerm && (
              <button
                onClick={() => onSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 flex items-center justify-center w-5 h-5"
                title="Suche löschen"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <span className="text-sm text-slate-500 font-mono whitespace-nowrap">
          {matchCount} Spiele
        </span>
      </div>
    </div>
  );
}
