# Goal 4 Decision Log

Date: 2026-07-11

## Goal 4-01: Minimum total definition

The minimum duration means the shortest routine that still preserves the emergency rules.

- OPTIONAL contributes 0 seconds because it can be skipped completely.
- MUST_DO and SHRINKABLE contribute max(0, minDurationSec).
- Archived tasks remain excluded by repository queries.
- Home cards, routine detail, and RunPlan must use the same definition.

The domain rule lives in `calculateMinimumTotalSec`. RunPlan and routine detail call this function directly. The Home list keeps its SQL aggregation for one-query loading, but its CASE expression mirrors the same explicit rule.

## Test strategy

The new `verify:routine-totals` command uses the existing Playwright test runner and imports production domain functions. It does not copy the calculation into the test.

Repository SQL and Android UI consistency still require integration/device QA.

## Goal 4-02: RunPlan production-code tests

The old `scripts/verify-run-plan.mjs` contained a second implementation of the planning algorithm. It could pass even if `src/domain/runPlan.ts` regressed.

`verify:run-plan` now runs Playwright tests that import the production `createRunPlan` function. The tests lock normal mode, reverse OPTIONAL skipping, SHRINKABLE-before-MUST_DO reduction, minimum preservation, empty routines, and negative-duration normalization.

## Goal 4-03: Real SQLite migration tests

The old `scripts/verify-db-migrations.mjs` simulated tables and migrations in JavaScript. It could not prove that the SQL in `runMigrations` executed correctly.

`verify:db-migrations` now runs Playwright tests that call the production `runMigrations` function through a small adapter over Node's built-in SQLite engine. The tests cover a fresh database, a v1 database with retained task and task-log rows, and a second migration run for idempotency.

This release check requires Node.js 22.5 or later with `node:sqlite` available. It does not add an npm dependency or change the mobile runtime.

## Scope control

This change does not:

- change the SQLite schema or user_version;
- modify existing routines or execution logs;
- add notification or session-resume behavior;
- run `npm audit fix --force`;
- change the mobile SQLite implementation.
