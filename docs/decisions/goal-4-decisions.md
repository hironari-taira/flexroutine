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

## Scope control

This change does not:

- change the SQLite schema or user_version;
- modify existing routines or execution logs;
- add notification or session-resume behavior;
- run `npm audit fix --force`;
- push changes to GitHub.
