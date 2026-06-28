# Goal 2 Decision Log

作成日: 2026-06-28

## advanceModeをGoal 2では永続化しない理由

Goal 2では、`advanceMode` をTimerScreen内のセッション状態として扱う。毎回 `AUTO` から始め、実行中にだけ `MANUAL` へ切り替えられるようにした。

まだ「AUTOをデフォルトにした普段使い」が本当に快適かを検証する段階なので、アプリ全体設定やルーティン別設定へ固定しない。永続化は、使い心地が固まってから `app_settings` または `routines` 側で検討する。

## AUTOをデフォルトにした理由

ルーチンタイマーは、開始後に毎タスクで操作を求められるほど負担が増える。Goal 2では「最初に始めたら基本は進む」体験を正本にしたいので、AUTOを初期値にした。

## MANUALを残した理由

朝の支度や夜の支度には、確認しながら進みたいタスクもある。MANUALは常用設定ではなく、実行中の一時的な介入モードとして残した。

## 一時停止中の操作を無効化した理由

一時停止は「考える・中断する」状態なので、`スキップ` と `+30秒` はグレーアウトで無効化した。確認ダイアログは朝ルーティン中の摩擦になりやすく、誤操作防止としてはボタンの無効化で十分と判断した。

## 画面復帰対応を限定した理由

Goal 2では、残り時間を `taskEndsAtMs - Date.now()` から計算する方式へ寄せた。これにより、再描画、短時間スリープ、一時停止/再開、`+30秒` の範囲ではズレにくくなる。

一方で、長時間バックグラウンド復元、OS kill後の復元、通知からの途中復帰はセッション永続化が必要になるため、Goal 3以降に送る。

## migration v2の設計理由

Goal 1のschemaを `user_version = 1`、Goal 2を `user_version = 2` として扱う。v2では `task_logs.note` だけを追加する。

既存DBを壊さないため、`PRAGMA table_info(task_logs)` で `note` 列の有無を確認してから `ALTER TABLE` する。新規DBでも既存v1 DBでも同じv2状態へ到達できるようにした。

## 完了メモをtask_logs.noteにした理由

メモは実行結果に紐づく情報であり、タスク定義そのものではない。そのため `tasks` ではなく `task_logs` に置いた。

Goal 2ではCompletionScreen直後だけ入力可能にした。後から編集できるExecution detailは、ログ一覧や検索と一緒に設計する方が自然なのでGoal 3以降に送る。

## タスク削除をアーカイブにした理由

Goal 1で `execution_logs` と `task_logs` を保存するようになったため、タスクを物理削除すると過去ログとの関係が壊れやすい。UIでは「削除」と見せても、DB上は `tasks.archived_at` を使ってアーカイブする。

復元UIはGoal 2では作らない。普段使いの編集体験を優先し、履歴管理の複雑さは次Goal以降に回す。

## 共有カードの成功条件を分けた理由

共有機能には、PNG生成とAndroid共有シート表示という別々の失敗点がある。Goal 2では、PNG生成成功と共有シート表示成功を分けて記録し、どちらが詰まったかをQAログで判断できるようにする。

SNSへの実投稿は必須にしない。共有シートへ画像を渡せるところまでをGoal 2の成功条件にする。

## 背景素材のライセンス方針

Goal 2では外部画像を使わず、コード上の背景プリセットだけを使う。これにより、ライセンス確認や出典管理を増やさずに共有カードの体験を検証できる。

## 実機で分かったこと

未完了。AVD では Home、Detail、RunPreview までは表示確認できたが、RunPreview 上の ADB tap が enabled/clickable な Pressable に届かず、Timer/Completion の実走確認は保留した。

## 次Goalに送ること

- advanceModeの永続化判断
- 長時間バックグラウンド復元
- OS kill後の途中再開
- 通知からの途中復帰
- Execution detailと後からのメモ編集
- archived taskの復元UI
- SNS別の投稿最適化
## Physical Android verification update - 2026-06-28

Connected physical Android device `[redacted-device-id]` (`[redacted-device-model]`, Android 15 / API 35) was used for the final runtime checks in Expo Go.

Confirmed on the device:

- Timer opened in AUTO mode by default.
- AUTO time-up advanced from `2 / 6` to `3 / 6`.
- Pause state disabled `+30秒`, `スキップ`, and double-tap advance.
- MANUAL mode waited at `0:00` with `時間です` and `次へ進む`.
- `次へ進む` advanced from the MANUAL waiting state.
- CompletionScreen displayed a single share card view and selectable background presets.
- Completion notes were saved immediately after completion.
- `react-native-view-shot` generated a PNG card and `expo-sharing` opened Android's native share sheet (`com.android.intentresolver/.ChooserActivity`).

Expo Go is not debuggable, so the SQLite file could not be pulled with `run-as host.exp.exponent`. The DB note-save evidence is therefore the successful in-app save flow on the physical device plus the guarded v2 migration implementation in code.
