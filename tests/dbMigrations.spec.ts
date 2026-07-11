import { expect, test } from '@playwright/test';

import { runMigrations } from '../src/db/migrations';

interface Statement {
  all: (...params: unknown[]) => unknown[];
  get: (...params: unknown[]) => unknown;
}

interface NativeDatabase {
  close: () => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => Statement;
}

interface NativeDatabaseConstructor {
  new (location: string): NativeDatabase;
}

class MigrationTestDatabase {
  constructor(private readonly database: NativeDatabase) {}

  async execAsync(sql: string) {
    this.database.exec(sql);
  }

  async getAllAsync<T>(sql: string): Promise<T[]> {
    return this.database.prepare(sql).all() as T[];
  }

  async getFirstAsync<T>(sql: string): Promise<T | null> {
    return (this.database.prepare(sql).get() as T | undefined) ?? null;
  }

  close() {
    this.database.close();
  }
}

test('fresh database reaches schema v3 and remains idempotent', async () => {
  const db = await createDatabase();
  try {
    await runMigrations(db as never);
    await runMigrations(db as never);

    expect(await userVersion(db)).toBe(3);
    await expectColumns(db, 'tasks', ['emergency_note']);
    await expectColumns(db, 'task_logs', ['note']);
  } finally {
    db.close();
  }
});

test('v1 database migrates through v2 and v3 without losing rows', async () => {
  const db = await createDatabase();
  try {
    await seedV1Database(db);

    await runMigrations(db as never);

    expect(await userVersion(db)).toBe(3);
    await expectColumns(db, 'tasks', ['emergency_note']);
    await expectColumns(db, 'task_logs', ['note']);
    expect(await firstValue(db, 'SELECT title FROM tasks WHERE id = \'task-existing\'')).toBe('既存タスク');
    expect(await firstValue(db, 'SELECT status FROM task_logs WHERE id = \'task-log-existing\'')).toBe('COMPLETED');
  } finally {
    db.close();
  }
});

async function createDatabase() {
  const DatabaseSync = await loadDatabaseSync();
  return new MigrationTestDatabase(new DatabaseSync(':memory:'));
}

async function loadDatabaseSync(): Promise<NativeDatabaseConstructor> {
  try {
    const moduleName = 'node:sqlite';
    const sqlite = (await import(moduleName)) as { DatabaseSync?: NativeDatabaseConstructor };
    if (sqlite.DatabaseSync) {
      return sqlite.DatabaseSync;
    }
  } catch {
    // The error below tells maintainers how to make this release check available.
  }

  throw new Error('verify:db-migrations requires Node.js 22.5 or later with node:sqlite available.');
}

async function expectColumns(db: MigrationTestDatabase, tableName: string, expectedColumns: string[]) {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  const columnNames = rows.map((row) => row.name);
  for (const expectedColumn of expectedColumns) {
    expect(columnNames).toContain(expectedColumn);
  }
}

async function firstValue(db: MigrationTestDatabase, sql: string) {
  const row = await db.getFirstAsync<Record<string, string>>(sql);
  return row ? Object.values(row)[0] : null;
}

async function userVersion(db: MigrationTestDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function seedV1Database(db: MigrationTestDatabase) {
  await db.execAsync(`
    CREATE TABLE tasks (
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
      archived_at TEXT
    );

    CREATE TABLE task_logs (
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
      order_index INTEGER NOT NULL
    );

    INSERT INTO tasks (
      id, routine_id, title, normal_duration_sec, min_duration_sec,
      emergency_behavior, skip_policy, shorten_policy, order_index,
      announce_thirty_sec_before, auto_advance_on_timeout, created_at, updated_at
    ) VALUES (
      'task-existing', 'routine-existing', '既存タスク', 600, 300,
      'MUST_DO', 'NEVER', 'ALLOW', 0, 1, 1,
      '2026-07-11T00:00:00.000Z', '2026-07-11T00:00:00.000Z'
    );

    INSERT INTO task_logs (
      id, execution_log_id, task_id, task_title_snapshot, planned_duration_sec,
      actual_duration_sec, status, started_at, ended_at, extension_sec, order_index
    ) VALUES (
      'task-log-existing', 'execution-existing', 'task-existing', '既存タスク', 600,
      600, 'COMPLETED', '2026-07-11T00:00:00.000Z', '2026-07-11T00:10:00.000Z', 0, 0
    );

    PRAGMA user_version = 1;
  `);
}
