import type { SQLiteDatabase } from 'expo-sqlite';

import type { Task } from '@/types/models';

interface TaskRow {
  id: string;
  routine_id: string;
  title: string;
  normal_duration_sec: number;
  min_duration_sec: number;
  emergency_behavior: Task['emergencyBehavior'];
  skip_policy: Task['skipPolicy'];
  shorten_policy: Task['shortenPolicy'];
  order_index: number;
  announce_thirty_sec_before: number;
  auto_advance_on_timeout: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export async function listTasksByRoutineId(db: SQLiteDatabase, routineId: string): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `
      SELECT *
      FROM tasks
      WHERE routine_id = ? AND archived_at IS NULL
      ORDER BY order_index ASC
    `,
    routineId,
  );

  return rows.map(mapTaskRow);
}

export async function upsertTask(db: SQLiteDatabase, task: Task) {
  await db.runAsync(
    `
      INSERT OR REPLACE INTO tasks (
        id,
        routine_id,
        title,
        normal_duration_sec,
        min_duration_sec,
        emergency_behavior,
        skip_policy,
        shorten_policy,
        order_index,
        announce_thirty_sec_before,
        auto_advance_on_timeout,
        created_at,
        updated_at,
        archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    task.id,
    task.routineId,
    task.title,
    task.normalDurationSec,
    task.minDurationSec,
    task.emergencyBehavior,
    task.skipPolicy,
    task.shortenPolicy,
    task.orderIndex,
    task.announceThirtySecBefore ? 1 : 0,
    task.autoAdvanceOnTimeout ? 1 : 0,
    task.createdAt,
    task.updatedAt,
    task.archivedAt ?? null,
  );
}

export async function updateTaskDetails(
  db: SQLiteDatabase,
  taskId: string,
  values: Pick<
    Task,
    'title' | 'normalDurationSec' | 'minDurationSec' | 'emergencyBehavior' | 'skipPolicy' | 'shortenPolicy'
  >,
) {
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `
      UPDATE tasks
      SET
        title = ?,
        normal_duration_sec = ?,
        min_duration_sec = ?,
        emergency_behavior = ?,
        skip_policy = ?,
        shorten_policy = ?,
        updated_at = ?
      WHERE id = ? AND archived_at IS NULL
    `,
    values.title,
    values.normalDurationSec,
    values.minDurationSec,
    values.emergencyBehavior,
    values.skipPolicy,
    values.shortenPolicy,
    nowIso,
    taskId,
  );
}

export async function archiveTask(db: SQLiteDatabase, taskId: string) {
  const nowIso = new Date().toISOString();
  await db.runAsync(
    'UPDATE tasks SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL',
    nowIso,
    nowIso,
    taskId,
  );
}

export async function moveTask(db: SQLiteDatabase, routineId: string, taskId: string, direction: 'UP' | 'DOWN') {
  const tasks = await listTasksByRoutineId(db, routineId);
  const currentIndex = tasks.findIndex((task) => task.id === taskId);
  const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= tasks.length) {
    return;
  }

  const reordered = tasks.slice();
  const [currentTask] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, currentTask);
  const nowIso = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const [index, task] of reordered.entries()) {
      await db.runAsync(
        'UPDATE tasks SET order_index = ?, updated_at = ? WHERE id = ?',
        index,
        nowIso,
        task.id,
      );
    }
  });
}

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    routineId: row.routine_id,
    title: row.title,
    normalDurationSec: row.normal_duration_sec,
    minDurationSec: row.min_duration_sec,
    emergencyBehavior: row.emergency_behavior,
    skipPolicy: row.skip_policy,
    shortenPolicy: row.shorten_policy,
    orderIndex: row.order_index,
    announceThirtySecBefore: row.announce_thirty_sec_before === 1,
    autoAdvanceOnTimeout: row.auto_advance_on_timeout === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}
