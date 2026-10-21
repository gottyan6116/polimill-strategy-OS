"use client";
import {useDialog} from '@/components/use-dialog';
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  financeFieldGroups,
  type FinanceRecord,
  type FinanceFields,
} from "@/lib/finance";
export default function FinanceEditor({
  record,
  name,
  hasPrevious,
  onClose:finishClose,
  onSaved,
}: {
  record: FinanceRecord;
  name: string;
  hasPrevious: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const onClose=useDialog(ref,finishClose,busy);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(
      [...new FormData(event.currentTarget)].map(([k, v]) => [k, Number(v)]),
    ) as FinanceFields;
    try {
      const response = await fetch("/api/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          version: record.version,
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
      className="dialog edit-dialog finance-editor"
      aria-labelledby="finance-editor-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">架空の財務試算 · 単位：百万円</span>
          <h2 id="finance-editor-title">財務データを編集</h2>
          <p className="muted small">
            {name} / {record.fiscal_year}年度
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
      <form method="post" action="/api/finance" onSubmit={save}>
        {financeFieldGroups.map((group) => (
          <fieldset key={group.title}>
            <legend>{group.title}</legend>
            <div className="finance-edit-grid">
              {group.fields.map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    aria-label={label}
                    type="number"
                    name={key}
                    required
                    step={key === "tax_rate" ? "0.01" : "0.1"}
                    min={key.endsWith("_cf") ? -1e9 : 0}
                    max={key === "tax_rate" ? 1 : 1e9}
                    readOnly={hasPrevious && key.startsWith("opening_")}
                    defaultValue={record[key]}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <p className="muted small">
          税率は0.30＝30%。投資支出・返済はマイナスで入力します。
          {hasPrevious ? "期首残高は前年度から引き継がれます。" : ""}
          変更すると後続年度の期首残高も更新されます。売上高・売上原価・販管費を変更すると、月次の配分も現在の割合で再計算されます。
        </p>
        {error && (
          <p className="form-error" role="alert">
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
            {busy ? "保存中…" : "財務データを保存"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
