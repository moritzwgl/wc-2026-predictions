"use client";

export type FilterType = "all" | "top" | "over" | "fav";

interface Props {
  currentFilter: FilterType;
  searchTerm: string;
  matchCount: number;
  onFilterChange: (f: FilterType) => void;
  onSearch: (v: string) => void;
}

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "Alle Spiele" },
  { id: "top", label: "⭐ Top Picks" },
  { id: "over", label: "⚽ Over 2.5" },
  { id: "fav", label: "🏆 Favorit ≥70%" },
];

export default function FilterBar({
  currentFilter,
  searchTerm,
  matchCount,
  onFilterChange,
  onSearch,
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

        <input
          type="text"
          placeholder="Team suchen …"
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          className="ml-auto bg-white/5 border border-gold/15 rounded-lg px-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-gold/40 w-48"
        />

        <span className="text-sm text-slate-500 font-mono whitespace-nowrap">
          {matchCount} Spiele
        </span>
      </div>
    </div>
  );
}
