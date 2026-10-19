import type { Kpi, Workspace } from "@/lib/model";
export default function TrendChart({
  kpi,
  history,
}: {
  kpi: Kpi;
  history: Workspace["history"];
}) {
  const points = history.filter((h) => h.kpi_id === kpi.id);
  const max =
    Math.max(kpi.target, kpi.actual, ...points.map((p) => p.value), 1) * 1.1;
  const width = 560,
    height = 170;
  const x = (i: number) =>
    42 + (i * (width - 64)) / Math.max(1, points.length - 1);
  const y = (v: number) => height - 26 - (v / max) * (height - 42);
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  return (
    <svg
      className="trend-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${kpi.name}の月次推移。現在値${kpi.actual}${kpi.unit}、目標${kpi.target}${kpi.unit}`}
    >
      <defs>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#25b3ab" stopOpacity=".20" />
          <stop offset="100%" stopColor="#25b3ab" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((n) => (
        <g key={n}>
          <line
            x1={42}
            x2={width - 15}
            y1={y(max * n)}
            y2={y(max * n)}
            stroke="#e8eef3"
          />
          <text
            x={30}
            y={y(max * n) + 4}
            textAnchor="end"
            fill="#7d8b9d"
            fontSize={10}
          >
            {Math.round(max * n).toLocaleString()}
          </text>
        </g>
      ))}
      <line
        x1={42}
        x2={width - 15}
        y1={y(kpi.target)}
        y2={y(kpi.target)}
        stroke="#a4b3c1"
        strokeDasharray="4 4"
      />
      <text
        x={width - 15}
        y={y(kpi.target) - 5}
        textAnchor="end"
        fill="#6c7c8e"
        fontSize={10}
      >
        目標 {kpi.target.toLocaleString()}
      </text>
      {points.length > 0 && (
        <>
          <polygon
            points={`${x(0)},${height - 26} ${line} ${x(points.length - 1)},${height - 26}`}
            fill="url(#chart-fill)"
          />
          <polyline
            points={line}
            fill="none"
            stroke="#15a9a2"
            strokeWidth={2.5}
          />
          {points.map((p, i) => (
            <g key={p.month}>
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={3.4}
                fill="#15a9a2"
                stroke="white"
                strokeWidth={1.5}
              />
              <text
                x={x(i)}
                y={height - 7}
                textAnchor="middle"
                fill="#7d8b9d"
                fontSize={10}
              >
                {Number(p.month.slice(5))}月
              </text>
            </g>
          ))}
        </>
      )}
      {!points.length && (
        <text x="260" y="95" textAnchor="middle" fill="#7d8b9d">
          月次データはありません
        </text>
      )}
    </svg>
  );
}
