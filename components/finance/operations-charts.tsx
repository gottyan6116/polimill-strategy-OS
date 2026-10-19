import {
  monthLabel,
  expenseCategories,
  monthlyTotals,
  roundMoney,
  type MonthFields,
} from "@/lib/operations";
import { preciseMoney as money, number } from "./format";
export function MonthBars({
  rows,
  profit = false,
}: {
  rows: MonthFields[];
  profit?: boolean;
}) {
  const values = rows.map((r) =>
    profit ? monthlyTotals([r]).operatingProfit : r.revenue,
  );
  const lo = Math.min(0, ...values),
    hi = Math.max(1, ...values);
  const span = hi - lo;
  const min = lo < 0 ? lo - span * 0.12 : 0,
    max = hi + span * 0.15;
  const y = (v: number) => 20 + ((max - v) / (max - min)) * 165;
  return (
    <svg
      className="ops-month-chart"
      viewBox="0 0 600 235"
      role="img"
      aria-label={
        profit
          ? "4月から翌年3月の月別営業損益。黒字は青、赤字は赤。"
          : "4月から翌年3月の月別売上高"
      }
    >
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const v = min + (max - min) * t;
        return (
          <g key={t}>
            <line x1="44" x2="584" y1={y(v)} y2={y(v)} stroke="#e8eef3" />
            <text
              x="35"
              y={y(v) + 3}
              textAnchor="end"
              fill="#8596a6"
              fontSize="10"
            >
              {number(v, 0)}
            </text>
          </g>
        );
      })}
      <line x1="44" x2="584" y1={y(0)} y2={y(0)} stroke="#c4d3df" />
      {values.map((value, i) => (
        <g key={i}>
          <rect
            x={54 + i * 44}
            y={Math.min(y(value), y(0))}
            width="19"
            height={Math.max(value === 0 ? 0 : 1, Math.abs(y(value) - y(0)))}
            rx="1.5"
            fill={value < 0 ? "#d57b80" : "#4a86c5"}
          >
            <title>
              {monthLabel(i)}：{money(value)}百万円
            </title>
          </rect>
          <text
            x={63 + i * 44}
            y="211"
            textAnchor="middle"
            fill="#7d90a1"
            fontSize="10"
          >
            {monthLabel(i)}
          </text>
        </g>
      ))}
    </svg>
  );
}
export function ExpenseDonut({ rows }: { rows: MonthFields[] }) {
  const entries = expenseCategories.map((c) => ({
      ...c,
      value: roundMoney(rows.reduce((n, r) => n + r[c.key], 0)),
    })),
    total = monthlyTotals(rows).expenses,
    circ = 2 * Math.PI * 58;
  let offset = 0;
  return (
    <div className="ops-expense-layout">
      <div className="ops-expense-legend">
        {entries.map((c) => (
          <div key={c.key}>
            <i style={{ background: c.color }} />
            <span>
              {c.label}
              <strong>{money(c.value)}</strong>
            </span>
            <small>
              {total > 0 ? number((c.value / total) * 100) : "—"}
              {total > 0 ? "%" : ""}
            </small>
          </div>
        ))}
      </div>
      <svg
        viewBox="0 0 180 180"
        className="ops-donut"
        role="img"
        aria-label={`費用内訳、合計${money(total)}百万円。${entries.map((c) => `${c.label}${money(c.value)}百万円`).join("、")}`}
      >
        <circle
          cx="90"
          cy="90"
          r="58"
          fill="none"
          stroke="#ecf1f4"
          strokeWidth="27"
        />
        {total > 0 &&
          entries.map((c) => {
            const length = (c.value / total) * circ,
              start = offset;
            offset += length;
            return (
              <circle
                key={c.key}
                cx="90"
                cy="90"
                r="58"
                fill="none"
                stroke={c.color}
                strokeWidth="27"
                strokeDasharray={`${length} ${circ - length}`}
                strokeDashoffset={-start}
                transform="rotate(-90 90 90)"
              >
                <title>
                  {c.label}：{money(c.value)}百万円
                </title>
              </circle>
            );
          })}
        <text x="90" y="86" textAnchor="middle" fontSize="11" fill="#8b9caa">
          費用構成
        </text>
        <text
          x="90"
          y="109"
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill="#25455d"
        >
          {total > 0 ? "100%" : "—"}
        </text>
      </svg>
    </div>
  );
}
