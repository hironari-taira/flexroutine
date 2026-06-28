import type { SQLiteDatabase } from 'expo-sqlite';

import type { ExecutionLog, TaskLog } from '@/types/models';

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
