"use client";
import "./finance.css";
import { useCallback, useEffect, useState } from "react";
import { Pencil, RefreshCw } from "lucide-react";
import {
  calculateFinance,
  consolidateFinance,
  type FinanceWorkspace,
  type FinanceRecord,
} from "@/lib/finance";
import { money, percent } from "./format";
import { PortfolioView, RoicView, IndicatorsView, CashflowView } from "./views";
import FinanceEditor from "./editor";
import {financialDefinitions} from '@/config/metrics';
import OperationsOverview from "./operations";
import {presentation} from '@/config/presentation';
const tabs = [
  { id: "operations", name: "損益・入出金" },
  { id: "portfolio", name: "ポートフォリオ" },
  { id: "roic", name: "ROICツリー" },
  { id: "indicators", name: "財務指標" },
  { id: "cashflow", name: "キャッシュフロー" },
] as const;
export default function FinancialDashboard({initialView='portfolio',initialYear=2026,initialUnitId='all',initialInvoiceId}:{initialView?:string;initialYear?:number;initialUnitId?:string;initialInvoiceId?:string}) {
  const [data, setData] = useState<FinanceWorkspace | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [year, setYear] = useState(initialYear),
    [unitId, setUnitId] = useState(initialUnitId),
    [view, setView] = useState(initialView),
    [editing, setEditing] = useState<FinanceRecord | null>(null),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/finance", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) throw Error("財務データを読み込めませんでした。");
      const result=(await response.json()) as FinanceWorkspace;
      setData({...result,units:result.units.map((u,i)=>({...u,color:presentation.business[i%presentation.business.length]}))});
    } catch (e) {
      setError(e instanceof Error ? e.message : "接続を確認してください。");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (!data)
    return (
      <section className="panel finance-loading" aria-busy={busy}>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className="secondary-button" onClick={() => void load()}>
              再読み込み
            </button>
          </>
        ) : (
          <p role="status">財務データを読み込んでいます…</p>
        )}
      </section>
    );
  if (!data.records.length)
    return (
      <section className="panel finance-loading">
        財務データがありません。
      </section>
    );
  const years = [...new Set(data.records.map((r) => r.fiscal_year))].sort(
    (a, b) => b - a,
  );
  const selected = data.records.filter(
    (r) =>
      r.fiscal_year === year &&
      (unitId === "all" || r.business_unit_id === unitId),
  );
  const previous = data.records.filter(
    (r) =>
      r.fiscal_year === year - 1 &&
      (unitId === "all" || r.business_unit_id === unitId),
  );
  const m = consolidateFinance(selected, previous);
  const rows = selected.map((record) => ({
    record,
    unit: data.units.find((u) => u.id === record.business_unit_id)!,
    metrics: calculateFinance(
      record,
      previous.find((p) => p.business_unit_id === record.business_unit_id),
    ),
  }));
  const history = [...years].reverse().map((y) => ({
    year: y,
    metrics: consolidateFinance(
      data.records.filter(
        (r) =>
          r.fiscal_year === y &&
          (unitId === "all" || r.business_unit_id === unitId),
      ),
      data.records.filter(
        (r) =>
          r.fiscal_year === y - 1 &&
          (unitId === "all" || r.business_unit_id === unitId),
      ),
    ),
  }));
  function drill(id: string) {
    setUnitId(id);
    setView("roic");
  }
  return (
    <div className="finance-workspace">
      <div className="finance-toolbar">
        <div
          className="finance-tabs"
          role="tablist"
          aria-label="財務分析の表示"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`finance-tab-${tab.id}`}
              role="tab"
              aria-selected={view === tab.id}
              aria-controls={`finance-panel-${tab.id}`}
              tabIndex={view === tab.id ? 0 : -1}
              onClick={() => setView(tab.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                  event.preventDefault();
                  const next =
                    (tabs.findIndex((t) => t.id === view) +
                      (event.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                    tabs.length;
                  setView(tabs[next].id);
                  document
                    .getElementById(`finance-tab-${tabs[next].id}`)
                    ?.focus();
                }
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <div className="finance-filters">
          <label>
            年度
            <select
              aria-label="財務分析の年度"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}年度
                </option>
              ))}
            </select>
          </label>
          <label>
            事業
            <select
              aria-label="財務分析の事業"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              <option value="all">全事業（合算）</option>
              {data.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="icon-button"
            onClick={() => void load()}
            disabled={busy}
            aria-label="財務データを再読み込み"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <div role="status" className="save-notice">
          {notice}
          <button className="text-button" onClick={() => setNotice("")}>
            閉じる
          </button>
        </div>
      )}
      <div className="finance-metrics">
        {[
          ["売上高", money(m.revenue), "百万円"],
          ["営業利益", money(m.operatingProfit), "百万円"],
          ["ROIC", percent(m.roic), "NOPAT ÷ 平均投下資本"],
          ["フリーCF", money(m.freeCashFlow), "百万円"],
        ].map(([label, value, note]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>
      <section
        role="tabpanel"
        id={`finance-panel-${view}`}
        aria-labelledby={`finance-tab-${view}`}
        className="finance-content"
      >
        {view === "operations" && (
          <OperationsOverview
            data={data}
            periods={selected}
            initialInvoiceId={initialInvoiceId}
            onSaved={async () => {
              await load();
              setNotice("月次・入出金データを保存しました。");
            }}
          />
        )}
        {view === "portfolio" && <PortfolioView rows={rows} onSelect={drill} />}{" "}
        {view === "roic" && <RoicView m={m} records={selected} />}{" "}
        {view === "indicators" && <IndicatorsView history={history} m={m} />}{" "}
        {view === "cashflow" && <CashflowView history={history} m={m} />}
      </section>
      <section className="panel finance-inputs">
        <div className="panel-heading">
          <h2>試算データ</h2>
          <span className="muted small">{year}年度 · 百万円</span>
        </div>
        <div className="table-scroll">
          <table className="finance-table">
            <thead>
              <tr>
                <th>事業</th>
                <th>売上高</th>
                <th>営業利益</th>
                <th>期末現預金</th>
                <th>編集</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ unit, record, metrics: r }) => (
                <tr key={record.id}>
                  <td>{unit.name}</td>
                  <td>{money(r.revenue)}</td>
                  <td>{money(r.operatingProfit)}</td>
                  <td>{money(r.closingCash)}</td>
                  <td>
                    <button
                      className="text-button"
                      aria-label={`${unit.name}の財務データを編集`}
                      onClick={() => setEditing(record)}
                    >
                      <Pencil size={13} />
                      編集
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <details className="finance-definitions">
        <summary>指標の定義と試算の前提</summary>
        <p>{financialDefinitions.scope}</p><p>{financialDefinitions.capital}</p><p>{financialDefinitions.comparison}</p>
      </details>
      {editing && (
        <FinanceEditor
          record={editing}
          name={data.units.find((u) => u.id === editing.business_unit_id)!.name}
          hasPrevious={data.records.some(
            (r) =>
              r.business_unit_id === editing.business_unit_id &&
              r.fiscal_year === editing.fiscal_year - 1,
          )}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await load();
            setNotice("財務データを保存し、後続年度の期首残高も更新しました。");
          }}
        />
      )}
    </div>
  );
}
