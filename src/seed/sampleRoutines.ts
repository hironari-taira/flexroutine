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
    ['水を飲む', 60, 30, 'MUST_DO', null],
    ['洗顔', 180, 120, 'MUST_DO', null],
    ['歯磨き', 180, 120, 'MUST_DO', null],
    ['着替え', 300, 180, 'SHRINKABLE', '服だけ決める'],
    ['身だしなみ', 600, 300, 'SHRINKABLE', '髪だけ整える'],
    ['カバン確認', 180, 120, 'MUST_DO', null],
    ['軽いストレッチ', 300, 0, 'OPTIONAL', null],
  ]),
  buildSample('night', '夜の支度', 'NIGHT', '22:30', '🌙', 1, [
    ['明日の予定を見る', 120, 60, 'MUST_DO', null],
    ['部屋を少し戻す', 300, 0, 'OPTIONAL', null],
    ['歯磨き', 180, 120, 'MUST_DO', null],
    ['洗顔と保湿', 300, 180, 'SHRINKABLE', '保湿だけはする'],
    ['明日の服を置く', 180, 60, 'SHRINKABLE', '上だけ決める'],
    ['アラーム確認', 120, 60, 'MUST_DO', null],
  ]),
  buildSample('work-start', '仕事開始前', 'WORK_START', '08:55', '💻', 2, [
    ['水を用意', 60, 30, 'MUST_DO', null],
    ['机の上を戻す', 120, 0, 'OPTIONAL', null],
    ['今日の予定を見る', 120, 60, 'MUST_DO', null],
    ['最初のタスクを1つ決める', 180, 60, 'MUST_DO', null],
    ['通知を切る', 60, 30, 'SHRINKABLE', '集中を邪魔する通知だけ切る'],
    ['作業開始', 60, 30, 'MUST_DO', null],
  ]),
];

function buildSample(
  id: string,
  title: Routine['title'],
  context: Routine['context'],
  notificationTime: string,
  icon: string,
  sortIndex: number,
  taskDefs: [string, number, number, Task['emergencyBehavior'], string | null][],
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
    archivedAt: null,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  };

  const tasks: Task[] = taskDefs.map(([taskTitle, normalSec, minimumSec, emergencyBehavior, emergencyNote], index) => ({
    id: `${id}-task-${index + 1}`,
    routineId: id,
    title: taskTitle,
    normalDurationSec: normalSec,
    minDurationSec: minimumSec,
    emergencyBehavior,
    emergencyNote,
    skipPolicy:
      emergencyBehavior === 'OPTIONAL'
        ? 'EMERGENCY_ONLY'
        : 'NEVER',
    shortenPolicy:
      emergencyBehavior === 'SHRINKABLE'
        ? 'ALLOW'
        : 'NEVER',
    orderIndex: index,
    announceThirtySecBefore: true,
    autoAdvanceOnTimeout: false,
    archivedAt: null,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  }));

  return { routine, tasks };
}
