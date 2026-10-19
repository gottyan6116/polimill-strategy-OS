import type { FinanceMetrics } from "@/lib/finance";
import { money, number } from "./format";
type Series = {
  name: string;
  color: string;
  values: (number | null)[];
  type?: "bar" | "line";
};
export function SeriesChart({
  labels,
  series,
  label,
  unit,
}: {
  labels: string[];
  series: Series[];
  label: string;
  unit: string;
}) {
  const values = series
    .flatMap((s) => s.values)
    .filter((v): v is number => v !== null);
  const lo = Math.min(0, ...values);
  const hi = Math.max(1, ...values);
  const pad = (hi - lo) * 0.12;
  const min = lo < 0 ? lo - pad : 0,
    max = hi + pad;
  const w = 650,
    h = 230,
    left = 55,
    right = 20,
    top = 20,
    bottom = 38;
  const y = (v: number) => top + ((max - v) / (max - min)) * (h - top - bottom);
  const group = (w - left - right) / Math.max(labels.length, 1);
  const x = (i: number) => left + group * (i + 0.5);
  const bars = series.filter((s) => s.type === "bar");
  const bw = Math.min(34, (group * 0.65) / Math.max(bars.length, 1));
  return (
    <>
      <div className="finance-chart-unit">{unit}</div>
      <svg
        className="finance-series"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={label}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const v = min + (max - min) * t;
          return (
            <g key={t}>
              <line
                x1={left}
                x2={w - right}
                y1={y(v)}
                y2={y(v)}
                stroke="#e6edf2"
              />
              <text
                x={left - 10}
                y={y(v) + 4}
                textAnchor="end"
                fontSize={10}
                fill="#718297"
              >
                {number(v, Math.abs(hi) < 10 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        <line x1={left} x2={w - right} y1={y(0)} y2={y(0)} stroke="#a8b8c7" />
        {series.map((s) => (
          <g key={s.name}>
            {s.type === "bar" ? (
              s.values.map((v, i) =>
                v === null ? null : (
                  <rect
                    key={i}
                    x={
                      x(i) +
                      (bars.indexOf(s) - (bars.length - 1) / 2) * bw -
                      bw * 0.43
                    }
                    y={Math.min(y(v), y(0))}
                    width={bw * 0.86}
                    height={Math.max(1, Math.abs(y(v) - y(0)))}
                    fill={s.color}
                    rx={2}
                  />
                ),
              )
            ) : (
              <>
                {s.values.map((v, i) =>
                  v !== null && i > 0 && s.values[i - 1] !== null ? (
                    <line
                      key={`l${i}`}
                      x1={x(i - 1)}
                      x2={x(i)}
                      y1={y(s.values[i - 1]!)}
                      y2={y(v)}
                      stroke={s.color}
                      strokeWidth={2.5}
                    />
                  ) : null,
                )}
                {s.values.map((v, i) =>
                  v === null ? null : (
                    <circle
                      key={i}
                      cx={x(i)}
                      cy={y(v)}
                      r={4}
                      fill={s.color}
                      stroke="white"
                      strokeWidth={1.5}
                    />
                  ),
                )}
              </>
            )}
          </g>
        ))}
        {labels.map((l, i) => (
          <text
            key={l}
            x={x(i)}
            y={h - 12}
            textAnchor="middle"
            fill="#718297"
            fontSize={11}
          >
            {l}
          </text>
        ))}
      </svg>
      <div className="finance-legend">
        {series.map((s) => (
          <span key={s.name}>
            <i style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </>
  );
}
export function CashBridge({ metrics: m }: { metrics: FinanceMetrics }) {
  const entries = [
    { label: "期首現預金", value: m.openingCash, total: true },
    { label: "営業CF", value: m.operatingCf },
    { label: "投資CF", value: m.investingCf },
    { label: "財務CF", value: m.financingCf },
    { label: "期末現預金", value: m.closingCash, total: true },
  ];
  let balance = 0;
  const steps = entries.map((e, i) => {
    const start = e.total ? 0 : balance;
    const end = e.total ? e.value : balance + e.value;
    balance = end;
    return { ...e, start, end };
  });
  const lo = Math.min(0, ...steps.flatMap((s) => [s.start, s.end]));
  const hi = Math.max(1, ...steps.flatMap((s) => [s.start, s.end]));
  const w = 720,
    h = 255,
    left = 25,
    plot = 175;
  const y = (v: number) => 35 + ((hi - v) / (hi - lo)) * plot;
  const x = (i: number) => left + i * 140;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="cash-bridge"
      role="img"
      aria-label={`期首現預金${money(m.openingCash)}、営業CF${money(m.operatingCf)}、投資CF${money(m.investingCf)}、財務CF${money(m.financingCf)}、期末現預金${money(m.closingCash)}百万円`}
    >
      <line x1="15" x2="710" y1={y(0)} y2={y(0)} stroke="#cfdae3" />
      {steps.map((s, i) => (
        <g key={s.label}>
          <rect
            x={x(i)}
            y={Math.min(y(s.start), y(s.end))}
            width="95"
            height={Math.max(2, Math.abs(y(s.end) - y(s.start)))}
            rx="4"
            fill={s.total ? "#163752" : s.value >= 0 ? "#23b4a9" : "#d99651"}
          />
          <text
            x={x(i) + 47.5}
            y={Math.min(y(s.start), y(s.end)) - 10}
            textAnchor="middle"
            fill="#29435b"
            fontSize="13"
            fontWeight="650"
          >
            {!s.total && s.value > 0 ? "+" : ""}
            {money(s.value)}
          </text>
          <text
            x={x(i) + 47.5}
            y="239"
            textAnchor="middle"
            fill="#718297"
            fontSize="12"
          >
            {s.label}
          </text>
          {i < steps.length - 1 && (
            <line
              x1={x(i) + 95}
              x2={x(i + 1)}
              y1={y(s.end)}
              y2={y(s.end)}
              stroke="#b6c6d3"
              strokeDasharray="4 3"
            />
          )}
        </g>
      ))}
    </svg>
  );
}
