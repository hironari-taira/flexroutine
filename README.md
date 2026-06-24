# FlexRoutine

寝坊しても、予定が崩れても、今日の最低限まで自動で組み直すルーティンタイマー。

## 今回の実装範囲

Goal 1 の「時短実行できる縦割りMVP」までを実装しています。

- Expo Router の TypeScript 構成
- ESLint / Prettier 設定
- SQLite DB 初期化
- routines / tasks / execution_logs / task_logs / suggestions / app_settings の schema 作成
- 初回起動時のサンプルルーティン seed
- HomeScreen で「朝の支度」「夜の支度」「仕事開始前」を表示
- 通常スタート / 緊急！時短ボタンから実行プラン確認画面へ遷移
- 緊急時短の持ち時間入力
- OPTIONAL のスキップ、SHRINKABLE / MUST_DO の最小時間までの短縮
- 最低限より短い持ち時間の警告
- タイマー画面でダブルタップ、停止/再開、スキップ、30秒延長
- 完了時の execution_logs / task_logs 保存
- Home のDB由来の簡易提案

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
- 「緊急！時短」で短縮版の持ち時間入力画面へ移動する
- 5分など最低限未満の持ち時間では「最低限でも...必要です」が出る
- 15分などでは OPTIONAL がスキップ、SHRINKABLE が短縮される
- 「このプランで始める」でタイマー画面へ移動する
- 画面全体のダブルタップで次のタスクへ進む
- 一時停止 / 再開 / スキップ / +30秒が動く
- 最後まで進むと完了画面へ移動する
- Home に戻ると、保存済みログ由来の提案文が表示される
- ルーティンカード本体タップで詳細画面へ移動する
- 詳細画面でタスク一覧と「絶対やる / 短く / 余裕」の扱いが見える

## 開発コマンド

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run verify:run-plan
npm.cmd run format
```

## 既知の制約

- ルーティン新規作成、タスク編集、通知UI、バックアップは次 Goal 以降です。
- 音声ナビとハプティクスは best-effort です。動かない端末/ブラウザでもタイマーは継続します。
- Expo SQLite の Web 対応は Expo 公式 docs 上でも alpha 扱いです。MVP 検証は Android 実機を優先します。
- `npm audit` の moderate は Expo 内部依存由来です。`npm audit fix --force` は Expo の大幅なダウングレードを提案するため、現時点では実行していません。

## ブログ用スクショ候補

- Home: 3つのサンプルルーティンとDB由来提案
- 緊急！時短: 持ち時間入力とプラン要約
- 5分指定: 最低限未満の警告
- Timer: 大きな現在タスクと残り時間
- Completion: 保存された実績サマリー
