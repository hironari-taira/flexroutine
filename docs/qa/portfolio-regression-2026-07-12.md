# ポートフォリオ回帰QA - 2026-07-12

## 目的

Google Play一般公開は保留し、GitHubで成果物を見せるために、現在のコード品質・Android実機証跡・未確認事項を切り分ける。

## 実行済み

| 区分         | 結果 | 内容                                                |
| ------------ | ---- | --------------------------------------------------- |
| Android接続  | Pass | Android 15 実機 `[redacted-device-model]` を ADB で検出。        |
| Metro起動    | Pass | LAN接続でExpo Metroが起動し、Android bundleを完了。 |
| 型検査       | Pass | `npm.cmd run typecheck`                             |
| lint         | Pass | `npm.cmd run lint`                                  |
| 時短計算     | Pass | `npm.cmd run verify:routine-totals`（7件）          |
| 実行プラン   | Pass | `npm.cmd run verify:run-plan`（6件）                |
| DB migration | Pass | `npm.cmd run verify:db-migrations`（2件）           |
| Android環境  | Pass | `npm.cmd run verify:android-env`                    |

## 実機の機能証跡

2026-06-29に同じAndroid 15実機で、ホーム、作成、時短プラン、タイマー、完了保存、共有、履歴、メモ編集を完了まで確認済みです。詳細なチェック結果と画面証跡は[Goal 3 Device Checklist](goal-3-device-checklist.md)を参照してください。

## 今回の実機スモークテスト

端末接続とMetro起動後、端末がロック画面およびシステムシェードにありました。ロック解除を迂回しない方針のため、画面操作を伴う再テストは保留にしました。コード・静的検証の失敗ではありません。

次回、端末をロック解除した状態で次の4項目を5分以内に再確認します。

1. ホームにルーチンと「緊急！時短」入口が表示される。
2. 緊急・時短プランで必須・短縮・任意タスクの扱いが正しい。
3. タイマーの一時停止、スキップ、+30秒が反応する。
4. 完了後に履歴へ保存され、実行詳細とメモを開ける。

## 判定

GitHubでポートフォリオとして見せるためのREADME、スクリーンショット、既存実機証跡、静的検証は揃っている。外部共有前の残作業は、ロック解除後の短時間スモークテストと、リポジトリの閲覧権限確認である。
