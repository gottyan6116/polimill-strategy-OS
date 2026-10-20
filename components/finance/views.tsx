import { financialDefinitions } from "@/config/metrics";
import { presentation } from "@/config/presentation";
import { niceAxis, axisDigits, profitBar } from "@/lib/presentation";
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
  const reference = presentation.portfolio;
  const xa = niceAxis([...plotted.map(r=>r.metrics.revenueGrowth!),reference.growthReferencePercent],{padding:.2});
  const ya = niceAxis([...plotted.map(r=>r.metrics.roic!),reference.targetRoicPercent],{padding:.3});
  const x = (v:number)=>90+(v-xa.min)/(xa.max-xa.min)*620,
    y = (v:number)=>290-(v-ya.min)/(ya.max-ya.min)*240;
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
          {ya.ticks.map(v=><g key={v}><line x1="90" x2="710" y1={y(v)} y2={y(v)} stroke={v===0?presentation.chart.axis:presentation.chart.grid}/><text x="78" y={y(v)+4} textAnchor="end" fill={presentation.chart.text} fontSize="11">{number(v,axisDigits(ya.step))}%</text></g>)}
          {xa.ticks.map(v=><g key={v}><line x1={x(v)} x2={x(v)} y1="50" y2="290" stroke={v===0?presentation.chart.axis:presentation.chart.grid}/><text x={x(v)} y="311" textAnchor="middle" fill={presentation.chart.text} fontSize="11">{number(v,axisDigits(xa.step))}%</text></g>)}
          <line
            x1={x(reference.growthReferencePercent)}
            x2={x(reference.growthReferencePercent)}
            y1="40"
            y2="300"
            stroke={presentation.chart.axis}
            strokeDasharray="4 4"
          />
          <line
            x1="70"
            x2="720"
            y1={y(reference.targetRoicPercent)}
            y2={y(reference.targetRoicPercent)}
            stroke={presentation.chart.axis}
            strokeDasharray="4 4"
          />
          <text x="70" y="20" fill={presentation.chart.text} fontSize="12">
            ROIC
          </text>
          <text
            x="400"
            y="350"
            textAnchor="middle"
            fill={presentation.chart.text}
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
                r={Math.sqrt(Math.max(0,m.revenue) / maxRevenue) * 31}
                fill={unit.color}
                fillOpacity=".82"
                stroke="white"
                strokeWidth="3"
              />
              <text
                x={Math.max(90 + Math.min(300,unit.name.length*6),Math.min(710 - Math.min(300,unit.name.length*6),x(m.revenueGrowth!)))}
                y={Math.max(62,Math.min(280,y(m.roic!) - Math.sqrt(Math.max(0,m.revenue) / maxRevenue) * 31 - 9))}
                textAnchor="middle"
                textLength={unit.name.length > 50 ? 600 : undefined}
                lengthAdjust="spacingAndGlyphs"
                fill={presentation.chart.text}
                fontSize="12"
                fontWeight="600"
              >
                {unit.name}
              </text>
            </g>
          ))}
        </svg>
        <p className="finance-note">{reference.growthReferenceLabel} {percent(reference.growthReferencePercent)}{!reference.growthReferenceConfigured&&'（未設定・参考値）'} / {reference.targetRoicLabel} {percent(reference.targetRoicPercent)}{!reference.targetRoicConfigured&&'（未設定・参考値）'}。資本コスト（WACC）を示すものではありません。</p>
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
                <div className={`finance-profit-track ${rows.some(r=>r.metrics.nopat<0)?"is-signed":"is-positive"}`}>
                  <span
                    style={{
                      width: `${profitBar(m.nopat,rows.map(r=>r.metrics.nopat)).width}%`,
                      marginLeft: `${profitBar(m.nopat,rows.map(r=>r.metrics.nopat)).marginLeft}%`,
                      background: m.nopat < 0 ? presentation.chart.negative : unit.color,
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
            {financialDefinitions.roicDecomposition}
          </span>
        </div>
        <div className="roic-tree">
          <div className="roic-tree-root">
            <TreeNode
              root
              label="ROIC"
              value={percent(m.roic)}
              note={financialDefinitions.roic}
            />
          </div>
          <div className="roic-branches">
            <TreeNode
              label="NOPAT利益率"
              value={percent(m.nopatMargin)}
              note={financialDefinitions.nopatMargin}
            />
            <span className="roic-operator">×</span>
            <TreeNode
              label="投下資本回転率"
              value={times(m.capitalTurnover)}
              note={financialDefinitions.capitalTurnover}
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
                note={financialDefinitions.averageInvestedCapital}
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
        {financialDefinitions.nopat}
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
              color: presentation.series[0],
              values: history.map((h) => h.metrics.operatingMargin),
            },
            {
              name: "売上総利益率",
              color: presentation.series[1],
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
              color: presentation.series[1],
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
              color: presentation.series[1],
              values: history.map((h) => h.metrics.assetTurnover),
            },
            {
              name: "投下資本回転率",
              color: presentation.series[0],
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
              color: presentation.series[0],
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
              color: presentation.series[0],
              values: history.map((h) => h.metrics.operatingCf),
            },
            {
              name: "投資CF",
              type: "bar",
              color: presentation.series[2],
              values: history.map((h) => h.metrics.investingCf),
            },
            {
              name: "財務CF",
              type: "bar",
              color: presentation.series[1],
              values: history.map((h) => h.metrics.financingCf),
            },
            {
              name: "フリーCF",
              type: "line",
              color: presentation.series[3],
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
        {financialDefinitions.freeCashFlow}
      </p>
    </>
  );
}
