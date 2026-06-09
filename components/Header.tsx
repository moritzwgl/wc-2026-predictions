export default function Header() {
  return (
    <header className="relative text-center py-16 md:py-24 px-4 overflow-hidden header-glow">
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.2em] uppercase text-slate-500 mb-6 border border-gold/20 rounded-full px-4 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-dot" />
          Live · Gruppenphase 2026
        </div>

        <h1
          className="font-display text-gold-gradient leading-none mb-4"
          style={{ fontSize: "clamp(56px, 10vw, 100px)" }}
        >
          World Cup 2026
        </h1>

        <p className="text-slate-500 text-base md:text-xl tracking-widest uppercase font-light">
          Gruppenphase · Predictions &amp; Wettempfehlungen · 48 Teams
        </p>
      </div>
    </header>
  );
}
