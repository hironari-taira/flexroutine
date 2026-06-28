import type { SQLiteDatabase } from 'expo-sqlite';

import type { ExecutionLog, TaskLog } from '@/types/models';

interface ExecutionLogRow {
  id: string;
  routine_id: string;
  routine_title: string | null;
  mode: ExecutionLog['mode'];
  status: ExecutionLog['status'];
  target_total_sec: number | null;
  planned_total_sec: number;
  actual_total_sec: number | null;
  started_at: string;
  completed_at: string | null;
  pause_total_sec: number;
  used_emergency: number;
  optional_note: string | null;
  completed_count?: number;
  skipped_count?: number;
}

interface TaskLogRow {
  id: string;
  execution_log_id: string;
  task_id: string;
  task_title_snapshot: string;
  planned_duration_sec: number;
  actual_duration_sec: number | null;
  status: TaskLog['status'];
  started_at: string;
  ended_at: string | null;
  extension_sec: number;
  order_index: number;
  note: string | null;
}

export async function createExecutionLog(db: SQLiteDatabase, log: ExecutionLog) {
  await db.runAsync(
    `
      INSERT INTO execution_logs (
        id,
        routine_id,
        mode,
        status,
        target_total_sec,
        planned_total_sec,
        actual_total_sec,
        started_at,
        completed_at,
        pause_total_sec,
        used_emergency,
        optional_note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    log.id,
    log.routineId,
    log.mode,
    log.status,
    log.targetTotalSec ?? null,
    log.plannedTotalSec,
    log.actualTotalSec ?? null,
    log.startedAt,
    log.completedAt ?? null,
    log.pauseTotalSec,
    log.usedEmergency ? 1 : 0,
    log.optionalNote ?? null,
  );
}

export async function createTaskLogs(db: SQLiteDatabase, logs: TaskLog[]) {
  for (const log of logs) {
    await db.runAsync(
      `
        INSERT INTO task_logs (
          id,
          execution_log_id,
          task_id,
          task_title_snapshot,
          planned_duration_sec,
          actual_duration_sec,
          status,
          started_at,
          ended_at,
          extension_sec,
          order_index,
          note
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      log.id,
      log.executionLogId,
      log.taskId,
      log.taskTitleSnapshot,
      log.plannedDurationSec,
      log.actualDurationSec ?? null,
      log.status,
      log.startedAt,
      log.endedAt ?? null,
      log.extensionSec,
      log.orderIndex,
      log.note ?? null,
    );
  }
}

export async function saveExecutionWithTaskLogs(
  db: SQLiteDatabase,
  executionLog: ExecutionLog,
  taskLogs: TaskLog[],
) {
  await db.withTransactionAsync(async () => {
    await createExecutionLog(db, executionLog);
    await createTaskLogs(db, taskLogs);
  });
}

export async function getExecutionLogCount(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM execution_logs');
  return row?.count ?? 0;
}

export async function getEmergencyLogCount(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM execution_logs WHERE used_emergency = 1 AND status = 'COMPLETED'",
  );
  return row?.count ?? 0;
}

export async function getMostSkippedTask(db: SQLiteDatabase) {
  return db.getFirstAsync<{ taskTitle: string; count: number }>(`
    SELECT task_title_snapshot AS taskTitle, COUNT(*) AS count
    FROM task_logs
    WHERE status = 'SKIPPED'
    GROUP BY task_title_snapshot
    ORDER BY count DESC
    LIMIT 1
  `);
}

export async function listTaskLogsByExecutionLogId(
  db: SQLiteDatabase,
  executionLogId: string,
): Promise<TaskLog[]> {
  const rows = await db.getAllAsync<TaskLogRow>(
    `
      SELECT *
      FROM task_logs
      WHERE execution_log_id = ?
      ORDER BY order_index ASC
    `,
    executionLogId,
  );

  return rows.map(mapTaskLogRow);
}

export interface ExecutionLogSummary extends ExecutionLog {
  completedCount: number;
  routineTitle: string;
  skippedCount: number;
}

export async function listExecutionLogSummaries(db: SQLiteDatabase): Promise<ExecutionLogSummary[]> {
  const rows = await db.getAllAsync<ExecutionLogRow>(
    `
      SELECT
        execution_logs.*,
        routines.title AS routine_title,
        SUM(CASE WHEN task_logs.status != 'SKIPPED' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN task_logs.status = 'SKIPPED' THEN 1 ELSE 0 END) AS skipped_count
      FROM execution_logs
      LEFT JOIN routines ON routines.id = execution_logs.routine_id
      LEFT JOIN task_logs ON task_logs.execution_log_id = execution_logs.id
      GROUP BY execution_logs.id
      ORDER BY execution_logs.started_at DESC
      LIMIT 50
    `,
  );

  return rows.map((row) => ({
    ...mapExecutionLogRow(row),
    completedCount: row.completed_count ?? 0,
    routineTitle: row.routine_title ?? 'ルーティン',
    skippedCount: row.skipped_count ?? 0,
  }));
}

export async function getExecutionLogById(
  db: SQLiteDatabase,
  executionLogId: string,
): Promise<ExecutionLogSummary | null> {
  const row = await db.getFirstAsync<ExecutionLogRow>(
    `
      SELECT
        execution_logs.*,
        routines.title AS routine_title,
        SUM(CASE WHEN task_logs.status != 'SKIPPED' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN task_logs.status = 'SKIPPED' THEN 1 ELSE 0 END) AS skipped_count
      FROM execution_logs
      LEFT JOIN routines ON routines.id = execution_logs.routine_id
      LEFT JOIN task_logs ON task_logs.execution_log_id = execution_logs.id
      WHERE execution_logs.id = ?
      GROUP BY execution_logs.id
    `,
    executionLogId,
  );

  if (!row) {
    return null;
  }

  return {
    ...mapExecutionLogRow(row),
    completedCount: row.completed_count ?? 0,
    routineTitle: row.routine_title ?? 'ルーティン',
    skippedCount: row.skipped_count ?? 0,
  };
}

export async function updateTaskLogNotes(
  db: SQLiteDatabase,
  notes: { note: string | null; taskLogId: string }[],
) {
  await db.withTransactionAsync(async () => {
    for (const item of notes) {
      await db.runAsync('UPDATE task_logs SET note = ? WHERE id = ?', item.note, item.taskLogId);
    }
  });
}

function mapTaskLogRow(row: TaskLogRow): TaskLog {
  return {
    id: row.id,
    executionLogId: row.execution_log_id,
    taskId: row.task_id,
    taskTitleSnapshot: row.task_title_snapshot,
    plannedDurationSec: row.planned_duration_sec,
    actualDurationSec: row.actual_duration_sec,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    extensionSec: row.extension_sec,
    orderIndex: row.order_index,
    note: row.note,
  };
}

function mapExecutionLogRow(row: ExecutionLogRow): ExecutionLog {
  return {
    id: row.id,
    routineId: row.routine_id,
    mode: row.mode,
    status: row.status,
    targetTotalSec: row.target_total_sec,
    plannedTotalSec: row.planned_total_sec,
    actualTotalSec: row.actual_total_sec,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    pauseTotalSec: row.pause_total_sec,
    usedEmergency: row.used_emergency === 1,
    optionalNote: row.optional_note,
  };
}
