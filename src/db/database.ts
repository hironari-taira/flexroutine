import * as SQLite from 'expo-sqlite';

import { runMigrations } from '@/db/migrations';
import { seedSampleRoutinesIfNeeded } from '@/seed/sampleRoutines';

export const DATABASE_NAME = 'flexroutine.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

export function getDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);
  return databasePromise;
}

export function initializeDatabase(db: SQLite.SQLiteDatabase) {
  initializationPromise ??= (async () => {
    await runMigrations(db);
    await seedSampleRoutinesIfNeeded(db);
  })();
  return initializationPromise;
}
