import type {
  BusinessUnit,
  FinanceRecord,
  FinanceMetrics,
} from "@/lib/finance";
import { money, number, percent, times } from "./format";
import { SeriesChart, CashBridge } from "./charts";
export type UnitResult = {
  unit: BusinessUnit;
  record: FinanceRecord;
  metrics: FinanceMetrics;
};
export type YearResult = { year: number; metrics: FinanceMetrics };
export function PortfolioView({
  rows,
  onSelect,
}: {
  rows: UnitResult[];
  onSelect: (id: string) => void;
}) {
  const plotted = rows.filter(
    (r) => r.metrics.revenueGrowth !== null && r.metrics.roic !== null,
  );
  const maxRevenue = Math.max(1, ...rows.map((r) => r.metrics.revenue));
  const xlo = Math.min(-5, ...plotted.map((r) => r.metrics.revenueGrowth!)) - 5,
    xhi = Math.max(20, ...plotted.map((r) => r.metrics.revenueGrowth!)) + 10;
  const ylo = Math.min(0, ...plotted.map((r) => r.metrics.roic!)) - 8,
    yhi = Math.max(15, ...plotted.map((r) => r.metrics.roic!)) + 12;
  const x = (v: number) => 70 + ((v - xlo) / (xhi - xlo)) * 650,
    y = (v: number) => 300 - ((v - ylo) / (yhi - ylo)) * 260;
  const sum = rows.reduce((n, r) => n + r.metrics.revenue, 0);
  return (
    <>
      <section className="panel finance-portfolio">
        <div className="panel-heading">
          <h2>事業ポートフォリオ</h2>
          <span className="muted small">円の面積＝売上高 · 選択してROICへ</span>
        </div>
        <svg
          viewBox="0 0 800 360"
          className="portfolio-chart"
          role="group"
          aria-label="事業別の売上成長率とROICのバブルチャート"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line
                x1="70"
                x2="720"
                y1={40 + 260 * t}
                y2={40 + 260 * t}
                stroke="#e5edf3"
              />
              <line
                x1={70 + 650 * t}
                x2={70 + 650 * t}
                y1="40"
                y2="300"
                stroke="#edf2f6"
              />
              <text
                x="58"
                y={44 + 260 * t}
                textAnchor="end"
                fill="#718297"
                fontSize="11"
              >
                {number(yhi - (yhi - ylo) * t, 0)}%
              </text>
              <text
                x={70 + 650 * t}
                y="321"
                textAnchor="middle"
                fill="#718297"
                fontSize="11"
              >
                {number(xlo + (xhi - xlo) * t, 0)}%
              </text>
            </g>
          ))}
          <line
            x1={x(0)}
            x2={x(0)}
            y1="40"
            y2="300"
            stroke="#a7b9c9"
            strokeDasharray="4 4"
          />
          <line
            x1="70"
            x2="720"
            y1={y(0)}
            y2={y(0)}
            stroke="#a7b9c9"
            strokeDasharray="4 4"
          />
          <text x="70" y="20" fill="#536b80" fontSize="12">
            ROIC
          </text>
          <text
            x="400"
            y="350"
            textAnchor="middle"
            fill="#536b80"
            fontSize="12"
          >
            売上高成長率（前年度比）
          </text>
          {plotted.map(({ unit, metrics: m }) => (
            <g
              key={unit.id}
              role="button"
              tabIndex={0}
              aria-label={`${unit.name}のROICを見る`}
              onClick={() => onSelect(unit.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(unit.id);
                }
              }}
              className="portfolio-bubble"
            >
              <title>
                {unit.name}: 成長率 {percent(m.revenueGrowth)} / ROIC{" "}
                {percent(m.roic)} / 売上 {money(m.revenue)}百万円
              </title>
              <circle
                cx={x(m.revenueGrowth!)}
                cy={y(m.roic!)}
                r={Math.sqrt(m.revenue / maxRevenue) * 31}
                fill={unit.color}
                fillOpacity=".82"
                stroke="white"
                strokeWidth="3"
              />
              <text
                x={x(m.revenueGrowth!)}
                y={y(m.roic!) - Math.sqrt(m.revenue / maxRevenue) * 31 - 9}
                textAnchor="middle"
                fill="#304b63"
                fontSize="12"
                fontWeight="600"
              >
                {unit.name}
              </text>
            </g>
          ))}
        </svg>
        {!plotted.length && (
          <p className="empty">
            比較できる前年度がないため、バブルは表示していません。別の年度を選んでください。
          </p>
        )}
      </section>
      <div className="finance-two-col">
        <section className="panel">
          <div className="panel-heading">
            <h2>売上高の構成</h2>
            <span className="muted small">百万円</span>
          </div>
          <div className="finance-share">
            {rows.map(({ unit, metrics: m }) => (
              <div key={unit.id}>
                <div>
                  <strong>{unit.name}</strong>
                  <span>
                    {money(m.revenue)}{" "}
                    <small>
                      {sum > 0 ? percent((m.revenue / sum) * 100) : "—"}
                    </small>
                  </span>
                </div>
                <div className="finance-share-track">
                  <span
                    style={{
                      width: `${sum > 0 ? (m.revenue / sum) * 100 : 0}%`,
                      background: unit.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>事業別の税引後営業利益</h2>
            <span className="muted small">NOPAT · 百万円</span>
          </div>
          <div className="finance-share">
            {rows.map(({ unit, metrics: m }) => (
              <div key={unit.id}>
                <div>
                  <strong>{unit.name}</strong>
                  <span className={m.nopat < 0 ? "finance-negative" : ""}>
                    {money(m.nopat)}
                  </span>
                </div>
                <div className="finance-profit-track">
                  <span
                    style={{
                      width: `${(Math.abs(m.nopat) / Math.max(1, ...rows.map((r) => Math.abs(r.metrics.nopat)))) * 50}%`,
                      marginLeft:
                        m.nopat < 0
                          ? `${50 - (Math.abs(m.nopat) / Math.max(1, ...rows.map((r) => Math.abs(r.metrics.nopat)))) * 50}%`
                          : "50%",
                      background: m.nopat < 0 ? "#ca7658" : unit.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>事業比較</h2>
        </div>
        <div className="table-scroll">
          <table className="finance-table">
            <thead>
              <tr>
                <th>事業</th>
                <th>売上高</th>
                <th>成長率</th>
                <th>営業利益率</th>
                <th>ROIC</th>
                <th>内訳</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ unit, metrics: m }) => (
                <tr key={unit.id}>
                  <td>
                    <i style={{ background: unit.color }} />
                    {unit.name}
                  </td>
                  <td>{money(m.revenue)}</td>
                  <td>{percent(m.revenueGrowth)}</td>
                  <td>{percent(m.operatingMargin)}</td>
                  <td>{percent(m.roic)}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => onSelect(unit.id)}
                    >
                      ROICを見る<span className="sr-only">：{unit.name}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function TreeNode({
  label,
  value,
  note,
  root = false,
}: {
  label: string;
  value: string;
  note: string;
  root?: boolean;
}) {
  return (
    <div className={`roic-node ${root ? "roic-root" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
export function RoicView({
  m,
  records,
}: {
  m: FinanceMetrics;
  records: FinanceRecord[];
}) {
  const rec = records.reduce((n, r) => n + r.receivables, 0),
    inventory = records.reduce((n, r) => n + r.inventory, 0),
    payables = records.reduce((n, r) => n + r.payables, 0),
    fixed = records.reduce((n, r) => n + r.fixed_assets, 0);
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <h2>ROICツリー</h2>
          <span className="muted small">
            ROIC ＝ NOPAT利益率 × 投下資本回転率
          </span>
        </div>
        <div className="roic-tree">
          <div className="roic-tree-root">
            <TreeNode
              root
              label="ROIC"
              value={percent(m.roic)}
              note="税引後営業利益 ÷ 平均投下資本"
            />
          </div>
          <div className="roic-branches">
            <TreeNode
              label="NOPAT利益率"
              value={percent(m.nopatMargin)}
              note="NOPAT ÷ 売上高"
            />
            <span className="roic-operator">×</span>
            <TreeNode
              label="投下資本回転率"
              value={times(m.capitalTurnover)}
              note="売上高 ÷ 平均投下資本"
            />
          </div>
          <div className="roic-drivers">
            <div>
              <TreeNode
                label="税引後営業利益（NOPAT）"
                value={`${money(m.nopat)} 百万円`}
                note={`営業利益 ${money(m.operatingProfit)} − 想定営業税額 ${money(m.operatingTax)}`}
              />
              <TreeNode
                label="売上高"
                value={`${money(m.revenue)} 百万円`}
                note={`売上原価 ${money(m.costOfSales)} / 販管費 ${money(m.sga)}`}
              />
            </div>
            <div>
              <TreeNode
                label="平均投下資本"
                value={`${money(m.averageInvestedCapital)} 百万円`}
                note="期首投下資本と期末投下資本の平均"
              />
              <TreeNode
                label="期末投下資本"
                value={`${money(m.investedCapital)} 百万円`}
                note={`運転資本 ${money(m.workingCapital)} ＋ 営業固定資産 ${money(fixed)}`}
              />
            </div>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>投下資本の内訳</h2>
          <span className="muted small">百万円</span>
        </div>
        <div className="finance-driver-row">
          {[
            ["売上債権", rec],
            ["棚卸資産", inventory],
            ["仕入債務（控除）", -payables],
            ["営業固定資産", fixed],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{money(Number(value))}</strong>
            </div>
          ))}
        </div>
      </section>
      <p className="finance-note">
        税引後営業利益は「営業利益 − max(営業利益, 0) ×
        想定税率」の簡便計算です。赤字の税効果は見込まず、投下資本から現預金を除いています。全社は各事業の利益・資本を合算して算出します。
      </p>
    </>
  );
}
export function IndicatorsView({
  history,
  m,
}: {
  history: YearResult[];
  m: FinanceMetrics;
}) {
  const labels = history.map((h) => `${h.year}年度`);
  return (
    <div className="finance-indicators">
      <section className="panel">
        <div className="panel-heading">
          <h2>収益性</h2>
          <strong>
            {percent(m.operatingMargin)}
            <small> 営業利益率</small>
          </strong>
        </div>
        <SeriesChart
          labels={labels}
          label="営業利益率と売上総利益率の推移"
          unit="%"
          series={[
            {
              name: "営業利益率",
              color: "#1aada5",
              values: history.map((h) => h.metrics.operatingMargin),
            },
            {
              name: "売上総利益率",
              color: "#4a86c5",
              values: history.map((h) => h.metrics.grossMargin),
            },
          ]}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>成長性</h2>
          <strong>
            {percent(m.revenueGrowth)}
            <small> 売上高成長率</small>
          </strong>
        </div>
        <SeriesChart
          labels={labels}
          label="年度別売上高の推移"
          unit="百万円"
          series={[
            {
              name: "売上高",
              color: "#4a86c5",
              type: "bar",
              values: history.map((h) => h.metrics.revenue),
            },
          ]}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>効率性</h2>
          <strong>
            {times(m.assetTurnover)}
            <small> 総資産回転率</small>
          </strong>
        </div>
        <SeriesChart
          labels={labels}
          label="総資産回転率と投下資本回転率の推移"
          unit="回"
          series={[
            {
              name: "総資産回転率",
              color: "#4a86c5",
              values: history.map((h) => h.metrics.assetTurnover),
            },
            {
              name: "投下資本回転率",
              color: "#1aada5",
              values: history.map((h) => h.metrics.capitalTurnover),
            },
          ]}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>安全性</h2>
          <strong>
            {percent(m.equityRatio)}
            <small> 自己資本比率</small>
          </strong>
        </div>
        <SeriesChart
          labels={labels}
          label="自己資本比率の推移"
          unit="%"
          series={[
            {
              name: "自己資本比率",
              color: "#1aada5",
              values: history.map((h) => h.metrics.equityRatio),
            },
          ]}
        />
        <p className="finance-safety">
          選択年度の流動比率 <strong>{percent(m.currentRatio)}</strong>
        </p>
      </section>
      <section className="panel finance-wide">
        <div className="panel-heading">
          <h2>年度別の財務指標</h2>
        </div>
        <div className="table-scroll">
          <table className="finance-table">
            <thead>
              <tr>
                <th>年度</th>
                <th>売上高</th>
                <th>営業利益率</th>
                <th>成長率</th>
                <th>総資産回転率</th>
                <th>自己資本比率</th>
                <th>流動比率</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.year}>
                  <td>{h.year}</td>
                  <td>{money(h.metrics.revenue)}</td>
                  <td>{percent(h.metrics.operatingMargin)}</td>
                  <td>{percent(h.metrics.revenueGrowth)}</td>
                  <td>{times(h.metrics.assetTurnover)}</td>
                  <td>{percent(h.metrics.equityRatio)}</td>
                  <td>{percent(h.metrics.currentRatio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
export function CashflowView({
  history,
  m,
}: {
  history: YearResult[];
  m: FinanceMetrics;
}) {
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <h2>現預金の増減</h2>
          <span className="muted small">選択年度 · 百万円</span>
        </div>
        <CashBridge metrics={m} />
        <div className="finance-cash-equation">
          期首 {money(m.openingCash)} ＋ 営業 {money(m.operatingCf)} ＋ 投資{" "}
          {money(m.investingCf)} ＋ 財務 {money(m.financingCf)} ＝ 期末{" "}
          {money(m.closingCash)}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>キャッシュフローの推移</h2>
          <span className="muted small">棒：活動別CF / 線：フリーCF</span>
        </div>
        <SeriesChart
          labels={history.map((h) => `${h.year}年度`)}
          label="営業・投資・財務CFとフリーCFの年度推移"
          unit="百万円"
          series={[
            {
              name: "営業CF",
              type: "bar",
              color: "#1aada5",
              values: history.map((h) => h.metrics.operatingCf),
            },
            {
              name: "投資CF",
              type: "bar",
              color: "#d8934a",
              values: history.map((h) => h.metrics.investingCf),
            },
            {
              name: "財務CF",
              type: "bar",
              color: "#4a86c5",
              values: history.map((h) => h.metrics.financingCf),
            },
            {
              name: "フリーCF",
              type: "line",
              color: "#173952",
              values: history.map((h) => h.metrics.freeCashFlow),
            },
          ]}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>キャッシュフロー明細</h2>
          <span className="muted small">百万円</span>
        </div>
        <div className="table-scroll">
          <table className="finance-table">
            <thead>
              <tr>
                <th>年度</th>
                <th>期首現預金</th>
                <th>営業CF</th>
                <th>投資CF</th>
                <th>財務CF</th>
                <th>フリーCF</th>
                <th>期末現預金</th>
              </tr>
            </thead>
            <tbody>
              {history.map(({ year, metrics: v }) => (
                <tr key={year}>
                  <td>{year}</td>
                  <td>{money(v.openingCash)}</td>
                  <td>{money(v.operatingCf)}</td>
                  <td>{money(v.investingCf)}</td>
                  <td>{money(v.financingCf)}</td>
                  <td>{money(v.freeCashFlow)}</td>
                  <td>{money(v.closingCash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="finance-note">
        フリーCF ＝ 営業CF ＋
        投資CF。この試算では為替換算差額を見込まず、営業・投資・財務CFの合計を現預金の増減としています。
      </p>
    </>
  );
}
