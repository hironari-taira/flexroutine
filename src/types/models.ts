export type RoutineContext = 'MORNING' | 'NIGHT' | 'WORK_START' | 'CUSTOM';

export type EmergencyBehavior = 'MUST_DO' | 'SHRINKABLE' | 'OPTIONAL';

export type SkipPolicy = 'NEVER' | 'EMERGENCY_ONLY' | 'ANYTIME';
export type ShortenPolicy = 'NEVER' | 'ALLOW';

export type RunMode = 'NORMAL' | 'EMERGENCY';
export type RunStatus = 'COMPLETED' | 'CANCELED' | 'ABANDONED';
export type AdvanceMode = 'AUTO' | 'MANUAL';

export type TaskRunStatus = 'COMPLETED' | 'AUTO_COMPLETED' | 'SKIPPED' | 'TIMEOUT' | 'EXTENDED';

export interface Routine {
  id: string;
  title: string;
  context: RoutineContext;
  icon?: string;
  sortIndex: number;
  defaultStartTime?: string | null;
  notificationEnabled: boolean;
  notificationTime?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface Task {
  id: string;
  routineId: string;
  title: string;
  normalDurationSec: number;
  minDurationSec: number;
  emergencyNote?: string | null;
  emergencyBehavior: EmergencyBehavior;
  skipPolicy: SkipPolicy;
  shortenPolicy: ShortenPolicy;
  orderIndex: number;
  announceThirtySecBefore: boolean;
  autoAdvanceOnTimeout: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface ExecutionLog {
  id: string;
  routineId: string;
  mode: RunMode;
  status: RunStatus;
  targetTotalSec?: number | null;
  plannedTotalSec: number;
  actualTotalSec?: number | null;
  startedAt: string;
  completedAt?: string | null;
  pauseTotalSec: number;
  usedEmergency: boolean;
  optionalNote?: string | null;
}

export interface TaskLog {
  id: string;
  executionLogId: string;
  taskId: string;
  taskTitleSnapshot: string;
  plannedDurationSec: number;
  actualDurationSec?: number | null;
  status: TaskRunStatus;
  startedAt: string;
  endedAt?: string | null;
  extensionSec: number;
  orderIndex: number;
  note?: string | null;
}

export type SuggestionType =
  | 'DURATION_INCREASE'
  | 'DURATION_DECREASE'
  | 'SKIP_REVIEW'
  | 'EMERGENCY_PATTERN'
  | 'MIN_DURATION_REVIEW';

export type SuggestionStatus = 'ACTIVE' | 'DISMISSED' | 'APPLIED';

export interface Suggestion {
  id: string;
  routineId: string;
  taskId?: string | null;
  type: SuggestionType;
  status: SuggestionStatus;
  title: string;
  body: string;
  payloadJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}
