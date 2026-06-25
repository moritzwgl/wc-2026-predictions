"use client";

import type { PlayoffBracket, PlayoffMatchup, PlayoffTeam } from "@/lib/playoff";
import FlagIcon from "./FlagIcon";

interface Props {
  bracket: PlayoffBracket;
}

function ProbBar({ prob, color }: { prob: number; color: string }) {
  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(prob * 100)}%`, background: color }} />
    </div>
  );
}

function TeamSlot({
  team,
  prob,
  isWinner,
  small = false,
}: {
  team: PlayoffTeam | null;
  prob: number;
  isWinner: boolean;
  small?: boolean;
}) {
  if (!team) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded ${small ? "text-[11px]" : "text-sm"} text-slate-600 italic`}>
        TBD
      </div>
    );
  }

  const winColor = isWinner ? "#d4a853" : "#64748b";
  const bgColor = isWinner ? "rgba(212,168,83,0.08)" : "transparent";
  const borderColor = isWinner ? "rgba(212,168,83,0.3)" : "transparent";

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${small ? "" : ""}`}
      style={{ background: bgColor, borderColor }}
    >
      <FlagIcon emoji={team.flag} className={small ? "w-4 h-4 shrink-0" : "w-5 h-5 shrink-0"} />
      <span
        className={`font-medium truncate flex-1 ${small ? "text-xs" : "text-sm"}`}
        style={{ color: isWinner ? "#f0c96e" : "#94a3b8" }}
      >
        {team.team}
      </span>
      <span
        className={`font-mono font-bold shrink-0 ${small ? "text-[11px]" : "text-sm"}`}
        style={{ color: winColor }}
      >
        {Math.round(prob * 100)}%
      </span>
    </div>
  );
}

function MatchCard({
  match,
  compact = false,
  highlight = false,
}: {
  match: PlayoffMatchup;
  compact?: boolean;
  highlight?: boolean;
}) {
  const borderGlow = highlight
    ? "border-gold/40 shadow-[0_0_20px_rgba(212,168,83,0.15)]"
    : "border-white/[0.06]";

  return (
    <div
      className={`rounded-xl border ${borderGlow} overflow-hidden`}
      style={{ background: highlight ? "#0e1520" : "#0b1219", minWidth: compact ? 160 : 200 }}
    >
      {/* Round label */}
      {!compact && (
        <div
          className="px-3 py-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-600 border-b border-white/[0.04]"
          style={{ background: "#090d17" }}
        >
          <span>{match.round} · #{match.id}</span>
          {match.date && <span className="text-xs normal-case tracking-normal text-slate-500 font-medium">{match.date}</span>}
        </div>
      )}

      {/* Compact date label */}
      {compact && match.date && (
        <div
          className="px-2 py-0.5 text-[10px] text-center text-slate-500 border-b border-white/[0.04] uppercase tracking-wide"
          style={{ background: "#090d17" }}
        >
          {match.date}
        </div>
      )}

      <div className="p-2 flex flex-col gap-1">
        <TeamSlot team={match.teamA} prob={match.probA} isWinner={match.winner?.team === match.teamA?.team} small={compact} />
        <div className="flex items-center gap-1 px-2.5">
          <div className="flex-1 h-px bg-white/[0.04]" />
          <span className="text-[10px] text-slate-700 font-mono uppercase tracking-wider">vs</span>
          <div className="flex-1 h-px bg-white/[0.04]" />
        </div>
        <TeamSlot team={match.teamB} prob={match.probB} isWinner={match.winner?.team === match.teamB?.team} small={compact} />
      </div>

      {/* Winner bar */}
      {match.winner && (
        <div
          className="px-3 py-1 text-[11px] text-slate-500 border-t border-white/[0.04] flex items-center gap-1"
          style={{ background: "#090d17" }}
        >
          <span className="text-amber-500">→</span>
          <span className="truncate font-medium text-amber-400/80">{match.winner.team}</span>
          <span className="ml-auto font-mono text-amber-600/60">{Math.round(match.winnerProb * 100)}%</span>
        </div>
      )}
    </div>
  );
}

function RoundSection({
  title,
  icon,
  matches,
  compact = false,
  highlight = false,
}: {
  title: string;
  icon: string;
  matches: PlayoffMatchup[];
  compact?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-bold text-amber-50">{title}</h3>
        <span className="text-xs text-slate-600 ml-1">({matches.length} Spiele)</span>
      </div>
      <div className={`grid gap-2.5 ${compact ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} compact={compact} highlight={highlight} />
        ))}
      </div>
    </div>
  );
}

function ChampionBanner({ team }: { team: PlayoffTeam }) {
  return (
    <div
      className="rounded-2xl border border-gold/30 p-6 text-center mb-8 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(212,168,83,0.12) 0%, rgba(212,168,83,0.04) 100%)",
        boxShadow: "0 0 60px rgba(212,168,83,0.12)",
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(212,168,83,0.08) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <span className="text-3xl">🏆</span>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500 font-semibold">Voraussichtlicher Weltmeister</p>
        <div className="flex items-center gap-3">
          <FlagIcon emoji={team.flag} className="w-12 h-12" />
          <h2 className="text-3xl font-bold text-gold-gradient">{team.team}</h2>
        </div>
        {team.rank && (
          <p className="text-sm text-slate-500">FIFA-Weltrangliste: #{team.rank}</p>
        )}
      </div>
    </div>
  );
}

export default function PlayoffBracketView({ bracket }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Banner */}
      <div
        className="rounded-xl border border-gold/10 px-5 py-4 flex flex-wrap gap-4 items-center"
        style={{ background: "#0b1219" }}
      >
        <div>
          <h2 className="text-xl font-bold text-amber-50 mb-0.5">🎯 Playoff-Prognose</h2>
          <p className="text-slate-500 text-xs">
            Basierend auf dem offiziellen FIFA WM 2026 Bracket · Simulation via FIFA-Punkte & Gruppenphase-Performance
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-4 text-xs text-slate-400">
          {[
            { label: "Round of 32", n: 16 },
            { label: "Round of 16", n: 8 },
            { label: "Viertelfinale", n: 4 },
            { label: "Halbfinale", n: 2 },
            { label: "Finale", n: 1 },
          ].map(({ label, n }) => (
            <span key={label} className="flex items-center gap-1">
              <span className="text-gold font-mono font-bold">{n}</span>
              <span>{label === "Round of 32" ? "Spiele im " + label : label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Champion */}
      {bracket.champion && <ChampionBanner team={bracket.champion} />}

      {/* Final */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🏆</span>
          <h3 className="text-sm font-bold text-amber-50">Finale</h3>
        </div>
        <div className="max-w-sm">
          <MatchCard match={bracket.final} highlight />
        </div>
      </section>

      {/* Semi-finals */}
      <RoundSection title="Halbfinale" icon="🥈" matches={bracket.semiFinals} highlight />

      {/* Quarter-finals */}
      <RoundSection title="Viertelfinale" icon="⚡" matches={bracket.quarterFinals} />

      {/* Round of 16 */}
      <RoundSection title="Round of 16" icon="🔥" matches={bracket.roundOf16} compact />

      {/* Round of 32 */}
      <RoundSection title="Round of 32" icon="🎯" matches={bracket.roundOf32} compact />

      <p className="text-center text-slate-700 text-xs pb-4">
        Matchup-Wahrscheinlichkeiten: 70% FIFA-Weltrangliste + 30% Gruppenphase-Performance ·
        Bracket-Struktur gemäß offizieller FIFA WM 2026 Regularien
      </p>
    </div>
  );
}
