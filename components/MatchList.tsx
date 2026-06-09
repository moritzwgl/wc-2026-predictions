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
}

export default function MatchList({ games }: Props) {
  if (games.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500 text-lg md:text-xl">
        Keine Spiele gefunden
      </div>
    );
  }

  const byDate: Record<string, ProcessedGame[]> = {};
  games.forEach((g) => {
    (byDate[g.date] = byDate[g.date] ?? []).push(g);
  });

  return (
    <div>
      {Object.entries(byDate).map(([date, gs]) => (
        <div
          key={date}
          className="day-group mb-8 animate-fade-up"
          style={{ animationFillMode: "both" }}
        >
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
            <MatchCard key={g.id} game={g} />
          ))}
        </div>
      ))}
    </div>
  );
}
