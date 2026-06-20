# FlexRoutine

寝坊しても、予定が崩れても、今日の最低限まで自動で組み直すルーティンタイマー。

## 今回の実装範囲

PRD の Phase 0 から Phase 2 までを実装しています。

- Expo Router の TypeScript 構成
- ESLint / Prettier 設定
- SQLite DB 初期化
- routines / tasks / execution_logs / task_logs / suggestions / app_settings の schema 作成
- 初回起動時のサンプルルーティン seed
- HomeScreen で「朝の支度」「夜の支度」「仕事開始前」を表示
- 通常スタート / 緊急！時短ボタンから確認画面へ遷移

## セットアップ

```powershell
npm.cmd install
```

## 起動

```powershell
npm.cmd run start
```

Android 実機で確認する場合:

```powershell
npm.cmd run android
```

Web で軽く確認する場合:

```powershell
npm.cmd run web
```

## 確認ポイント

- Home にサンプル3件が表示される
- 各カードに通常時間、最低限、タスク数、通知時刻が表示される
- 「スタート」で通常スタート確認画面へ移動する
- 「緊急！時短」で短縮版の確認画面へ移動する
- ルーティンカード本体タップで詳細画面へ移動する
- 詳細画面でタスク一覧と「絶対やる / 短く / 余裕」の扱いが見える

## 開発コマンド

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format
```

## 既知の制約

- タイムストレッチ、実行タイマー、音声ナビ、通知、バックアップは次 Phase 以降です。
- Expo SQLite の Web 対応は Expo 公式 docs 上でも alpha 扱いです。MVP 検証は Android 実機を優先します。
- `npm audit` の moderate は Expo 内部依存由来です。`npm audit fix --force` は Expo の大幅なダウングレードを提案するため、現時点では実行していません。
