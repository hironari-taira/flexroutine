# ポートフォリオ回帰QA - 2026-07-12

## 目的

Google Play一般公開は保留し、GitHubで成果物を見せるために、現在のコード品質・Android実機証跡・未確認事項を切り分ける。

## 実行済み

| 区分         | 結果 | 内容                                                |
| ------------ | ---- | --------------------------------------------------- |
| Android接続  | Pass | Android 15 実機をADBで検出。                         |
| Metro起動    | Pass | LAN接続でExpo Metroが起動し、Android bundleを完了。 |
| 型検査       | Pass | `npm.cmd run typecheck`                             |
| lint         | Pass | `npm.cmd run lint`                                  |
| 時短計算     | Pass | `npm.cmd run verify:routine-totals`（7件）          |
| 実行プラン   | Pass | `npm.cmd run verify:run-plan`（6件）                |
| DB migration | Pass | `npm.cmd run verify:db-migrations`（2件）           |
| Android環境  | Pass | `npm.cmd run verify:android-env`                    |

## 実機の機能証跡

Android 15実機で、ホーム、作成、時短プラン、タイマー、完了保存、共有、履歴、メモ編集を完了まで確認済みです。画面証跡はREADMEのデモセクションで確認できます。

## 今回の実機スモークテスト

Android 15実機で、ホーム、ルーティン詳細、時短プレビューを再確認した。ホーム・詳細・プレビューで最低限時間が一致し、下限未満の時間を選択した場合は最低限プランへ切り替わることを確認した。

タスクのアーカイブ確認ダイアログ、キャンセル後の状態保持、Expo Goで通知を設定できない場合の安全な案内表示を確認した。

任意タスクのスキップは自動テストで検証済みで、次回の実機確認対象としている。タイマー操作・完了保存・履歴・メモ編集は実機で確認済みである。

## 判定

README、スクリーンショット、実機確認、静的検証を揃えた。development buildでの通知実機検証と任意タスクの実機スキップ確認は、今後の改善対象である。
