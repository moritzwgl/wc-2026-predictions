const CONF_COLORS = {
  high: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/25" },
  medium: { bg: "bg-gold/15", text: "text-gold-light", border: "border-gold/25" },
  low: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/25" },
};
const CONF_LABELS = { high: "HOCH", medium: "MITTEL", low: "NIEDRIG" };

export default function ConfBadge({ conf }: { conf: "high" | "medium" | "low" }) {
  const c = CONF_COLORS[conf] ?? CONF_COLORS.low;
  return (
    <span
      className={`font-mono text-xs md:text-sm font-semibold px-2 py-0.5 rounded ${c.bg} ${c.text} border ${c.border} shrink-0`}
    >
      {CONF_LABELS[conf]}
    </span>
  );
}
