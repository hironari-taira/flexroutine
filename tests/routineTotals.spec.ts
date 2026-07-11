import { expect, test } from '@playwright/test';

import { createRunPlan } from '../src/domain/runPlan';
import { calculateMinimumTotalSec } from '../src/domain/routineTotals';
import type { EmergencyBehavior, Task } from '../src/types/models';

test('no tasks have a zero minimum', () => {
  expect(calculateMinimumTotalSec([])).toBe(0);
});

test('MUST_DO contributes its minimum duration', () => {
  expect(calculateMinimumTotalSec([minimumTask('MUST_DO', 300)])).toBe(300);
});

test('OPTIONAL never contributes to the emergency minimum', () => {
  expect(calculateMinimumTotalSec([minimumTask('OPTIONAL', 180)])).toBe(0);
});

test('mixed tasks only count MUST_DO and SHRINKABLE', () => {
  expect(calculateMinimumTotalSec(mixedTasks)).toBe(600);
});

test('negative minimum durations are normalized to zero', () => {
  expect(calculateMinimumTotalSec([minimumTask('MUST_DO', -30)])).toBe(0);
});

test('task order does not change the minimum total', () => {
  expect(calculateMinimumTotalSec(mixedTasks.slice().reverse())).toBe(600);
});

test('RunPlan uses the shared minimum-total definition', () => {
  const plan = createRunPlan(mixedTasks, 'EMERGENCY', 1);

  expect(plan.minimumTotalSec).toBe(calculateMinimumTotalSec(mixedTasks));
  expect(plan.warnings).toContain('TARGET_TOO_SHORT');
});

const mixedTasks = [
  task('must', '絶対やる', 600, 300, 'MUST_DO', 2),
  task('shrink', '短くしてやる', 600, 300, 'SHRINKABLE', 1),
  task('optional', '余裕があれば', 300, 180, 'OPTIONAL', 0),
];

function minimumTask(emergencyBehavior: EmergencyBehavior, minDurationSec: number) {
  return { emergencyBehavior, minDurationSec };
}

function task(
  id: string,
  title: string,
  normalDurationSec: number,
  minDurationSec: number,
  emergencyBehavior: EmergencyBehavior,
  orderIndex: number,
): Task {
  return {
    id,
    routineId: 'routine-test',
    title,
    normalDurationSec,
    minDurationSec,
    emergencyBehavior,
    skipPolicy: emergencyBehavior === 'OPTIONAL' ? 'EMERGENCY_ONLY' : 'NEVER',
    shortenPolicy: emergencyBehavior === 'OPTIONAL' ? 'NEVER' : 'ALLOW',
    orderIndex,
    announceThirtySecBefore: true,
    autoAdvanceOnTimeout: true,
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
    archivedAt: null,
  };
}
