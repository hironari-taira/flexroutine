import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 2;

export async function runMigrations(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        context TEXT NOT NULL,
        icon TEXT,
        sort_index INTEGER NOT NULL DEFAULT 0,
        default_start_time TEXT,
        notification_enabled INTEGER NOT NULL DEFAULT 0,
        notification_time TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        routine_id TEXT NOT NULL,
        title TEXT NOT NULL,
        normal_duration_sec INTEGER NOT NULL,
        min_duration_sec INTEGER NOT NULL,
        emergency_behavior TEXT NOT NULL,
        skip_policy TEXT NOT NULL,
        shorten_policy TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        announce_thirty_sec_before INTEGER NOT NULL DEFAULT 1,
        auto_advance_on_timeout INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT,
        FOREIGN KEY (routine_id) REFERENCES routines(id)
      );

      CREATE TABLE IF NOT EXISTS execution_logs (
        id TEXT PRIMARY KEY,
        routine_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        target_total_sec INTEGER,
        planned_total_sec INTEGER NOT NULL,
        actual_total_sec INTEGER,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        pause_total_sec INTEGER NOT NULL DEFAULT 0,
        used_emergency INTEGER NOT NULL DEFAULT 0,
        optional_note TEXT,
        FOREIGN KEY (routine_id) REFERENCES routines(id)
      );

      CREATE TABLE IF NOT EXISTS task_logs (
        id TEXT PRIMARY KEY,
        execution_log_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        task_title_snapshot TEXT NOT NULL,
        planned_duration_sec INTEGER NOT NULL,
        actual_duration_sec INTEGER,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        extension_sec INTEGER NOT NULL DEFAULT 0,
        order_index INTEGER NOT NULL,
        FOREIGN KEY (execution_log_id) REFERENCES execution_logs(id)
      );

      CREATE TABLE IF NOT EXISTS suggestions (
        id TEXT PRIMARY KEY,
        routine_id TEXT NOT NULL,
        task_id TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (routine_id) REFERENCES routines(id)
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS tasks_routine_order_idx ON tasks (routine_id, order_index);
      CREATE INDEX IF NOT EXISTS routines_sort_idx ON routines (archived_at, sort_index);
    `);
  }

  if (currentVersion < 2) {
    await addColumnIfMissing(db, 'task_logs', 'note', 'TEXT');
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

async function addColumnIfMissing(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
  columnDefinition: string,
) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
}
