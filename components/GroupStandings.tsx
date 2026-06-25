"use client";

import type { TeamStanding, ThirdPlaceStanding } from "@/lib/groupStandings";
import FlagIcon from "./FlagIcon";

interface Props {
  standings: Record<string, TeamStanding[]>;
  thirdPlaces: ThirdPlaceStanding[];
}

// Colored pill showing advance status
function StatusBadge({ status }: { status: TeamStanding["advanceStatus"] }) {
  const configs = {
    "1st": { label: "1. Platz", bg: "rgba(212,168,83,0.15)", color: "#d4a853", border: "rgba(212,168,83,0.3)" },
    "2nd": { label: "2. Platz", bg: "rgba(212,168,83,0.07)", color: "#a87832", border: "rgba(212,168,83,0.2)" },
    "3rd-in": { label: "3. ✓", bg: "rgba(34,197,94,0.1)", color: "#22c55e", border: "rgba(34,197,94,0.25)" },
    "3rd-out": { label: "3.", bg: "rgba(100,116,139,0.1)", color: "#64748b", border: "rgba(100,116,139,0.2)" },
    "4th": { label: "4. Platz", bg: "rgba(239,68,68,0.07)", color: "#ef4444", border: "rgba(239,68,68,0.15)" },
  };
  const c = configs[status];
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap"
      style={{ background: c.bg, color: c.color, borderColor: c.border }}
    >
      {c.label}
    </span>
  );
}

