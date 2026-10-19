"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Brand from "./brand";
export default function LoginForm() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fields.get("email"),
          password: fields.get("password"),
          remember: fields.get("remember") === "on",
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error || "ログインできませんでした。");
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "接続を確認してください。");
      setBusy(false);
    }
  }
  return (
    <main className="login-scene">
      <div className="login-grid" aria-hidden="true" />
      <div className="login-frame">
        <Brand large />
        <p className="login-tagline">
          ともに考え、ともに創る。
          <br />
          社会のこれからを。
        </p>
        <section className="login-glass" aria-labelledby="login-title">
          <h1 id="login-title">アカウントにログイン</h1>
          <form method="post" action="/api/auth/login" onSubmit={submit}>
            <label className="login-input">
              <Mail size={18} />
              <span className="sr-only">メールアドレス</span>
              <input
                type="email"
                name="email"
                placeholder="メールアドレス"
                autoComplete="username"
                required
                maxLength={254}
              />
            </label>
            <label className="login-input">
              <LockKeyhole size={18} />
              <span className="sr-only">パスワード</span>
              <input
                aria-label="パスワード"
                type={visible ? "text" : "password"}
                name="password"
                placeholder="パスワード"
                autoComplete="current-password"
                required
                maxLength={256}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={visible ? "パスワードを隠す" : "パスワードを表示"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </label>
            <label className="remember">
              <input type="checkbox" name="remember" />
              ログインしたままにする
            </label>
            {error && (
              <p role="alert" className="login-error">
                {error}
              </p>
            )}
            <button className="login-submit" disabled={busy || !ready}>
              {busy ? "ログイン中…" : "ログイン"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="login-help">
            管理者から発行されたアカウントで
            <br />
            ログインしてください。
          </p>
        </section>
        <p className="login-footer">
          データと対話で、
          <br />
          よりよい社会の意思決定を支える<span>Strategy OS</span>
        </p>
      </div>
      <p className="login-caption">Polimill Strategy OS · MVP</p>
    </main>
  );
}
