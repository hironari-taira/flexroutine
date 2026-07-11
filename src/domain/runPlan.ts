import { calculateMinimumTotalSec } from '@/domain/routineTotals';
import type { EmergencyBehavior, RunMode, Task } from '@/types/models';

export type RunPlanWarning =
  | 'TARGET_TOO_SHORT'
  | 'NO_TASKS'
  | 'HAS_SKIPPED_TASKS'
  | 'HAS_SHORTENED_TASKS';

export interface RunPlanItem {
  taskId: string;
  title: string;
  orderIndex: number;
  normalDurationSec: number;
  minDurationSec: number;
  emergencyNote?: string | null;
  plannedDurationSec: number;
  emergencyBehavior: EmergencyBehavior;
  status: 'PLANNED' | 'SHORTENED' | 'SKIPPED';
}

export interface RunPlan {
  mode: RunMode;
  targetTotalSec: number | null;
  normalTotalSec: number;
  minimumTotalSec: number;
  plannedTotalSec: number;
  savedTotalSec: number;
  items: RunPlanItem[];
  warnings: RunPlanWarning[];
}

export function createRunPlan(tasks: Task[], mode: RunMode, targetTotalSec?: number | null): RunPlan {
  const normalizedTasks = tasks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(normalizeTaskDuration);

  const normalTotalSec = normalizedTasks.reduce((sum, task) => sum + task.normalDurationSec, 0);
  const minimumTotalSec = calculateMinimumTotalSec(normalizedTasks);

  if (normalizedTasks.length === 0) {
    return {
      mode,
      targetTotalSec: mode === 'EMERGENCY' ? Math.max(0, targetTotalSec ?? 0) : null,
      normalTotalSec: 0,
      minimumTotalSec: 0,
      plannedTotalSec: 0,
      savedTotalSec: 0,
      items: [],
      warnings: ['NO_TASKS'],
    };
  }

  if (mode === 'NORMAL') {
    const items = normalizedTasks.map<RunPlanItem>((task) => ({
      taskId: task.id,
      title: task.title,
      orderIndex: task.orderIndex,
      normalDurationSec: task.normalDurationSec,
      minDurationSec: task.minDurationSec,
      emergencyNote: task.emergencyNote ?? null,
      plannedDurationSec: task.normalDurationSec,
      emergencyBehavior: task.emergencyBehavior,
      status: 'PLANNED',
    }));

    return {
      mode,
      targetTotalSec: null,
      normalTotalSec,
      minimumTotalSec,
      plannedTotalSec: normalTotalSec,
      savedTotalSec: 0,
      items,
      warnings: [],
    };
  }

  const safeTarget = Math.max(1, Math.floor(targetTotalSec ?? normalTotalSec));
  const items = normalizedTasks.map<RunPlanItem>((task) => ({
    taskId: task.id,
    title: task.title,
    orderIndex: task.orderIndex,
    normalDurationSec: task.normalDurationSec,
    minDurationSec: task.minDurationSec,
    emergencyNote: task.emergencyNote ?? null,
    plannedDurationSec: task.normalDurationSec,
    emergencyBehavior: task.emergencyBehavior,
    status: 'PLANNED',
  }));

  reduceEmergencyPlan(items, safeTarget);

  const plannedTotalSec = sumPlanned(items);
  const warnings: RunPlanWarning[] = [];

  if (safeTarget < minimumTotalSec) {
    warnings.push('TARGET_TOO_SHORT');
  }
  if (items.some((item) => item.status === 'SKIPPED')) {
    warnings.push('HAS_SKIPPED_TASKS');
  }
  if (items.some((item) => item.status === 'SHORTENED')) {
    warnings.push('HAS_SHORTENED_TASKS');
  }

  return {
    mode,
    targetTotalSec: safeTarget,
    normalTotalSec,
    minimumTotalSec,
    plannedTotalSec,
    savedTotalSec: normalTotalSec - plannedTotalSec,
    items,
    warnings,
  };
}

function reduceEmergencyPlan(items: RunPlanItem[], targetTotalSec: number) {
  let plannedTotalSec = sumPlanned(items);

  if (plannedTotalSec <= targetTotalSec) {
    return;
  }

  for (const item of items.slice().reverse()) {
    if (plannedTotalSec <= targetTotalSec) {
      return;
    }
    if (item.emergencyBehavior !== 'OPTIONAL') {
      continue;
    }
    plannedTotalSec -= item.plannedDurationSec;
    item.plannedDurationSec = 0;
    item.status = 'SKIPPED';
  }

  plannedTotalSec = shrinkItems(
    items.filter((item) => item.emergencyBehavior === 'SHRINKABLE' && item.status !== 'SKIPPED'),
    targetTotalSec,
    plannedTotalSec,
  );

  shrinkItems(
    items.filter((item) => item.emergencyBehavior === 'MUST_DO' && item.status !== 'SKIPPED'),
    targetTotalSec,
    plannedTotalSec,
  );
}

function shrinkItems(items: RunPlanItem[], targetTotalSec: number, currentTotalSec: number) {
  let plannedTotalSec = currentTotalSec;

  for (const item of items) {
    if (plannedTotalSec <= targetTotalSec) {
      return plannedTotalSec;
    }
    const shrinkableSec = item.plannedDurationSec - item.minDurationSec;
    if (shrinkableSec <= 0) {
      continue;
    }
    const shrinkSec = Math.min(shrinkableSec, plannedTotalSec - targetTotalSec);
    item.plannedDurationSec -= shrinkSec;
    item.status = item.plannedDurationSec < item.normalDurationSec ? 'SHORTENED' : 'PLANNED';
    plannedTotalSec -= shrinkSec;
  }

  return plannedTotalSec;
}

function normalizeTaskDuration(task: Task): Task {
  const minDurationSec = Math.max(0, task.minDurationSec);
  const normalDurationSec = Math.max(1, task.normalDurationSec, minDurationSec);

  return {
    ...task,
    normalDurationSec,
    minDurationSec,
  };
}

function sumPlanned(items: RunPlanItem[]) {
  return items.reduce((sum, item) => sum + item.plannedDurationSec, 0);
}

