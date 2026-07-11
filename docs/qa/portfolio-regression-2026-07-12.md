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

ロック解除済みのAndroid 15実機で、ホーム、ルーティン詳細、時短プレビューを再確認した。朝の支度はホーム・詳細・プレビューで最低限14分30秒と一致し、5分を選択すると「最低限でも14分30秒必要です」と表示され、14分30秒の最低限プランへ切り替わった。

今回追加したアーカイブ確認は、タスクの`アーカイブ`から確認ダイアログを開き、`キャンセル`後もタスクが残ることを確認した。通知ONの保存では、Expo GoでOS通知を設定できない旨と「ルーティンの保存は完了しています」が表示されることを確認した。

任意タスクの実機スキップ確認は、Expo接続が途中で切れたため次回に持ち越す。RunPlanの自動テストでは検証済み。タイマー操作・完了保存・履歴・メモ編集はGoal 3の実機証跡を維持している。

## 判定

GitHubでポートフォリオとして見せるためのREADME、スクリーンショット、実機証跡、静的検証は揃っている。外部共有前の残作業は、任意タスクの実機スキップ確認と、共有済みリポジトリの表示内容をブラウザで最終確認することである。
