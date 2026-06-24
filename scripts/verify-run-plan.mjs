const tasks = [
  task('water', '水を飲む', 60, 30, 'MUST_DO', 0),
  task('wash', '洗顔', 180, 120, 'MUST_DO', 1),
  task('dress', '着替え', 300, 180, 'SHRINKABLE', 2),
  task('hair', '身だしなみ', 600, 300, 'SHRINKABLE', 3),
  task('stretch', '軽いストレッチ', 300, 0, 'OPTIONAL', 4),
];

const plan = createRunPlan(tasks, 'EMERGENCY', 900);
assert(plan.items.find((item) => item.taskId === 'stretch').status === 'SKIPPED', 'OPTIONAL is skipped');
assert(plan.items.find((item) => item.taskId === 'hair').status === 'SHORTENED', 'SHRINKABLE is shortened');
assert(plan.plannedTotalSec <= 900, 'Plan fits target');

const impossible = createRunPlan(tasks, 'EMERGENCY', 60);
assert(impossible.warnings.includes('TARGET_TOO_SHORT'), 'Too-short target warns');
assert(impossible.plannedTotalSec >= impossible.minimumTotalSec, 'Minimum is preserved');

console.log('verify:run-plan ok');

function task(id, title, normalDurationSec, minDurationSec, emergencyBehavior, orderIndex) {
  return {
    id,
    title,
    normalDurationSec,
    minDurationSec,
    emergencyBehavior,
    orderIndex,
  };
}

function createRunPlan(rawTasks, mode, targetTotalSec) {
  const normalizedTasks = rawTasks
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => ({
      ...item,
      minDurationSec: Math.max(0, item.minDurationSec),
      normalDurationSec: Math.max(1, item.normalDurationSec, item.minDurationSec),
    }));
  const normalTotalSec = normalizedTasks.reduce((sum, item) => sum + item.normalDurationSec, 0);
  const minimumTotalSec = normalizedTasks.reduce(
    (sum, item) => sum + (item.emergencyBehavior === 'OPTIONAL' ? 0 : item.minDurationSec),
    0,
  );
  const items = normalizedTasks.map((item) => ({
    taskId: item.id,
    title: item.title,
    orderIndex: item.orderIndex,
    normalDurationSec: item.normalDurationSec,
    minDurationSec: item.minDurationSec,
    plannedDurationSec: item.normalDurationSec,
    emergencyBehavior: item.emergencyBehavior,
    status: 'PLANNED',
  }));

  if (mode === 'NORMAL') {
    return {
      mode,
      targetTotalSec: null,
      normalTotalSec,
      minimumTotalSec,
      plannedTotalSec: normalTotalSec,
      items,
      warnings: [],
    };
  }

  let currentTotal = sumPlanned(items);
  for (const item of items.slice().reverse()) {
    if (currentTotal <= targetTotalSec || item.emergencyBehavior !== 'OPTIONAL') {
      continue;
    }
    currentTotal -= item.plannedDurationSec;
    item.plannedDurationSec = 0;
    item.status = 'SKIPPED';
  }

  currentTotal = shrink(items.filter((item) => item.emergencyBehavior === 'SHRINKABLE'), targetTotalSec, currentTotal);
  currentTotal = shrink(items.filter((item) => item.emergencyBehavior === 'MUST_DO'), targetTotalSec, currentTotal);

  const warnings = [];
  if (targetTotalSec < minimumTotalSec) warnings.push('TARGET_TOO_SHORT');

  return {
    mode,
    targetTotalSec,
    normalTotalSec,
    minimumTotalSec,
    plannedTotalSec: sumPlanned(items),
    items,
    warnings,
  };
}

function shrink(items, targetTotalSec, currentTotal) {
  let nextTotal = currentTotal;
  for (const item of items) {
    if (nextTotal <= targetTotalSec) return nextTotal;
    const shrinkableSec = item.plannedDurationSec - item.minDurationSec;
    const shrinkSec = Math.min(shrinkableSec, nextTotal - targetTotalSec);
    item.plannedDurationSec -= shrinkSec;
    if (shrinkSec > 0) item.status = 'SHORTENED';
    nextTotal -= shrinkSec;
  }
  return nextTotal;
}

function sumPlanned(items) {
  return items.reduce((sum, item) => sum + item.plannedDurationSec, 0);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
