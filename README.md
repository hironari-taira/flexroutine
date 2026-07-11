# FlexRoutine

予定が崩れても、今日の最低限から整え直せるルーチンタイマーです。

## 現在の実装範囲

Goal 1からGoal 4までのMVPを実装済みです。

- Expo Router / TypeScript / ESLint構成
- SQLite DB schemaとmigration v1-v3
- routines / tasks / execution_logs / task_logs / suggestions / app_settings
- サンプルルーティンseed
- 通常スタート / 緊急・時短スタート
- 時短プラン生成、OPTIONALスキップ、SHRINKABLE短縮、MUST_DO維持
- TimerのAUTO/MANUAL進行、一時停止、スキップ、+30秒、完了保存
- タスク編集、追加、並び替え、アーカイブ
- 新規ルーティン作成、テンプレート、通知設定UI
- ルーティン編集、通知ON/OFF、アーカイブ
- 履歴一覧、実行詳細、後からのメモ編集
- 完了カード、背景テンプレート、タスク概要/メモ表示オプション、PNG共有
- Timerのsafe area対応と時短メモ表示

## セットアップ

```powershell
npm.cmd install
```

## 起動

```powershell
npm.cmd run start
```

Android実機またはエミュレータで確認する場合:

```powershell
npm.cmd run android
```

## 検証コマンド

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run verify:run-plan
npm.cmd run verify:android-env
npm.cmd run verify:db-migrations
```

## QA資料

- Goal 1: [docs/qa/goal-1-android-checklist.md](docs/qa/goal-1-android-checklist.md)
- Goal 2: [docs/qa/goal-2-device-checklist.md](docs/qa/goal-2-device-checklist.md)
- Goal 3: [docs/qa/goal-3-device-checklist.md](docs/qa/goal-3-device-checklist.md)

Goal 3の判断ログは [docs/decisions/goal-3-decisions.md](docs/decisions/goal-3-decisions.md) に残しています。

## 一般公開の準備

AndroidのGoogle Play公開に向けた手順は [docs/release/google-play-launch-checklist.md](docs/release/google-play-launch-checklist.md) を参照してください。公開用のプライバシーポリシー案は [docs/legal/privacy-policy-ja.md](docs/legal/privacy-policy-ja.md) にあります。

## 既知の制約

- AndroidのExpo Goでは、SDK 53以降 `expo-notifications` のAndroid通知機能が制限されます。通知の実通知発火はdevelopment buildで確認します。Expo GoではUIと安全なfallbackを確認しています。
- `npm audit` のmoderate脆弱性はExpo内部依存由来です。`npm audit fix --force` はExpo SDKを壊す可能性があるため、現時点では実行していません。
- 長時間バックグラウンド復帰、OS kill後の途中再開、通知からの途中復帰は今後のGoalで扱います。
