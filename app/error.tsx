"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main style={{ padding: "60px 24px", maxWidth: 600, margin: "auto" }}>
      <h1>画面を読み込めませんでした</h1>
      <p className="muted" style={{ margin: "20px 0" }}>
        接続を確認して、再度お試しください。
      </p>
      <button className="primary-button" onClick={reset}>
        再読み込み
      </button>
    </main>
  );
}
