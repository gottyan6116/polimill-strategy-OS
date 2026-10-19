# Polimill Strategy OS

組織 → 部門目標 → KPI・実行施策をつなぐ、経営管理アプリのMVPです。データはすべて架空の仮説値であり、Polimillの実際の経営情報ではありません。

## 実装範囲

- メール／パスワードによる管理者ログイン、期限付きセッション、ログアウト
- 全社サマリー、部門ツリー、目標選択、KPI推移、実行施策
- 目標・仮説・担当、KPI現在値／目標、施策進捗／状態／期限の編集とD1永続化
- 組織・目標・KPI・施策の検索、スマートフォン表示
- 競合更新の検出、組織単位のアクセス制御、更新監査ログ

アカウント登録、SSO、パスワード再発行画面、権限別ロール、目標／KPI／施策の追加・削除、年度切替、月次履歴の編集は対象外です。KPI推移は投入済みの2026年4–10月の履歴です。現在値の編集はKPI表示・達成率に反映され、過去の履歴値は上書きしません。

## 技術構成と現在のCloudflare対応

Next.js 16のApp Router API、React、TypeScript、Tailwind CSSを使用。Cloudflare Workersへは **vinext + Cloudflare Vite plugin** で配信します。vinextはNext.js APIをVite上で実装する方式で、Cloudflare公式の現行推奨です。通常のNext.jsサーバーをそのままWorkersで動かす構成ではありません。

- [Cloudflare Next.jsガイド](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [vinext](https://github.com/cloudflare/vinext)

vinextはbetaのため、アップグレード時は互換性確認とWorker上でのE2E検証が必要です。`package-lock.json`と直接依存の固定バージョンをコミットしています。

## ローカル起動

Node.js 24を利用します。

```sh
npm ci
npm run db:migrate:local
npm run admin:local
npm run dev
```

開発URLは通常 `http://localhost:5173`。初期ローカル管理者のメールとランダムパスワードは `.local/admin-local.json` に生成されます。既存アカウントがある場合、作成処理はエラーで停止し、パスワードを上書きしません。

## 検証

```sh
npm run typecheck
npm test
npm run build
npm run start -- --port 8787
# 別のターミナルで
npx playwright install chromium
TEST_BASE_URL=http://127.0.0.1:8787 npm run test:e2e
```

PowerShellの場合は `$env:TEST_BASE_URL='http://127.0.0.1:8787'` を設定してから実行します。既存Edgeを使う場合は `$env:PLAYWRIGHT_CHANNEL='msedge'`。Windowsでは本番プレビューを停止してから再ビルドしてください。Workerプロセスが出力ファイルを使用中の間は再ビルドできません。

E2Eは**ローカルの使い捨て仮説データ専用**です。編集保存・復元とログイン制限を検証します。再実行で制限に達した場合は、ローカルに限り `npx wrangler d1 execute polimill-strategy-os --local --command "DELETE FROM login_attempts"` で試行履歴を初期化できます。リモートDBへ向けて実行しないでください。

GitHub Actionsは依存関係・型・単体テスト・ローカルD1・本番ビルド・E2Eを検証します。Cloudflareへの自動デプロイは有効にしていません。

## IaCとデプロイ

`wrangler.jsonc`でWorker名、Node互換フラグ、静的アセット、D1バインディングを管理し、`migrations/`でテーブルと架空データを管理します。D1の初回作成は以下の操作で行い、返された公開識別子を設定します。このリポジトリのDB IDは本MVP用です。別環境では新しいDBを作成してください。

```sh
npx wrangler login
npx wrangler d1 create polimill-strategy-os
# wrangler.jsonc の database_id を設定
npm run db:migrate:remote
# ADMIN_EMAILを環境変数で指定してから実行
npm run admin:remote
npm run build
npx wrangler deploy --config dist/server/wrangler.json --dry-run
npm run deploy
```

リモート管理者のランダムパスワードは `.local/admin-remote.json` に保存します。APIキー、パスワード、メールアドレスの実値を設定ファイルやSQLへ書き込んでコミットしないでください。管理者作成スクリプトの一時SQLは終了時に削除されます。

## 認証・運用上の境界

パスワードはランダムソルト付きPBKDF2-SHA256（100,000回、Workers Web Cryptoの上限に合わせた設定）で保存します。セッションは256ビット乱数で、D1にはSHA256ダイジェストのみを保存。CookieはHttpOnly、SameSite=Lax、公開HTTPSではSecureです。通常12時間、ログイン維持を選ぶと7日で失効します。書込みAPIはOrigin一致を必須とします。ログイン試行はアカウント失敗10回／15分と回線100回／15分を別々に制限します。管理者は所属組織の仮説データ全体を編集できます。

公開リポジトリを維持します。秘密情報、ローカルD1、実データ、認証ファイル、ビルド出力、テスト出力はgitignoreで除外します。

依存監査には、vinextのビルド用依存 `vite-plugin-commonjs → micromatch → braces@3.0.3` に未解消のDoSアドバイザリが残っています。現時点のbraces最新版も該当し、監査上は親パッケージを含む7件のHigh表示です。アプリは外部からglobパターンを受け付けず、この依存はWorkerのランタイムコードには含まれません。`fflate`は修正版0.7.5へoverride済み。アップデート時に `npm audit` を再確認してください。

本MVPは仮説データによる検証用です。実情報を扱う前の追加作業は、ユーザー管理・パスワード再発行・役割別権限、必要に応じたMFA／組織SSO、監査ログ閲覧と保持方針、バックアップ／復旧手順の整備です。
