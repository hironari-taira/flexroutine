import type { SQLiteDatabase } from 'expo-sqlite';

export async function getSetting(db: SQLiteDatabase, key: string) {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    `
      INSERT OR REPLACE INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `,
    key,
    value,
    new Date().toISOString(),
  );
}
