# Goal 3 Decision Log

Date: 2026-06-29

## DB v3

Goal 3 adds `tasks.emergency_note` and keeps migration guarded with `PRAGMA table_info(tasks)` before `ALTER TABLE`. The verification script `scripts/verify-db-migrations.mjs` simulates v1, v2, and v3 table states so the guarded migration path can be checked without depending on a device database pull.

## Location And Movement Hint

The user value hypothesis is that routines work better when tasks are ordered by place and movement route. A one-line hint was added to both new routine creation and task management:

`場所・移動順を意識して並べると、自然に体が動きます。`

## Task Editing

Task management uses compact rows by default and expands one row inline for editing. This keeps the task ordering screen scannable while still allowing title, duration, emergency behavior, emergency note, archive, and save actions.

## Notifications

`expo-notifications` is loaded lazily in `notificationService`. Android Expo Go throws at notification module import in SDK 53+ for notification functionality, so a top-level import would break ordinary Expo Go QA. The service now safely returns an unavailable result in Expo Go and remains ready for a development build.

## History And Snapshots

Execution detail reads from `execution_logs` and `task_logs`. It displays task title snapshots and per-task planned/actual durations so later edits to routine tasks do not rewrite history. Notes are stored on `task_logs.note`.

## Share Card Options

Completion cards now have `タスク概要` and `メモ` toggles. The options are part of the captured card view, so the PNG output can be concise or more detailed depending on what the user wants to share.

## Device QA Notes

The physical Android device was used for Goal 3. Metro needed LAN mode because `--localhost` listened on IPv6 localhost only, which did not work with `adb reverse` in this environment.

Expo Go's floating developer tools button overlaps the upper-right of the app. The routine edit button was moved inward and a second full-width `ルーティン設定` entry point was added below the start buttons to make the settings reachable in Expo Go and on small screens.
