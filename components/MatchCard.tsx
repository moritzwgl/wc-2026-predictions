"use client";

import { useState } from "react";
import type { ProcessedGame } from "./Dashboard";
import ConfBadge from "./ConfBadge";

interface RecentMatchRowProps {
  date: string;
  opponent: string;
  score: string;
  result: "W" | "D" | "L";
}

function RecentMatchRow({ date, opponent, score, result }: RecentMatchRowProps) {
  const bg =
    result === "W"
      ? "bg-emerald-500/20 text-emerald-400"
      : result === "L"
      ? "bg-red-500/20 text-red-400"
      : "bg-slate-500/20 text-slate-300";
  return (
    <div className="flex items-center py-2 border-b border-white/[0.04] text-base md:text-lg">
      <span className="text-slate-600 font-mono text-sm w-20 md:w-24 shrink-0">{date}</span>
      <span className={`inline-flex w-5 h-5 items-center justify-center rounded font-mono text-sm font-bold ${bg} shrink-0 mr-2`}>
        {result}
      </span>
      <span className="text-slate-300 mx-2 font-mono w-8 text-center shrink-0">{score}</span>
      <span className="text-slate-500 text-sm truncate">vs {opponent}</span>
    </div>
  );
}

interface H2HRowProps {
  date: string;
  home: string;
  away: string;
  home_score: number;
  away_score: number;
}

function H2HRow({ date, home, away, home_score, away_score }: H2HRowProps) {
  return (
    <div className="flex items-center py-2 border-b border-white/[0.04] text-base md:text-lg">
      <span className="text-slate-600 font-mono text-sm w-20 shrink-0">{date}</span>
      <span className="text-slate-400 truncate">{home}</span>
      <span className="text-gold-light mx-2 font-mono font-semibold shrink-0">
        {home_score}:{away_score}
      </span>
      <span className="text-slate-400 truncate">{away}</span>
    </div>
  );
}

const BET_COLORS = [
  "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  "bg-gold/10 border-gold/20 text-gold-light",
  "bg-blue-500/[0.12] border-blue-500/20 text-blue-400",
];

const statRow = (label: string, value: string | number, extraClass = "") => (
  <div className="flex justify-between items-center py-2 border-b border-white/[0.04] text-base md:text-lg">
    <span className="text-slate-400">{label}</span>
    <span className={`font-mono text-base font-medium ${extraClass || "text-amber-100"}`}>{value}</span>
  </div>
);

