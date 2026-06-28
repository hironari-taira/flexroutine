const expectedVersion = 3;

function createV1Db() {
  return {
    userVersion: 1,
    tables: {
      routines: new Set([
        'id',
        'title',
        'context',
        'icon',
        'sort_index',
        'default_start_time',
        'notification_enabled',
        'notification_time',
        'created_at',
        'updated_at',
        'archived_at',
      ]),
      tasks: new Set([
        'id',
        'routine_id',
        'title',
        'normal_duration_sec',
        'min_duration_sec',
        'emergency_behavior',
        'skip_policy',
        'shorten_policy',
        'order_index',
        'announce_thirty_sec_before',
        'auto_advance_on_timeout',
        'created_at',
        'updated_at',
        'archived_at',
      ]),
      execution_logs: new Set([
        'id',
        'routine_id',
        'mode',
        'status',
        'target_total_sec',
        'planned_total_sec',
        'actual_total_sec',
        'started_at',
        'completed_at',
        'pause_total_sec',
        'used_emergency',
        'optional_note',
      ]),
      task_logs: new Set([
        'id',
        'execution_log_id',
        'task_id',
        'task_title_snapshot',
        'planned_duration_sec',
        'actual_duration_sec',
        'status',
        'started_at',
        'ended_at',
        'extension_sec',
        'order_index',
      ]),
    },
    executionLogs: [{ id: 'execution-existing' }],
    taskLogs: [{ id: 'task-log-existing', note: undefined }],
    tasks: [{ id: 'task-existing', emergency_note: undefined }],
  };
}

function createNewDb() {
  const db = createV1Db();
  db.userVersion = 0;
  db.executionLogs = [];
  db.taskLogs = [];
  db.tasks = [];
  return db;
}

function addColumnIfMissing(db, table, column) {
  if (!db.tables[table]) {
    db.tables[table] = new Set();
  }
  db.tables[table].add(column);
}

function runMigrationSimulation(db) {
  const currentVersion = db.userVersion;

  if (currentVersion === 0) {
    db.userVersion = 1;
  }

  if (currentVersion < 2) {
    addColumnIfMissing(db, 'task_logs', 'note');
    for (const taskLog of db.taskLogs) {
      taskLog.note ??= null;
    }
  }

  if (currentVersion < 3) {
    addColumnIfMissing(db, 'tasks', 'emergency_note');
    for (const task of db.tasks) {
      task.emergency_note ??= null;
    }
  }

  db.userVersion = expectedVersion;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyMigratedDb(db, label) {
  assert(db.userVersion === expectedVersion, `${label}: user_version should be ${expectedVersion}`);
  assert(db.tables.task_logs.has('note'), `${label}: task_logs.note is missing`);
  assert(db.tables.tasks.has('emergency_note'), `${label}: tasks.emergency_note is missing`);
}

const existing = createV1Db();
runMigrationSimulation(existing);
verifyMigratedDb(existing, 'v1-to-v3');
assert(existing.executionLogs.length === 1, 'v1-to-v3: existing execution log was lost');
assert(existing.taskLogs.length === 1, 'v1-to-v3: existing task log was lost');
assert(existing.tasks.length === 1, 'v1-to-v3: existing task was lost');

const fresh = createNewDb();
runMigrationSimulation(fresh);
verifyMigratedDb(fresh, 'fresh-db');

console.log('verify:db-migrations ok');
