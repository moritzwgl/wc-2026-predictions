export default function FlagIcon({ emoji, className = "" }: { emoji: string; className?: string }) {
  if (!emoji || emoji === "🏴") {
    return <span className={className}>{emoji || "🏴"}</span>;
  }

  // Convert emoji string to twemoji hex format
  const hexCode = Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join("-");

  const cleanHex = hexCode.replace(/-fe0f/g, "");
  const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${cleanHex}.svg`;

  return (
    <img
      src={url}
      alt={emoji}
      className={`inline-block object-contain ${className}`}
      loading="lazy"
      draggable={false}
    />
  );
}
