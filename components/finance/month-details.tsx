"use client";
import { useEffect, useRef, useState } from "react";
import { X, Pencil } from "lucide-react";
import {
  expenseCategories,
  monthLabel,
  monthlyTotals,
  type FinanceMonth,
  type MonthFields,
} from "@/lib/operations";
import type { FinanceRecord, FinanceWorkspace } from "@/lib/finance";
import { preciseMoney as money } from "./format";
function MonthEditor({
  record,
  period,
  name,
  onClose,
  onSaved,
}: {
  record: FinanceMonth;
  period: FinanceRecord;
  name: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(
      [...new FormData(e.currentTarget)].map(([k, v]) => [k, Number(v)]),
    ) as MonthFields;
    try {
      const response = await fetch("/api/finance/months", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          version: record.version,
          finance_period_id: period.id,
          period_version: period.version,
          fields,
        }),
      });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      const result = (await response
        .json()
        .catch(() => ({ error: "接続を確認してください。" }))) as {
        error?: string;
        id?: string;
      };
      if (!response.ok) throw Error(result.error ?? "保存できませんでした。");
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="edit-dialog"
      aria-labelledby="month-editor-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">単位：百万円 · 月次の仮説</span>
          <h2 id="month-editor-title">月次データを編集</h2>
          <p className="muted small">
            {name} / {period.fiscal_year}年度 {monthLabel(record.month_index)}
          </p>
        </div>
        <button
          className="icon-button"
          disabled={busy}
          onClick={onClose}
          aria-label="閉じる"
        >
          <X size={19} />
        </button>
      </header>
      <form method="post" action="/api/finance/months" onSubmit={submit}>
        <div className="finance-edit-grid ops-month-fields">
          {[{ key: "revenue", label: "売上高" }, ...expenseCategories].map(
            ({ key, label }) => (
              <label key={key}>
                {label}
                <input
                  aria-label={label}
                  name={key}
                  type="number"
                  required
                  min="0"
                  max="1000000000"
                  step="0.000001"
                  defaultValue={record[key as keyof MonthFields]}
                />
              </label>
            ),
          )}
        </div>
        <p className="muted small">
          費用は売上原価＋販管費の6区分です。保存すると年度の損益・ROICも再計算します。年度CFへの自動仕訳は行いません。
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={onClose}
          >
            キャンセル
          </button>
          <button className="primary-button" disabled={busy}>
            {busy ? "保存中…" : "月次データを保存"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
export default function MonthDetails({
  data,
  periods,
  onClose,
  onSaved,
}: {
  data: FinanceWorkspace;
  periods: FinanceRecord[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [selected, setSelected] = useState(periods[0]?.id ?? ""),
    [editing, setEditing] = useState<FinanceMonth | null>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const rows = data.months
      .filter((m) => m.finance_period_id === selected)
      .sort((a, b) => a.month_index - b.month_index),
    period = data.records.find((p) => p.id === selected)!,
    name = data.units.find((u) => u.id === period.business_unit_id)!.name,
    totals = monthlyTotals(rows);
  return (
    <>
      <dialog
        ref={ref}
        className="edit-dialog ops-detail-dialog"
        aria-labelledby="month-details-title"
        onCancel={onClose}
      >
        <header>
          <div>
            <span className="eyebrow">単位：百万円 · 4月〜翌年3月</span>
            <h2 id="month-details-title">月次損益の明細</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="月次明細を閉じる"
          >
            <X size={20} />
          </button>
        </header>
        <label className="ops-detail-filter">
          事業
          <select
            aria-label="月次明細の事業"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {data.units.find((u) => u.id === p.business_unit_id)!.name}
              </option>
            ))}
          </select>
        </label>
        <div className="table-scroll">
          <table className="finance-table">
            <thead>
              <tr>
                <th>月</th>
                <th>売上高</th>
                <th>売上原価</th>
                <th>販管費</th>
                <th>営業損益</th>
                <th>編集</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = monthlyTotals([r]);
                return (
                  <tr key={r.id}>
                    <td>{monthLabel(r.month_index)}</td>
                    <td>{money(m.revenue)}</td>
                    <td>{money(m.cost_of_sales)}</td>
                    <td>{money(m.sga)}</td>
                    <td
                      className={
                        m.operatingProfit < 0 ? "finance-negative" : ""
                      }
                    >
                      {money(m.operatingProfit)}
                    </td>
                    <td>
                      <button
                        className="text-button"
                        aria-label={`${monthLabel(r.month_index)}の月次データを編集`}
                        onClick={() => setEditing(r)}
                      >
                        <Pencil size={13} />
                        編集
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className="ops-total-row">
                <td>合計</td>
                <td>{money(totals.revenue)}</td>
                <td>{money(totals.cost_of_sales)}</td>
                <td>{money(totals.sga)}</td>
                <td>{money(totals.operatingProfit)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="finance-note">
          月次の合計は年度の財務データに一致します。数値は架空の仮配分です。
        </p>
      </dialog>
      {editing && (
        <MonthEditor
          record={editing}
          period={period}
          name={name}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
