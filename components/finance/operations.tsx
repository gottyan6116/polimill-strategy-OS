"use client";
import "./operations.css";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { FinanceRecord, FinanceWorkspace } from "@/lib/finance";
import {
  japanDate,
  monthFieldsSchema,
  monthlyTotals,
  summarizeInvoices,
  toYen,
  fromYen,
  type MonthFields,
  type Invoice,
} from "@/lib/operations";
import { MonthBars, ExpenseDonut } from "./operations-charts";
import MonthDetails from "./month-details";
import InvoiceDetails, { type InvoiceFilter } from "./invoice-details";
import { preciseMoney as money } from "./format";
import {presentation} from '@/config/presentation';
import {managementConfig} from '@/config/management';
const statuses = [
  { key: "overdue", label: "期限超過", color: presentation.chart.negative },
  { key: "undated", label: "期日未設定", color: presentation.chart.budget },
  { key: "upcoming", label: "期日前・当日", color: presentation.chart.forecast },
] as const;
export default function OperationsOverview({
  data,
  periods,
  onSaved,
  initialInvoiceId,
}: {
  data: FinanceWorkspace;
  periods: FinanceRecord[];
  onSaved: () => Promise<void>;
  initialInvoiceId?:string;
}) {
  const [asOf, setAsOf] = useState(japanDate),
    [cumulative,setCumulative]=useState(false),
    [monthsOpen, setMonthsOpen] = useState(false),
    [details, setDetails] = useState<{
      kind: Invoice["kind"];
      filter: InvoiceFilter;
    } | null>(()=>{const invoice=data.invoices.find(i=>i.id===initialInvoiceId);return invoice?{kind:invoice.kind,filter:'all'}:null});
  const ids = new Set(periods.map((p) => p.id)),
    rows = data.months.filter((m) => ids.has(m.finance_period_id)),
    invoices = data.invoices.filter((i) => ids.has(i.finance_period_id)),
    totals = monthlyTotals(rows);
  const keys = Object.keys(monthFieldsSchema.shape) as (keyof MonthFields)[];
  const byMonth = Array.from(
    { length: 12 },
    (_, i) =>
      Object.fromEntries(
        keys.map((k) => [
          k,
          fromYen(
            rows
              .filter((r) => r.month_index === i)
              .reduce((n, r) => n + toYen(r[k]), 0),
          ),
        ]),
      ) as MonthFields,
  );
  const ready =
    periods.length > 0 &&
    periods.every(
      (p) => rows.filter((r) => r.finance_period_id === p.id).length === 12,
    );
  const observations=data.management?.values??[];
  function monthlySeries(profit=false,scenario:'budget'|'forecast'='forecast'){
    const fields=profit?keys:['revenue'] as (keyof MonthFields)[];
    return Array.from({length:12},(_,index)=>{
      const selected=rows.filter(m=>m.month_index===index);
      if(selected.length!==periods.length)return null;
      let total=0;
      for(const month of selected){let value=0;for(const metric of fields){const p=observations.find(p=>p.entity_type==='finance_month'&&p.entity_id===month.id&&p.metric===metric&&p.scenario===scenario);if(p?.value==null)return null;value+=toYen(p.value)*(profit&&metric!=='revenue'?-1:1)}total+=value;}
      return fromYen(total);
    });
  }
  function closedMonths(profit=false){const fields=profit?keys:['revenue'] as (keyof MonthFields)[];return Array.from({length:12},(_,index)=>{const months=rows.filter(m=>m.month_index===index);return months.length===periods.length&&months.every(m=>fields.every(metric=>observations.some(p=>p.entity_type==='finance_month'&&p.entity_id===m.id&&p.metric===metric&&p.scenario==='actual'&&p.is_closed)))});}
  if (!ready)
    return (
      <section className="panel finance-loading">
        選択中の事業・年度の月次データが揃っていません。
      </section>
    );
  function detailsButton(name: string, onClick: () => void) {
    return (
      <button className="ops-detail-button" aria-label={name} onClick={onClick}>
        詳細
        <ExternalLink size={12} />
      </button>
    );
  }
  function invoiceCard(kind: Invoice["kind"]) {
    const summary = summarizeInvoices(
      invoices.filter((i) => i.kind === kind),
      data.settlements,
      asOf,
    );
    const label = kind === "receivable" ? "入金管理" : "支払管理";
    return (
      <section className={`panel ops-invoice-card ${summary.overdue>managementConfig.overdueWarningMillion?'ops-warning':''}`}>
        <div className="panel-heading">
          <h2>{label}</h2>
          {detailsButton(`${label}の明細を見る`, () =>
            setDetails({ kind, filter: "open" }),
          )}
        </div>
        <div className="ops-card-body">
          <p className="ops-card-caption">
            未{kind === "receivable" ? "入金" : "払"}残高 · {summary.count}件
          </p>
          <strong className="ops-card-value">
            {money(summary.total)}
            <small>百万円</small>
          </strong>
          <p className="ops-warning-note">期限超過 <strong className="ops-overdue-amount">{money(summary.overdue)}</strong> 百万円</p>
          <div
            className="ops-stacked-bar"
            role="img"
            aria-label={`${label}の残高内訳。${statuses.map((s) => `${s.label}${money(summary[s.key])}百万円`).join("、")}`}
          >
            {statuses.map((s) => (
              <span
                key={s.key}
                style={{
                  width: `${summary.total > 0 ? (summary[s.key] / summary.total) * 100 : 0}%`,
                  background: s.color,
                }}
              />
            ))}
          </div>
          <div className="ops-balance-legend">
            {statuses.map((s) => (
              <button
                key={s.key}
                onClick={() => setDetails({ kind, filter: s.key })}
                aria-label={`${label}の${s.label}を表示`}
              >
                <i style={{ background: s.color }} />
                <span>{s.label}</span>
                <strong>{money(summary[s.key])}</strong>
              </button>
            ))}
          </div>
          <p className="ops-basis">基準日 {asOf}</p>
        </div>
      </section>
    );
  }
  return (
    <div className="ops-workspace">
      <div className="ops-caption-row">
        <p>4月〜翌年3月の月次仮説と、請求明細の残高を確認できます。</p>
        <label>
          入出金の基準日
          <input
            aria-label="入出金の基準日"
            type="date"
            value={asOf}
            required
            onChange={(e) => {
              if (e.target.validity.valid && e.target.value)
                setAsOf(e.target.value);
            }}
          />
        </label>
      </div>
      <div className="ops-chart-mode" aria-label="月次グラフの集計"><button aria-pressed={!cumulative} onClick={()=>setCumulative(false)}>単月</button><button aria-pressed={cumulative} onClick={()=>setCumulative(true)}>累計</button><span>単位：百万円。濃色＝締め済み実績 / 淡色＝見込み / 点線＝予算</span></div>
      <p className="ops-unset-note">未締めの月は見込みを表示します。見込み・予算が未設定の月は描画しません。既存の未締め仮実績は、合計と月次明細に保存しています。</p>
      <div className="ops-grid">
        <section className="panel ops-profit">
          <div className="panel-heading">
            <h2>営業損益</h2>
            {detailsButton("営業損益の月次明細を見る", () =>
              setMonthsOpen(true),
            )}
          </div>
          <div className="ops-card-body">
            <p className="ops-card-caption">選択年度の合計（12か月の仮説）</p>
            <strong
              className={`ops-card-value ${totals.operatingProfit < 0 ? "finance-negative" : ""}`}
            >
              {money(totals.operatingProfit)}
              <small>百万円</small>
            </strong>
            <MonthBars rows={byMonth} profit closed={closedMonths(true)} forecast={monthlySeries(true)} budget={monthlySeries(true,'budget')} cumulative={cumulative}/>
          </div>
        </section>
        <section className="panel ops-revenue">
          <div className="panel-heading">
            <h2>収益（売上高）</h2>
            {detailsButton("収益の月次明細を見る", () => setMonthsOpen(true))}
          </div>
          <div className="ops-card-body">
            <p className="ops-card-caption">選択年度の合計（12か月の仮説）</p>
            <strong className="ops-card-value">
              {money(totals.revenue)}
              <small>百万円</small>
            </strong>
            <MonthBars rows={byMonth} closed={closedMonths()} forecast={monthlySeries()} budget={monthlySeries(false,'budget')} cumulative={cumulative}/>
          </div>
        </section>
        <div className="ops-payments">
          {invoiceCard("receivable")}
          {invoiceCard("payable")}
        </div>
        <section className="panel ops-expenses">
          <div className="panel-heading">
            <h2>費用</h2>
            {detailsButton("費用の月次明細を見る", () => setMonthsOpen(true))}
          </div>
          <div className="ops-card-body">
            <p className="ops-card-caption">選択年度の合計（12か月の仮説）</p>
            <strong className="ops-card-value">
              {money(totals.expenses)}
              <small>百万円</small>
            </strong>
            <ExpenseDonut rows={rows} />
          </div>
        </section>
      </div>
      <p className="finance-note">
        営業損益＝売上高−売上原価−販管費。月次の合計は年度の財務データに連動します。入出金管理は請求明細の独立した管理メモで、年度CF・期末見込残高へ自動仕訳しません。金額は消費税を考慮しない架空値です。
      </p>
      {monthsOpen && (
        <MonthDetails
          data={data}
          periods={periods}
          onClose={() => setMonthsOpen(false)}
          onSaved={onSaved}
        />
      )}{" "}
      {details && (
        <InvoiceDetails
          kind={details.kind}
          initialFilter={details.filter}
          asOf={asOf}
          data={data}
          periods={periods}
          onClose={() => setDetails(null)}
          onSaved={onSaved}
          initialQuery={data.invoices.find(i=>i.id===initialInvoiceId)?.counterparty}
        />
      )}
    </div>
  );
}
