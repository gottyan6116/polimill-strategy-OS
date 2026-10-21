"use client";
import {useDialog} from '@/components/use-dialog';
import { useEffect, useRef, useState } from "react";
import { X, Pencil, Plus, History } from "lucide-react";
import type { FinanceRecord, FinanceWorkspace } from "@/lib/finance";
import {
  invoiceBalance,
  invoiceStatus,
  japanDate,
  type Invoice,
} from "@/lib/operations";
import { preciseMoney as money } from "./format";
export const invoiceStatusLabels = {
  undated: "期日未設定",
  overdue: "期限超過",
  upcoming: "期日前・当日",
  settled: "消込済み",
  unissued: "発行前",
};
export type InvoiceFilter = "open" | "all" | keyof typeof invoiceStatusLabels;
async function send(payload: unknown, method = "PATCH") {
  const response = await fetch("/api/finance/invoices", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (response.status === 401) {
    window.location.assign("/login");
    throw Error("ログインしてください。");
  }
  const result = (await response
    .json()
    .catch(() => ({ error: "接続を確認してください。" }))) as {
    error?: string;
    id?: string;
  };
  if (!response.ok) throw Error(result.error ?? "保存できませんでした。");
  return result;
}
function InvoiceEditor({
  record,
  kind,
  data,
  periods,
  onClose:finishClose,
  onSaved,
}: {
  record: Invoice | null;
  kind: Invoice["kind"];
  data: FinanceWorkspace;
  periods: FinanceRecord[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const onClose=useDialog(ref,finishClose,busy);
  const first =
    periods.find((p) => p.id === record?.finance_period_id) ?? periods[0];
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const fields = {
      counterparty: String(form.get("counterparty")),
      owner:form.get('owner')?String(form.get('owner')):null,
      issued_on: String(form.get("issued_on")),
      due_on: form.get("due_on") ? String(form.get("due_on")) : null,
      amount: Number(form.get("amount")),
    };
    try {
      await send(
        record
          ? { action: "edit", id: record.id, version: record.version, fields }
          : { finance_period_id: form.get("finance_period_id"), kind, fields },
        record ? "PATCH" : "POST",
      );
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
      className="dialog edit-dialog"
      aria-labelledby="invoice-edit-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">
            {kind === "receivable" ? "入金管理" : "支払管理"} · 単位：百万円
          </span>
          <h2 id="invoice-edit-title">
            {record ? "請求明細を編集" : "請求明細を追加"}
          </h2>
        </div>
        <button
          className="icon-button"
          disabled={busy}
          onClick={onClose}
          aria-label="閉じる"
        >
          <X size={20} />
        </button>
      </header>
      <form method="post" action="/api/finance/invoices" onSubmit={submit}>
        {!record && (
          <label>
            事業
            <select
              name="finance_period_id"
              aria-label="請求先の事業"
              defaultValue={first.id}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {data.units.find((u) => u.id === p.business_unit_id)!.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>責任者<input aria-label="請求の責任者" name="owner" maxLength={200} defaultValue={record?.owner??''} placeholder="未設定"/></label>
        <label>
          取引先
          <input
            aria-label="取引先"
            name="counterparty"
            required
            maxLength={200}
            defaultValue={record?.counterparty ?? ""}
          />
        </label>
        <div className="form-pair">
          <label>
            発行日
            <input
              aria-label="発行日"
              name="issued_on"
              type="date"
              required
              defaultValue={record?.issued_on ?? `${first.fiscal_year}-04-01`}
            />
          </label>
          <label>
            期日
            <input
              aria-label="期日"
              name="due_on"
              type="date"
              defaultValue={record?.due_on ?? ""}
            />
          </label>
        </div>
        <label>
          請求額（百万円）
          <input
            aria-label="請求額（百万円）"
            name="amount"
            type="number"
            required
            min="0.000001"
            max="1000000000"
            step="0.000001"
            defaultValue={record?.amount ?? ""}
          />
        </label>
        <p className="muted small">
          期日が決まっていない場合は空欄にします。年度の損益・CFには自動仕訳しません。
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <footer>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            キャンセル
          </button>
          <button className="primary-button" disabled={busy}>
            {busy ? "保存中…" : "請求明細を保存"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
function SettlementDialog({
  record,
  data,
  onClose:finishClose,
  onSaved,
}: {
  record: Invoice;
  data: FinanceWorkspace;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const onClose=useDialog(ref,finishClose,busy);
  const invoice = data.invoices.find((i) => i.id === record.id) ?? record;
  const current = invoiceBalance(invoice, data.settlements, japanDate()),
    entries = data.settlements.filter((s) => s.invoice_id === record.id);
  const incoming = invoice.kind === "receivable";
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await send({
        action: "settle",
        id: invoice.id,
        version: invoice.version,
        fields: {
          amount: Number(form.get("amount")),
          settled_on: String(form.get("settled_on")),
          note: String(form.get("note")),
        },
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "記録できませんでした。");
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id: string) {
    setBusy(true);
    setError("");
    try {
      await send({
        action: "void",
        id: invoice.id,
        version: invoice.version,
        settlement_id: id,
      });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "取消できませんでした。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="dialog edit-dialog ops-settlement-dialog"
      aria-labelledby="settlement-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">{invoice.counterparty}</span>
          <h2 id="settlement-title">
            {incoming ? "入金" : "支払"}の記録・履歴
          </h2>
          <p className="muted small">
            現在の未{incoming ? "入金" : "払"}残高：{money(current)}百万円
          </p>
        </div>
        <button
          className="icon-button"
          disabled={busy}
          onClick={onClose}
          aria-label="閉じる"
        >
          <X size={20} />
        </button>
      </header>
      {current > 0 && (
        <form method="post" action="/api/finance/invoices" onSubmit={submit}>
          <div className="form-pair">
            <label>
              {incoming ? "入金額" : "支払額"}（百万円）
              <input
                aria-label="記録額（百万円）"
                name="amount"
                type="number"
                required
                min="0.000001"
                max={current}
                step="0.000001"
                defaultValue={current}
              />
            </label>
            <label>
              {incoming ? "入金日" : "支払日"}
              <input
                aria-label="入出金日"
                name="settled_on"
                type="date"
                min={invoice.issued_on}
                max={japanDate()}
                required
                defaultValue={japanDate()}
              />
            </label>
          </div>
          <label>
            メモ
            <input aria-label="入出金メモ" name="note" maxLength={500} />
          </label>
          <p className="muted small">
            管理メモの登録です。銀行送金・口座操作は行いません。
          </p>
          <footer>
            <button className="primary-button" disabled={busy}>
              {busy ? "記録中…" : incoming ? "入金を記録" : "支払を記録"}
            </button>
          </footer>
        </form>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="ops-settlement-history">
        <h3>記録履歴</h3>
        {entries.length ? (
          entries.map((s) => (
            <div key={s.id}>
              <span>
                <strong>{money(s.amount)} 百万円</strong>
                <small>
                  {s.settled_on} {s.note}
                </small>
              </span>
              {s.voided_on ? (
                <span className="muted small">{s.voided_on} 取消済み</span>
              ) : (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void cancel(s.id)}
                  aria-label={`${s.settled_on}の入出金記録を取消`}
                >
                  記録を取消
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="muted small">記録はまだありません。</p>
        )}
        <p className="finance-note">
          取消は本日付で反映され、履歴は残ります。基準日を過去に戻すと、その日に有効だった記録で集計します。
        </p>
      </div>
    </dialog>
  );
}
export default function InvoiceDetails({
  kind,
  data,
  periods,
  asOf,
  initialFilter = "open",
  onClose:finishClose,
  onSaved,
  initialQuery='',
}: {
  kind: Invoice["kind"];
  data: FinanceWorkspace;
  periods: FinanceRecord[];
  asOf: string;
  initialFilter?: InvoiceFilter;
  onClose: () => void;
  onSaved: () => Promise<void>;
  initialQuery?:string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [filter, setFilter] = useState<InvoiceFilter>(initialFilter),
    [query, setQuery] = useState(initialQuery),
    [editor, setEditor] = useState<{ record: Invoice | null } | null>(null),
    [settling, setSettling] = useState<Invoice | null>(null);
  const onClose=useDialog(ref,finishClose);
  const ids = new Set(periods.map((p) => p.id)),
    incoming = kind === "receivable";
  const rows = data.invoices
    .filter(
      (i) =>
        i.kind === kind &&
        ids.has(i.finance_period_id) &&
        i.counterparty.includes(query),
    )
    .filter((i) => {
      const status = invoiceStatus(i, data.settlements, asOf);
      return (
        filter === "all" ||
        (filter === "open"
          ? status !== "unissued" && status !== "settled"
          : status === filter)
      );
    }).sort((a,b)=>Number(invoiceStatus(b,data.settlements,asOf)==='overdue')-Number(invoiceStatus(a,data.settlements,asOf)==='overdue')||(a.due_on??'9999').localeCompare(b.due_on??'9999'));
  return (
    <>
      <dialog
        ref={ref}
        className="dialog edit-dialog ops-detail-dialog"
        aria-labelledby="invoice-details-title"
        onCancel={onClose}
      >
        <header>
          <div>
            <span className="eyebrow">基準日：{asOf} · 単位：百万円</span>
            <h2 id="invoice-details-title">
              {incoming ? "入金管理" : "支払管理"}の明細
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="入出金明細を閉じる"
          >
            <X size={20} />
          </button>
        </header>
        <div className="ops-invoice-toolbar">
          <label>
            状態
            <select
              aria-label="入出金明細の状態"
              value={filter}
              onChange={(e) => setFilter(e.target.value as InvoiceFilter)}
            >
              <option value="open">未消込のみ</option>
              <option value="all">すべて</option>
              {Object.entries(invoiceStatusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <input
            aria-label="取引先を検索"
            placeholder="取引先を検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="primary-button"
            onClick={() => setEditor({ record: null })}
          >
            <Plus size={14} />
            明細を追加
          </button>
        </div>
        <div className="table-scroll">
          <table className="finance-table ops-invoice-table">
            <thead>
              <tr>
                <th>取引先 / 事業</th>
                <th>発行日 / 期日</th>
                <th>請求額</th>
                <th>基準日時点の残高</th>
                <th>状態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const status = invoiceStatus(i, data.settlements, asOf),
                  period = data.records.find(
                    (p) => p.id === i.finance_period_id,
                  )!;
                return (
                  <tr key={i.id} className={status==='overdue'?'invoice-overdue':''}>
                    <td>
                      <strong>{i.counterparty}</strong>
                      <small>責任者：{i.owner??'未設定'}</small>
                      <small>
                        {
                          data.units.find(
                            (u) => u.id === period.business_unit_id,
                          )!.name
                        }
                      </small>
                    </td>
                    <td>
                      {i.issued_on}
                      <small>{i.due_on ?? "期日未設定"}</small>
                    </td>
                    <td>{money(i.amount)}</td>
                    <td>{money(invoiceBalance(i, data.settlements, asOf))}</td>
                    <td>
                      <span className={`ops-status ops-${status}`}>
                        {invoiceStatusLabels[status]}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`${i.counterparty}の請求明細を編集`}
                        onClick={() => setEditor({ record: i })}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setSettling(i)}
                        aria-label={`${i.counterparty}の${incoming ? "入金" : "支払"}を記録`}
                      >
                        <History size={14} />
                        {incoming ? "入金" : "支払"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <p className="empty">該当する明細はありません。</p>}
        </div>
        <p className="finance-note">
          発行前の請求は残高集計から除きます。入出金記録は年度の損益・CF・期末見込残高に自動仕訳しません。
        </p>
      </dialog>
      {editor && (
        <InvoiceEditor
          record={editor.record}
          kind={kind}
          data={data}
          periods={periods}
          onClose={() => setEditor(null)}
          onSaved={onSaved}
        />
      )}{" "}
      {settling && (
        <SettlementDialog
          record={settling}
          data={data}
          onClose={() => setSettling(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
