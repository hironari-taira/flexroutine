import type { SQLiteDatabase } from 'expo-sqlite';

import type { Suggestion } from '@/types/models';

interface SuggestionRow {
  id: string;
  routine_id: string;
  task_id: string | null;
  type: Suggestion['type'];
  status: Suggestion['status'];
  title: string;
  body: string;
  payload_json: string;
  created_at: string;
  updated_at: string;
}

export async function listActiveSuggestions(db: SQLiteDatabase): Promise<Suggestion[]> {
  const rows = await db.getAllAsync<SuggestionRow>(
    "SELECT * FROM suggestions WHERE status = 'ACTIVE' ORDER BY created_at DESC",
  );

  return rows.map((row) => ({
    id: row.id,
    routineId: row.routine_id,
    taskId: row.task_id,
    type: row.type,
    status: row.status,
    title: row.title,
    body: row.body,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
