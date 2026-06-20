import type { SQLiteDatabase } from 'expo-sqlite';

import type { ExecutionLog } from '@/types/models';

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
