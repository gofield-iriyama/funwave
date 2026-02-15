# 四国サーフコンディション (MVP)

小松・生見・浮鞭のコンディションを、初心者/中級者/上級者の3レベルで `行ける / 厳しい` 判定する Next.js アプリです。

## 技術構成

- Next.js 16 (App Router / TypeScript)
- Supabase (データ保存)
- Open-Meteo (波高・周期・風データ)
- Vercel Cron (毎時更新)

## セットアップ

1. 依存をインストール

```bash
npm install
```

2. 環境変数を設定

`.env.local` を作成して以下を設定してください。

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
```

3. 設定チェック

```bash
npm run check:env
```

4. Supabaseにスキーマを適用

`supabase/schema.sql` の内容を SQL Editor で実行してください。

5. 開発サーバー起動

```bash
npm run dev
```

6. 初回バッチ実行（別ターミナル）

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/update
```

## 毎時バッチ更新

- エンドポイント: `GET /api/cron/update`
- ローカル手動実行例:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/update
```

## Hobbyプラン運用（GitHub Actions）

Vercel Hobbyでは「毎時Cron」が使えないため、GitHub Actionsから毎時実行します。

1. GitHub Secretsを設定
- `WAVES_CRON_SECRET`: `.env.local` の `CRON_SECRET` と同じ値
- `WAVES_CRON_URL`: 任意。未設定なら `https://waves-three-theta.vercel.app/api/cron/update` を使用

2. ワークフロー
- `/Users/gofield/Documents/waves/.github/workflows/hourly-surf-update.yml`
- スケジュール: 毎時 `:05`（UTC）
- 手動実行: GitHub Actionsの `Hourly Surf Update` から `Run workflow`

## データモデル

- `spots`: スポット定義
- `forecast_slots`: 3時間スロット集計値とスコア
- `daily_evaluations`: レベル別日次判定
- `spot_runtime_status`: 最終成功/失敗状態

## 仕様メモ

- 判定対象時間: JST 6:00-18:00（3時間単位）
- 更新頻度: 1時間ごと
- 失敗時: 最終成功データを表示
- 鮮度閾値: 6時間
