# FlexRoutine

寝坊しても、予定が崩れても、今日の最低限まで自動で組み直すルーティンタイマー。

## 今回の実装範囲

Goal 1 の「時短実行できる縦割りMVP」までを実装しています。
Goal 2 の「普段使いできる操作感・編集・完了共有のMVP」を実装中です。

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
npm.cmd run verify:android-env
npm.cmd run format
```

Android実機でのGoal 1確認は [docs/qa/goal-1-android-checklist.md](docs/qa/goal-1-android-checklist.md) を使います。

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

## Goal 2 の追加範囲

- TimerScreen の自動進行モード / 手動進行モード
- 自動進行モードをデフォルトにする
- 残り時間を予定終了時刻ベースで計算し、短時間の画面復帰や再描画で大きく破綻しにくくする
- 一時停止中はダブルタップ、スキップ、+30秒を無効化する
- ルーティン詳細でタスク名、通常時間、最小時間、緊急時の扱いを編集する
- 上へ / 下へ ボタンでタスク順序を変更する
- タスク追加
- タスク削除は物理削除ではなく `tasks.archived_at` によるアーカイブ
- CompletionScreen直後の任意メモ保存
- `task_logs.note` を追加するDB migration v2
- 完了共有カード
- 背景テンプレート選択
- `react-native-view-shot` によるPNG生成
- `expo-sharing` によるAndroid共有シート表示

Goal 2のAndroid確認は [docs/qa/goal-2-device-checklist.md](docs/qa/goal-2-device-checklist.md) に記録します。
判断と学びは [docs/decisions/goal-2-decisions.md](docs/decisions/goal-2-decisions.md) に残します。

## Goal 2 の既知の制約

- `advanceMode` はGoal 2では永続化しません。起動ごと、ルーティン開始ごとに `AUTO` から始まります。
- 長時間バックグラウンド復元、OSにkillされた後の途中再開、通知からの途中復帰は未対応です。
- 完了メモはCompletionScreen直後のみ入力できます。後から編集するExecution detail画面は次Goal以降です。
- タスクの復元UIは未対応です。削除操作はDB上のアーカイブとして保存されます。
- SNSへの実投稿は必須検証にしていません。Android共有シートが開き、PNGが渡せるところまでをGoal 2の成功条件にします。
