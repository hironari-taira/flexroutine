import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting } from '@/db/repositories/settingsRepository';
import { upsertRoutine } from '@/db/repositories/routineRepository';
import { upsertTask } from '@/db/repositories/taskRepository';
import type { Routine, Task } from '@/types/models';

const SEED_KEY = 'sample_routines_seeded_v1';
const SEED_TIMESTAMP = '2026-06-20T00:00:00.000Z';

interface SampleRoutine {
  routine: Routine;
  tasks: Task[];
}

export async function seedSampleRoutinesIfNeeded(db: SQLiteDatabase) {
  const seeded = await getSetting(db, SEED_KEY);
  if (seeded === 'true') {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (const sample of sampleRoutines) {
      await upsertRoutine(db, sample.routine);
      for (const task of sample.tasks) {
        await upsertTask(db, task);
      }
    }

    await setSetting(db, SEED_KEY, 'true');
  });
}

const sampleRoutines: SampleRoutine[] = [
  buildSample('morning', '朝の支度', 'MORNING', '07:20', '☀️', 0, [
    ['水を飲む', 60, 30, 'MUST_DO'],
    ['洗顔', 180, 120, 'MUST_DO'],
    ['歯磨き', 180, 120, 'MUST_DO'],
    ['着替え', 300, 180, 'SHRINKABLE'],
    ['身だしなみ', 600, 300, 'SHRINKABLE'],
    ['カバン確認', 180, 120, 'MUST_DO'],
    ['軽いストレッチ', 300, 0, 'OPTIONAL'],
  ]),
  buildSample('night', '夜の支度', 'NIGHT', '22:30', '🌙', 1, [
    ['明日の予定を見る', 120, 60, 'MUST_DO'],
    ['部屋を少し戻す', 300, 0, 'OPTIONAL'],
    ['歯磨き', 180, 120, 'MUST_DO'],
    ['洗顔・保湿', 300, 180, 'SHRINKABLE'],
    ['明日の服を置く', 180, 60, 'SHRINKABLE'],
    ['アラーム確認', 120, 60, 'MUST_DO'],
  ]),
  buildSample('work-start', '仕事開始前', 'WORK_START', '08:55', '💻', 2, [
    ['水を用意', 60, 30, 'MUST_DO'],
    ['机の上を戻す', 120, 0, 'OPTIONAL'],
    ['今日の予定を見る', 120, 60, 'MUST_DO'],
    ['最初のタスクを1つ決める', 180, 60, 'MUST_DO'],
    ['通知を切る', 60, 30, 'SHRINKABLE'],
    ['作業開始', 60, 30, 'MUST_DO'],
  ]),
];

function buildSample(
  id: string,
  title: Routine['title'],
  context: Routine['context'],
  notificationTime: string,
  icon: string,
  sortIndex: number,
  taskDefs: [string, number, number, Task['emergencyBehavior']][],
): SampleRoutine {
  const routine: Routine = {
    id,
    title,
    context,
    icon,
    sortIndex,
    defaultStartTime: notificationTime,
    notificationEnabled: true,
    notificationTime,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    archivedAt: null,
  };

  const tasks = taskDefs.map(([taskTitle, normalDurationSec, minDurationSec, emergencyBehavior], index) => {
    const canSkip = emergencyBehavior === 'OPTIONAL';
    const canShorten = emergencyBehavior !== 'MUST_DO' || minDurationSec < normalDurationSec;

    return {
      id: `${id}-task-${index + 1}`,
      routineId: id,
      title: taskTitle,
      normalDurationSec,
      minDurationSec,
      emergencyBehavior,
      skipPolicy: canSkip ? 'EMERGENCY_ONLY' : 'NEVER',
      shortenPolicy: canShorten ? 'ALLOW' : 'NEVER',
      orderIndex: index,
      announceThirtySecBefore: true,
      autoAdvanceOnTimeout: true,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
      archivedAt: null,
    } satisfies Task;
  });

  return { routine, tasks };
}
