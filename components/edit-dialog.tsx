"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Goal, Kpi, Initiative } from "@/lib/model";
import { statusLabels } from "@/lib/model";
export type EditRecord =
  | { kind: "goals"; record: Goal }
  | { kind: "kpis"; record: Kpi }
  | { kind: "initiatives"; record: Initiative };
export default function EditDialog({
  item,
  onClose,
  onSaved,
}: {
  item: EditRecord;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      kind: item.kind,
      id: item.record.id,
      version: item.record.version,
    };
    for (const [key, value] of data)
      payload[key] = ["actual", "target", "progress"].includes(key)
        ? Number(value)
        : value;
    try {
      const response = await fetch("/api/records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error || "保存できませんでした。");
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "接続を確認してください。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="edit-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">仮説データの編集</span>
          <h2>
            {item.kind === "goals"
              ? "部門目標"
              : item.kind === "kpis"
                ? "KPI"
                : "実行施策"}
            を編集
          </h2>
        </div>
        <button
          type="button"
          className="icon-button"
          disabled={busy}
          onClick={onClose}
          aria-label="閉じる"
        >
          <X size={20} />
        </button>
      </header>
      <form method="post" action="/api/records" onSubmit={save}>
        {item.kind === "goals" && (
          <>
            <label>
              目標名
              <input
                autoFocus
                name="title"
                required
                maxLength={200}
                defaultValue={item.record.title}
              />
            </label>
            <label>
              仮説
              <textarea
                name="hypothesis"
                rows={4}
                required
                maxLength={2000}
                defaultValue={item.record.hypothesis}
              />
            </label>
            <label>
              担当
              <input
                name="owner"
                required
                maxLength={200}
                defaultValue={item.record.owner}
              />
            </label>
          </>
        )}
        {item.kind === "kpis" && (
          <>
            <label>
              KPI名
              <input
                autoFocus
                name="name"
                required
                maxLength={200}
                defaultValue={item.record.name}
              />
            </label>
            <div className="form-pair">
              <label>
                現在値
                <input
                  name="actual"
                  type="number"
                  min="0"
                  max="1000000000000"
                  step="any"
                  required
                  defaultValue={item.record.actual}
                />
              </label>
              <label>
                目標値
                <input
                  name="target"
                  type="number"
                  min="0.000001"
                  max="1000000000000"
                  step="any"
                  required
                  defaultValue={item.record.target}
                />
              </label>
            </div>
            <div className="form-pair">
              <label>
                単位
                <input
                  name="unit"
                  required
                  maxLength={20}
                  defaultValue={item.record.unit}
                />
              </label>
              <label>
                改善の方向
                <select name="direction" defaultValue={item.record.direction}>
                  <option value="up">大きいほど良い</option>
                  <option value="down">小さいほど良い</option>
                </select>
              </label>
            </div>
          </>
        )}
        {item.kind === "initiatives" && (
          <>
            <label>
              施策名
              <input
                autoFocus
                name="title"
                required
                maxLength={200}
                defaultValue={item.record.title}
              />
            </label>
            <label>
              担当
              <input
                name="owner"
                required
                maxLength={200}
                defaultValue={item.record.owner}
              />
            </label>
            <div className="form-pair">
              <label>
                進捗（%）
                <input
                  name="progress"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  required
                  defaultValue={item.record.progress}
                />
              </label>
              <label>
                ステータス
                <select name="status" defaultValue={item.record.status}>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              期限
              <input
                name="due_date"
                type="date"
                required
                defaultValue={item.record.due_date}
              />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <p className="muted small">変更は組織の共有データに保存されます。</p>
        <footer>
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={busy}
          >
            キャンセル
          </button>
          <button className="primary-button" disabled={busy}>
            {busy ? "保存中…" : "変更を保存"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
