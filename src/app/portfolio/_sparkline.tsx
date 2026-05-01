import type { PriceHistoryPoint } from "@/lib/portfolio/types";

export function Sparkline({
  history,
  positive,
  width = 200,
  height = 40,
}: {
  history: PriceHistoryPoint[];
  positive?: boolean;
  width?: number;
  height?: number;
}) {
  if (history.length < 2) {
    return (
      <div
        className="text-[10px] text-neutral-600"
        style={{ width, height, lineHeight: `${height}px`, textAlign: "center" }}
      >
        gathering data…
      </div>
    );
  }

  const prices = history.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const stepX = width / (history.length - 1);

  const pad = 2;
  const innerH = height - pad * 2;

  const points = history.map((p, i) => {
    const x = i * stepX;
    const y = pad + innerH - ((p.price - min) / span) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const fillPath = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;

  const stroke = positive ? "#34d399" : positive === false ? "#fb7185" : "#a3a3a3";
  const fill = positive ? "rgba(52,211,153,0.12)" : positive === false ? "rgba(251,113,133,0.12)" : "rgba(163,163,163,0.10)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Price sparkline"
    >
      <path d={fillPath} fill={fill} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
