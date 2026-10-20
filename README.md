# Polimill Strategy OS

組織 → 部門目標 → KPI・実行施策をつなぐ、経営管理アプリのMVPです。データはすべて架空の仮説値であり、Polimillの実際の経営情報ではありません。

## 実装範囲

- メール／パスワードによる管理者ログイン、期限付きセッション、ログアウト
- 全社サマリー、部門ツリー、目標選択、KPI推移、実行施策
- 目標・仮説・担当、KPI現在値／目標、施策進捗／状態／期限の編集とD1永続化
- 組織・目標・KPI・施策の検索、スマートフォン表示
- 競合更新の検出、組織単位のアクセス制御、更新監査ログ

アカウント登録、SSO、パスワード再発行画面、権限別ロール、目標／KPI／施策の追加・削除、KPI月次履歴の数値編集は対象外です。KPI推移は投入済みの2026年4–10月の履歴です。現在値の編集はKPI表示・達成率に反映され、過去の履歴値は上書きしません。

## 経営会議向けの型（2026-10-20）

トップは経営サマリー、KPI・実行施策・組織は全件一覧と個別詳細です。予算差・期末見込み・前年比、月別計画によるKPI判定、例外と責任者、締め情報・更新日時に対応します。未登録値は未設定、計画のないKPIは未判定です。既存の仮数値と財務計算は維持しています。

マイグレーション0005でシナリオ別の観測値・マイルストーンを追加。計画・閾値・定義・財務リンクと、フォーマット・色は設定へ集約しています。[設定とデータ契約](docs/reporting-configuration.md) を参照してください。旧自己申告進捗は保全し、現在の施策進捗は完了日があるマイルストーンから計算します。

## 技術構成と現在のCloudflare対応

### 財務分析（追加）

左メニュー「財務分析」から次の5画面を利用できます。年度（2024–2026）・事業を切り替え、3つの架空事業を比較できます。

- **ポートフォリオ**: 売上高成長率×ROICのバブル、売上構成、事業別NOPAT、比較表。バブル・比較表から事業のROICへ掘り下げ。
- **ROICツリー**: NOPAT利益率×投下資本回転率、および売上・費用・運転資本・営業固定資産の内訳。
- **財務指標**: 収益性・成長性・効率性・安全性の推移と年度別表。
- **キャッシュフロー**: 営業・投資・財務CFとフリーCFの推移、期首→期末現預金の増減図・明細。
- **損益・入出金**: 月次の営業損益・売上高、費用内訳の降順横棒、入金管理・支払管理。基準日ごとの未決済残高を期日未設定／期限超過／期日前・当日に分け、請求の追加・編集、部分入出金の記録と取消に対応。

月次は4月始まり・1円精度で年度の売上／原価／販管費と一致します。月次編集は年度集計へ反映し、年度編集は既存比率で月次へ再配分します。入出金台帳は独立管理で、記録しても年度の損益・CF・期末見込残高へ自動仕訳しません。銀行連携・送金実行は含みません。`0004_operations.sql` が月次108件と架空請求54件を追加します。仕様は [月次・入出金設計](docs/operations-design.md) を参照。

「試算データ」の編集から損益・資産負債・CFの仮説をD1へ保存します。過年度の変更は後続年度の期首現預金・総資産・投下資本へトランザクション内で引き継がれ、競合する編集は409で拒否します。追加のテーブル・架空データは `0003_financial_analysis.sql` で管理します。

金額単位は百万円。ROICはNOPAT÷期首・期末平均投下資本。全社は分子・分母を合算し、単純平均は使いません。分母が0以下・比較前年度がない指標は「—」。計算定義・簡便税額・事業間取引未消去などの前提は画面と [財務分析設計](docs/finance-design.md) に明示しています。正式な連結財務諸表ではありません。

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
