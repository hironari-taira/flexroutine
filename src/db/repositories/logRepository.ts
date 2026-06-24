import type { SQLiteDatabase } from 'expo-sqlite';

import type { ExecutionLog, TaskLog } from '@/types/models';

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
          order_index
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