function AdvanceBar({ prob, status }: { prob: number; status: TeamStanding["advanceStatus"] }) {
  const pct = Math.round(prob * 100);
  const color =
    status === "1st" || status === "2nd" ? "#d4a853" :
    status === "3rd-in" ? "#22c55e" :
    status === "3rd-out" ? "#64748b" : "#ef4444";
  return (
    <div className="flex items-center gap-2 min-w-[72px]">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="font-mono text-xs w-8 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function GroupTable({ group, teams }: { group: string; teams: TeamStanding[] }) {
  return (
    <div className="rounded-xl border border-gold/10 overflow-hidden" style={{ background: "#0e1520" }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3 border-b border-gold/10" style={{ background: "#0b1219" }}>
        <span
          className="text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded"
          style={{ background: "rgba(212,168,83,0.12)", color: "#d4a853" }}
        >
          Gruppe {group}
        </span>
        <span className="text-slate-600 text-xs ml-auto">{teams[0]?.played ?? 0} Spiele/Team</span>
      </div>

      {/* Column headers */}
      <div
        className="grid text-[10px] uppercase tracking-wider text-slate-600 px-4 py-1.5 border-b border-white/[0.04]"
        style={{ gridTemplateColumns: "1.4rem 1fr 1.8rem 2.2rem 2.2rem 2.2rem 3rem 2.2rem 2.4rem 4.5rem", gap: "0.4rem" }}
      >
        <span>#</span>
        <span>Team</span>
        <span className="text-center">Sp</span>
        <span className="text-center">S</span>
        <span className="text-center">U</span>
        <span className="text-center">N</span>
        <span className="text-center">Tore</span>
        <span className="text-center">TD</span>
        <span className="text-center font-semibold">Pkt</span>
        <span className="text-center">Aufstieg</span>
      </div>

      {/* Rows */}
      {teams.map((t, i) => {
        const advancing = t.advanceStatus === "1st" || t.advanceStatus === "2nd" || t.advanceStatus === "3rd-in";
        const borderColor =
          t.advanceStatus === "1st" ? "#d4a853" :
          t.advanceStatus === "2nd" ? "rgba(212,168,83,0.3)" :
          t.advanceStatus === "3rd-in" ? "rgba(34,197,94,0.4)" :
          "transparent";
        const rowBg =
          t.advanceStatus === "1st" ? "rgba(212,168,83,0.05)" :
          t.advanceStatus === "2nd" ? "rgba(212,168,83,0.02)" :
          t.advanceStatus === "3rd-in" ? "rgba(34,197,94,0.03)" : "transparent";

        return (
          <div
            key={t.team}
            className="grid items-center px-4 py-2.5 border-b border-white/[0.03] last:border-0 transition-colors hover:bg-white/[0.02]"
            style={{
              gridTemplateColumns: "1.4rem 1fr 1.8rem 2.2rem 2.2rem 2.2rem 3rem 2.2rem 2.4rem 4.5rem",
              gap: "0.4rem",
              background: rowBg,
              borderLeft: `3px solid ${borderColor}`,
            }}
          >
            <span className="text-xs font-bold font-mono" style={{ color: advancing ? "#d4a853" : "#475569" }}>
              {i + 1}
            </span>

            <div className="flex items-center gap-1.5 min-w-0">
              <FlagIcon emoji={t.flag} className="w-5 h-5 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-amber-50 truncate leading-tight">{t.team}</span>
                {t.rank && <span className="text-[9px] text-slate-600 leading-tight">FIFA #{t.rank}</span>}
              </div>
            </div>

            <span className="text-[11px] text-slate-500 text-center font-mono">{t.played}</span>
            <span className="text-[11px] text-center font-mono text-emerald-500">{t.isGroupFinished ? Math.round(t.w) : t.w.toFixed(1)}</span>
            <span className="text-[11px] text-center font-mono text-slate-400">{t.isGroupFinished ? Math.round(t.d) : t.d.toFixed(1)}</span>
            <span className="text-[11px] text-center font-mono text-red-500">{t.isGroupFinished ? Math.round(t.l) : t.l.toFixed(1)}</span>
            <span className="text-[11px] text-center font-mono text-slate-300">
              {t.isGroupFinished ? Math.round(t.gf) : t.gf.toFixed(1)}:{t.isGroupFinished ? Math.round(t.ga) : t.ga.toFixed(1)}
            </span>
            <span
              className="text-[11px] text-center font-mono font-semibold"
              style={{ color: t.gd > 0 ? "#22c55e" : t.gd < 0 ? "#ef4444" : "#94a3b8" }}
            >
              {t.gd > 0 ? "+" : ""}{t.isGroupFinished ? Math.round(t.gd) : t.gd.toFixed(1)}
            </span>
            <span
              className="text-sm text-center font-mono font-bold"
              style={{ color: advancing ? "#f0c96e" : "#64748b" }}
            >
              {t.isGroupFinished ? Math.round(t.pts) : t.pts.toFixed(1)}
            </span>

            {t.isGroupFinished ? (
              <div className="flex justify-center">
                <StatusBadge status={t.advanceStatus} />
              </div>
            ) : (
              <AdvanceBar prob={t.pAdvance} status={t.advanceStatus} />
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div
        className="px-4 py-1.5 flex items-center gap-4 text-[10px] text-slate-600"
        style={{ background: "#090d17", borderTop: "1px solid rgba(255,255,255,0.03)" }}
      >
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400/50" />1. & 2. direkt weiter</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/50" />3. (bestes von 12)</span>
      </div>
    </div>
  );
}

function ThirdPlaceTable({ teams }: { teams: ThirdPlaceStanding[] }) {
  return (
    <div
      className="rounded-xl border overflow-hidden mt-2"
      style={{ background: "#0e1520", borderColor: "rgba(34,197,94,0.2)" }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center gap-3 border-b"
        style={{ background: "#091510", borderColor: "rgba(34,197,94,0.15)" }}
      >
        <span
          className="text-xs font-bold tracking-[0.15em] uppercase px-3 py-1 rounded"
          style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          🏅 Ranking der Drittplatzierten
        </span>
        <span className="text-slate-500 text-xs ml-auto">
          Die besten 8 von 12 kommen weiter → Round of 32
        </span>
      </div>

      {/* Column headers */}
      <div
        className="grid text-[10px] uppercase tracking-wider text-slate-600 px-4 py-1.5 border-b border-white/[0.04]"
        style={{ gridTemplateColumns: "1.8rem 0.8rem 1fr 3rem 2.2rem 2.2rem 3rem 2.2rem 2.4rem 5rem", gap: "0.4rem" }}
      >
        <span>#</span>
        <span>Gr.</span>
        <span>Team</span>
        <span className="text-center">Pkt</span>
        <span className="text-center">S</span>
        <span className="text-center">U</span>
        <span className="text-center">Tore</span>
        <span className="text-center">TD</span>
        <span className="text-center">FIFA</span>
        <span className="text-center">Status</span>
      </div>

      {teams.map((t, i) => {
        const cutLine = i === 7; // after 8th team
        return (
          <div key={t.team}>
            {/* Cut line between 8th and 9th */}
            {cutLine && (
              <div className="flex items-center gap-3 px-4 py-1.5" style={{ background: "rgba(239,68,68,0.05)" }}>
                <div className="flex-1 h-px bg-red-500/30" />
                <span className="text-[9px] text-red-500/70 uppercase tracking-wider font-semibold whitespace-nowrap">
                  ✂ Ausscheidung ab hier
                </span>
                <div className="flex-1 h-px bg-red-500/30" />
              </div>
            )}
            <div
              className="grid items-center px-4 py-2.5 border-b border-white/[0.03] last:border-0 transition-colors hover:bg-white/[0.02]"
              style={{
                gridTemplateColumns: "1.8rem 0.8rem 1fr 3rem 2.2rem 2.2rem 3rem 2.2rem 2.4rem 5rem",
                gap: "0.4rem",
                background: t.advances ? "rgba(34,197,94,0.03)" : "transparent",
                borderLeft: t.advances ? "3px solid rgba(34,197,94,0.4)" : "3px solid transparent",
              }}
            >
              <span className="text-xs font-bold font-mono" style={{ color: t.advances ? "#22c55e" : "#64748b" }}>
                {t.thirdRank}
              </span>
              <span
                className="text-[10px] font-bold font-mono"
                style={{ color: "#d4a853" }}
              >
                {t.group}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <FlagIcon emoji={t.flag} className="w-5 h-5 shrink-0" />
                <span className="text-xs font-medium text-amber-50 truncate">{t.team}</span>
              </div>
              <span className="text-sm text-center font-mono font-bold" style={{ color: t.advances ? "#22c55e" : "#64748b" }}>
                {t.isGroupFinished ? Math.round(t.pts) : t.pts.toFixed(1)}
              </span>
              <span className="text-[11px] text-center font-mono text-emerald-500">{t.isGroupFinished ? Math.round(t.w) : t.w.toFixed(1)}</span>
              <span className="text-[11px] text-center font-mono text-slate-400">{t.isGroupFinished ? Math.round(t.d) : t.d.toFixed(1)}</span>
              <span className="text-[11px] text-center font-mono text-slate-300">
                {t.isGroupFinished ? Math.round(t.gf) : t.gf.toFixed(1)}:{t.isGroupFinished ? Math.round(t.ga) : t.ga.toFixed(1)}
              </span>
              <span
                className="text-[11px] text-center font-mono font-semibold"
                style={{ color: t.gd > 0 ? "#22c55e" : t.gd < 0 ? "#ef4444" : "#94a3b8" }}
              >
                {t.gd > 0 ? "+" : ""}{t.isGroupFinished ? Math.round(t.gd) : t.gd.toFixed(1)}
              </span>
              <span className="text-[11px] text-center font-mono text-slate-500">
                #{t.rank ?? "—"}
              </span>
              <div className="flex justify-center">
                <StatusBadge status={t.advances ? "3rd-in" : "3rd-out"} />
              </div>
            </div>
          </div>
        );
      })}

      <div
        className="px-4 py-2 text-[10px] text-slate-600"
        style={{ background: "#090d17", borderTop: "1px solid rgba(255,255,255,0.03)" }}
      >
        Sortierung: Punkte → Tordifferenz → Tore → FIFA-Weltrangliste · Erwartungswerte basierend auf Poisson-Modell
      </div>
    </div>
  );
}

export default function GroupStandings({ standings, thirdPlaces }: Props) {
  const groups = Object.keys(standings).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Format Info Banner */}
      <div
        className="mb-6 rounded-xl border border-gold/10 px-5 py-4 flex flex-wrap gap-6 items-center"
        style={{ background: "#0b1219" }}
      >
        <div>
          <h2 className="text-xl font-bold text-amber-50 mb-0.5">🏆 Voraussichtliche Gruppenphase</h2>
          <p className="text-slate-500 text-xs">Erwartungswerte basierend auf FIFA-Weltrangliste, Form & historischen Daten</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-4 text-xs">
          {[
            { label: "12 Gruppen à 4 Teams", icon: "⚽" },
            { label: "Top 2 pro Gruppe → weiter", icon: "🥇" },
            { label: "8 beste Drittplatzierte → weiter", icon: "🏅" },
            { label: "32 Teams im Round of 32", icon: "🎯" },
          ].map(({ label, icon }) => (
            <div key={label} className="flex items-center gap-1.5 text-slate-400">
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Group tables grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
        {groups.map((g) => (
          <GroupTable key={g} group={g} teams={standings[g]} />
        ))}
      </div>

      {/* Third place ranking */}
      <ThirdPlaceTable teams={thirdPlaces} />

      <p className="text-center text-slate-700 text-[10px] mt-6">
        S = erw. Siege · U = erw. Unentschieden · N = erw. Niederlagen · Pkt = erw. Punkte · TD = Tordifferenz
      </p>
    </div>
  );
}
