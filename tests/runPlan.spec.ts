import { expect, test } from '@playwright/test';

import { createRunPlan } from '../src/domain/runPlan';
import type { EmergencyBehavior, Task } from '../src/types/models';

test('normal mode keeps every task at its normalized duration', () => {
  const plan = createRunPlan(sampleTasks, 'NORMAL');

  expect(plan.targetTotalSec).toBeNull();
  expect(plan.plannedTotalSec).toBe(plan.normalTotalSec);
  expect(plan.savedTotalSec).toBe(0);
  expect(plan.items.every((item) => item.status === 'PLANNED')).toBe(true);
});

test('emergency mode skips OPTIONAL tasks from the end first', () => {
  const tasks = [
    task('must', 600, 300, 'MUST_DO', 0),
    task('optional-first', 120, 0, 'OPTIONAL', 1),
    task('optional-last', 180, 0, 'OPTIONAL', 2),
  ];

  const plan = createRunPlan(tasks, 'EMERGENCY', 720);

  expect(item(plan, 'optional-first').status).toBe('PLANNED');
  expect(item(plan, 'optional-last').status).toBe('SKIPPED');
  expect(plan.plannedTotalSec).toBe(720);
});

test('SHRINKABLE tasks are shortened before MUST_DO tasks', () => {
  const tasks = [
    task('must', 600, 300, 'MUST_DO', 0),
    task('shrink', 600, 300, 'SHRINKABLE', 1),
  ];

  const plan = createRunPlan(tasks, 'EMERGENCY', 900);

  expect(item(plan, 'must').plannedDurationSec).toBe(600);
  expect(item(plan, 'must').status).toBe('PLANNED');
  expect(item(plan, 'shrink').plannedDurationSec).toBe(300);
  expect(item(plan, 'shrink').status).toBe('SHORTENED');
});

test('targets below the minimum warn without breaking minimum durations', () => {
  const plan = createRunPlan(sampleTasks, 'EMERGENCY', 60);

  expect(plan.warnings).toContain('TARGET_TOO_SHORT');
  expect(plan.plannedTotalSec).toBeGreaterThanOrEqual(plan.minimumTotalSec);
  for (const plannedItem of plan.items.filter((plannedItem) => plannedItem.status !== 'SKIPPED')) {
    expect(plannedItem.plannedDurationSec).toBeGreaterThanOrEqual(plannedItem.minDurationSec);
  }
});

test('an empty routine returns NO_TASKS without throwing', () => {
  const plan = createRunPlan([], 'EMERGENCY', 300);

  expect(plan.items).toEqual([]);
  expect(plan.plannedTotalSec).toBe(0);
  expect(plan.warnings).toEqual(['NO_TASKS']);
});

test('invalid negative durations are normalized before planning', () => {
  const plan = createRunPlan([task('negative', -10, -20, 'MUST_DO', 0)], 'NORMAL');

  expect(plan.normalTotalSec).toBe(1);
  expect(plan.minimumTotalSec).toBe(0);
  expect(plan.items[0].normalDurationSec).toBe(1);
  expect(plan.items[0].minDurationSec).toBe(0);
});

const sampleTasks = [
  task('water', 60, 30, 'MUST_DO', 0),
  task('wash', 180, 120, 'MUST_DO', 1),
  task('dress', 300, 180, 'SHRINKABLE', 2),
  task('hair', 600, 300, 'SHRINKABLE', 3),
  task('stretch', 300, 180, 'OPTIONAL', 4),
];

function item(plan: ReturnType<typeof createRunPlan>, taskId: string) {
  const plannedItem = plan.items.find((candidate) => candidate.taskId === taskId);
  if (!plannedItem) {
    throw new Error(`Missing plan item: ${taskId}`);
  }
  return plannedItem;
}

function task(
  id: string,
  normalDurationSec: number,
  minDurationSec: number,
  emergencyBehavior: EmergencyBehavior,
  orderIndex: number,
): Task {
  return {
    id,
    routineId: 'routine-test',
    title: id,
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