export default function MatchCard({ game }: { game: ProcessedGame }) {
  const [expanded, setExpanded] = useState(false);
  const { pred, bets } = game;
  const top = pred.topScores[0];
  const hwP = Math.round(pred.homeWin * 100);
  const dwP = Math.round(pred.draw * 100);
  const awP = Math.round(pred.awayWin * 100);

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      className={`match-card card-accent rounded-xl border border-gold/10 mb-2.5 cursor-pointer transition-all duration-250 hover:-translate-y-px hover:shadow-2xl hover:border-gold/30 ${expanded ? "expanded" : ""}`}
      style={{
        background: "#0e1520",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr auto",
        alignItems: "center",
      }}
    >
      {/* HOME */}
      <div className="px-5 py-6 flex flex-col gap-1.5">
        <span className="text-4xl md:text-5xl leading-none mb-1">{game.homeFlag}</span>
        <span className="font-semibold text-xl md:text-2xl text-amber-50 tracking-tight">
          {game.home}{" "}
          <span className="text-slate-500 font-normal text-lg ml-1">
            {game.homeRank ? `(#${game.homeRank})` : ""}
          </span>
        </span>
        <span className="font-mono text-sm text-slate-500">
          WR {Math.round(game.homeStats.win_rate * 100)}% · xG {pred.lambdaH}
        </span>
      </div>

      {/* CENTRE */}
      <div className="px-5 py-4 flex flex-col items-center gap-2 border-l border-r border-gold/10 min-w-[160px]">
        <span className="text-sm uppercase tracking-[0.15em] text-slate-500">Prognose</span>
        <span className="font-display text-6xl md:text-7xl text-gold-light tracking-widest leading-none">
          {top.h} : {top.a}
        </span>
        <div className="prob-bar w-full mt-1">
          <div style={{ width: `${hwP}%`, background: "#3b82f6" }} />
          <div style={{ width: `${dwP}%`, background: "#475569" }} />
          <div style={{ width: `${awP}%`, background: "#ef4444" }} />
        </div>
        <div className="flex justify-between w-full font-mono text-sm mt-0.5">
          <span className="text-blue-400">{hwP}%</span>
          <span className="text-slate-500">{dwP}%</span>
          <span className="text-red-400">{awP}%</span>
        </div>
        <div className="text-sm text-slate-500 mt-1">📍 {game.city}</div>
      </div>

      {/* AWAY */}
      <div className="px-5 py-6 flex flex-col gap-1.5 items-end text-right">
        <span className="text-4xl md:text-5xl leading-none mb-1">{game.awayFlag}</span>
        <span className="font-semibold text-xl md:text-2xl text-amber-50 tracking-tight">
          <span className="text-slate-500 font-normal text-lg mr-1">
            {game.awayRank ? `(#${game.awayRank})` : ""}
          </span>
          {game.away}
        </span>
        <span className="font-mono text-sm text-slate-500">
          WR {Math.round(game.awayStats.win_rate * 100)}% · xG {pred.lambdaA}
        </span>
      </div>

      {/* QUICK BETS */}
      <div className="hidden md:flex flex-col justify-center gap-2 px-5 py-4 min-w-[200px] border-l border-gold/10">
        {bets.slice(0, 3).map((b, i) => (
          <div
            key={i}
            className={`text-sm px-3 py-2 rounded-md border ${BET_COLORS[i]} whitespace-nowrap`}
          >
            {b.icon} {b.name}: {b.val}
          </div>
        ))}
      </div>

      {/* EXPANDED PANEL */}
      <div
        className="match-detail col-span-full border-t border-gold/10 gap-5 p-5"
        style={{ background: "#131d2d" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Stats */}
        <div>
          <h4 className="text-sm uppercase tracking-[0.14em] text-gold mb-4">📊 Statistiken</h4>
          {statRow("Gesamt xG", pred.totalGoals, "text-gold-light")}
          {statRow("Über 1.5 Tore", `${Math.round(pred.over15 * 100)}%`)}
          {statRow("Über 2.5 Tore", `${Math.round(pred.over25 * 100)}%`, pred.over25 >= 0.6 ? "text-emerald-400" : "")}
          {statRow("Über 3.5 Tore", `${Math.round(pred.over35 * 100)}%`)}
          {statRow("Beide treffen", `${Math.round(pred.btts * 100)}%`, pred.btts >= 0.6 ? "text-emerald-400" : "")}
          {statRow("xG Heim", pred.lambdaH)}
          {statRow("xG Gast", pred.lambdaA)}
          <div className="mt-4">
            <div className="text-sm uppercase tracking-widest text-slate-500 mb-3">
              Wahrscheinlichste Ergebnisse
            </div>
            <div className="grid grid-cols-5 gap-1">
              {pred.topScores.slice(0, 5).map((s, i) => (
                <div
                  key={i}
                  className={`text-center py-1.5 px-1 rounded font-mono text-sm ${
                    i === 0
                      ? "bg-gold/20 text-gold-light font-semibold"
                      : i < 3
                      ? "bg-gold/10 text-gold"
                      : "bg-black/30 text-slate-500"
                  }`}
                >
                  {s.h}:{s.a}
                  <br />
                  <span className="text-xs opacity-70">{(s.p * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bets */}
        <div>
          <h4 className="text-sm uppercase tracking-[0.14em] text-gold mb-4">🎯 Alle Wettempfehlungen</h4>
          <div className="flex flex-col gap-1.5">
            {bets.map((b, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-black/25">
                <span className="text-lg">{b.icon}</span>
                <span className="text-base text-slate-400 flex-1">{b.name}</span>
                <span className="font-mono text-base font-semibold text-amber-100 mx-2">{b.val}</span>
                <ConfBadge conf={b.conf} />
              </div>
            ))}
          </div>
        </div>

        {/* Team Data */}
        <div>
          <h4 className="text-sm uppercase tracking-[0.14em] text-gold mb-4">📈 Teamdaten (seit 2020)</h4>
          {statRow(`${game.home} Ø Tore`, game.homeStats.avg_scored)}
          {statRow(`${game.home} Ø Gegentore`, game.homeStats.avg_conceded)}
          {statRow(`${game.home} Siegquote`, `${Math.round(game.homeStats.win_rate * 100)}%`, game.homeStats.win_rate >= 0.6 ? "text-emerald-400" : "")}
          {statRow("—", "—")}
          {statRow(`${game.away} Ø Tore`, game.awayStats.avg_scored)}
          {statRow(`${game.away} Ø Gegentore`, game.awayStats.avg_conceded)}
          {statRow(`${game.away} Siegquote`, `${Math.round(game.awayStats.win_rate * 100)}%`, game.awayStats.win_rate >= 0.6 ? "text-emerald-400" : "")}
          {statRow("Austragungsort", `${game.city}, ${game.country}`, "text-slate-400")}
        </div>

        {/* Form & H2H */}
        <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-5 mt-2 pt-6 border-t border-gold/10">
          <div>
            <h4 className="text-sm uppercase tracking-[0.14em] text-gold/70 mb-4">
              Letzte 10 Spiele: {game.home}
            </h4>
            {game.homeStats.recent_matches.length === 0 ? (
              <p className="text-slate-600">Keine Daten verfügbar</p>
            ) : (
              game.homeStats.recent_matches.map((m, i) => (
                <RecentMatchRow key={i} {...m} />
              ))
            )}
          </div>
          <div>
            <h4 className="text-sm uppercase tracking-[0.14em] text-gold/70 mb-4">
              Direkte Duelle (H2H)
            </h4>
            {game.h2h.length === 0 ? (
              <p className="text-slate-600">Keine Daten verfügbar</p>
            ) : (
              game.h2h.map((m, i) => <H2HRow key={i} {...m} />)
            )}
          </div>
          <div>
            <h4 className="text-sm uppercase tracking-[0.14em] text-gold/70 mb-4">
              Letzte 10 Spiele: {game.away}
            </h4>
            {game.awayStats.recent_matches.length === 0 ? (
              <p className="text-slate-600">Keine Daten verfügbar</p>
            ) : (
              game.awayStats.recent_matches.map((m, i) => (
                <RecentMatchRow key={i} {...m} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
