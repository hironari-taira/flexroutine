import type { SQLiteDatabase } from 'expo-sqlite';

import { listTasksByRoutineId } from '@/db/repositories/taskRepository';
import type { Routine, Task } from '@/types/models';

interface RoutineRow {
  id: string;
  title: string;
  context: Routine['context'];
  icon: string | null;
  sort_index: number;
  default_start_time: string | null;
  notification_enabled: number;
  notification_time: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface RoutineCardView extends Routine {
  taskCount: number;
  normalTotalSec: number;
  minimumTotalSec: number;
  recentAverageSec: number | null;
}

export interface RoutineWithTasks extends RoutineCardView {
  tasks: Task[];
}

export async function listRoutineCards(db: SQLiteDatabase): Promise<RoutineCardView[]> {
  const rows = await db.getAllAsync<RoutineRow & { task_count: number; normal_total_sec: number; minimum_total_sec: number }>(`
    SELECT
      routines.*,
      COUNT(tasks.id) AS task_count,
      COALESCE(SUM(tasks.normal_duration_sec), 0) AS normal_total_sec,
      COALESCE(SUM(tasks.min_duration_sec), 0) AS minimum_total_sec
    FROM routines
    LEFT JOIN tasks ON tasks.routine_id = routines.id AND tasks.archived_at IS NULL
    WHERE routines.archived_at IS NULL
    GROUP BY routines.id
    ORDER BY routines.sort_index ASC
  `);

  return rows.map((row) => ({
    ...mapRoutineRow(row),
    taskCount: row.task_count,
    normalTotalSec: row.normal_total_sec,
    minimumTotalSec: row.minimum_total_sec,
    recentAverageSec: null,
  }));
}

export async function getRoutineWithTasks(
  db: SQLiteDatabase,
  routineId: string,
): Promise<RoutineWithTasks | null> {
  const routine = await db.getFirstAsync<RoutineRow>(
    'SELECT * FROM routines WHERE id = ? AND archived_at IS NULL',
    routineId,
  );

  if (!routine) {
    return null;
  }

  const tasks = await listTasksByRoutineId(db, routineId);
  const normalTotalSec = tasks.reduce((sum, task) => sum + task.normalDurationSec, 0);
  const minimumTotalSec = tasks.reduce((sum, task) => sum + task.minDurationSec, 0);

  return {
    ...mapRoutineRow(routine),
    taskCount: tasks.length,
    normalTotalSec,
    minimumTotalSec,
    recentAverageSec: null,
    tasks,
  };
}

export async function upsertRoutine(db: SQLiteDatabase, routine: Routine) {
  await db.runAsync(
    `
      INSERT OR REPLACE INTO routines (
        id,
        title,
        context,
        icon,
        sort_index,
        default_start_time,
        notification_enabled,
        notification_time,
        created_at,
        updated_at,
        archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    routine.id,
    routine.title,
    routine.context,
    routine.icon ?? null,
    routine.sortIndex,
    routine.defaultStartTime ?? null,
    routine.notificationEnabled ? 1 : 0,
    routine.notificationTime ?? null,
    routine.createdAt,
    routine.updatedAt,
    routine.archivedAt ?? null,
  );
}

export async function updateRoutineDetails(
  db: SQLiteDatabase,
  routineId: string,
  values: Pick<
    Routine,
    'title' | 'context' | 'icon' | 'defaultStartTime' | 'notificationEnabled' | 'notificationTime'
  >,
) {
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `
      UPDATE routines
      SET
        title = ?,
        context = ?,
        icon = ?,
        default_start_time = ?,
        notification_enabled = ?,
        notification_time = ?,
        updated_at = ?
      WHERE id = ? AND archived_at IS NULL
    `,
    values.title,
    values.context,
    values.icon ?? null,
    values.defaultStartTime ?? null,
    values.notificationEnabled ? 1 : 0,
    values.notificationTime ?? null,
    nowIso,
    routineId,
  );
}

export async function archiveRoutine(db: SQLiteDatabase, routineId: string) {
  const nowIso = new Date().toISOString();
  await db.runAsync(
    'UPDATE routines SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL',
    nowIso,
    nowIso,
    routineId,
  );
}

function mapRoutineRow(row: RoutineRow): Routine {
  return {
    id: row.id,
    title: row.title,
    context: row.context,
    icon: row.icon ?? undefined,
    sortIndex: row.sort_index,
    defaultStartTime: row.default_start_time,
    notificationEnabled: row.notification_enabled === 1,
    notificationTime: row.notification_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}
