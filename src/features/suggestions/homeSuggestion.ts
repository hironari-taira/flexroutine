import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getEmergencyLogCount,
  getExecutionLogCount,
  getMostSkippedTask,
} from '@/db/repositories/logRepository';

export interface HomeSuggestion {
  title: string;
  body: string;
}

export async function buildHomeSuggestion(db: SQLiteDatabase): Promise<HomeSuggestion> {
  const [executionCount, emergencyCount, skippedTask] = await Promise.all([
    getExecutionLogCount(db),
    getEmergencyLogCount(db),
    getMostSkippedTask(db),
  ]);

  if (executionCount === 0) {
    return {
      title: '実行ログをためる準備ができています',
      body: 'タイマーを1回完了すると、スキップや時短の傾向からホームの提案が変わります。',
    };
  }

  if (skippedTask && skippedTask.count >= 1) {
    return {
      title: `${skippedTask.taskTitle} は最近スキップされています`,
      body: '余裕がある日だけ残すか、通常時間を見直す候補にできます。',
    };
  }

  if (emergencyCount >= 1) {
    return {
      title: '短縮版を使った履歴があります',
      body: '通常時間が少し長めかもしれません。次の編集Phaseで現実寄りに整えられるようにします。',
    };
  }

  return {
    title: '通常版で完了できています',
    body: 'この調子で実行ログが増えると、タスクごとの見積もりを提案できます。',
  };
}
