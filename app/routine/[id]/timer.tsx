import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { getDatabase, initializeDatabase } from '@/db/database';
import { saveExecutionWithTaskLogs } from '@/db/repositories/logRepository';
import {
  getRoutineWithTasks,
  type RoutineWithTasks,
} from '@/db/repositories/routineRepository';
import { createRunPlan, type RunPlan, type RunPlanItem } from '@/domain/runPlan';
import { normalizeRunMode } from '@/domain/runMode';
import { notifyCompletion, notifyTaskAdvance } from '@/services/feedbackService';
import { speakCompletion, speakTaskStart, speakThirtySecondsLeft } from '@/services/speechService';
import type { TaskLog } from '@/types/models';
import { createId } from '@/utils/ids';
import { formatClock, formatDuration } from '@/utils/time';

type TimerPhase = 'RUNNING' | 'PAUSED' | 'SAVING';

interface TaskResult {
  actualDurationSec: number;
  endedAt: string;
  extensionSec: number;
  item: RunPlanItem;
  startedAt: string;
  status: TaskLog['status'];
}

export default function TimerScreen() {
  const router = useRouter();
  const { id, mode, targetSec } = useLocalSearchParams<{
    id: string;
    mode?: string;
    targetSec?: string;
  }>();
  const runMode = targetSec && !mode ? 'EMERGENCY' : normalizeRunMode(mode);
  const targetTotalSec = Number.parseInt(String(targetSec ?? '0'), 10);
  const [routine, setRoutine] = useState<RoutineWithTasks | null>(null);
  const [plan, setPlan] = useState<RunPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<TimerPhase>('RUNNING');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [extensionSec, setExtensionSec] = useState(0);

  const taskStartedAtRef = useRef(new Date().toISOString());
  const sessionStartedAtRef = useRef(new Date().toISOString());
  const pauseStartedMsRef = useRef<number | null>(null);
  const pauseTotalSecRef = useRef(0);
  const taskResultsRef = useRef<TaskResult[]>([]);
  const lastTapMsRef = useRef(0);
  const isSavingRef = useRef(false);
  const announcedThirtySecKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!id) {
        return;
      }

      const db = await getDatabase();
      await initializeDatabase(db);
      const nextRoutine = await getRoutineWithTasks(db, id);
      if (!nextRoutine || !isMounted) {
        return;
      }

      const nextPlan = createRunPlan(
        nextRoutine.tasks,
        runMode,
        Number.isFinite(targetTotalSec) && targetTotalSec > 0 ? targetTotalSec : undefined,
      );
      const runnableItems = nextPlan.items.filter((item) => item.status !== 'SKIPPED');

      sessionStartedAtRef.current = new Date().toISOString();
      taskResultsRef.current = nextPlan.items
        .filter((item) => item.status === 'SKIPPED')
        .map((item) => ({
          actualDurationSec: 0,
          endedAt: sessionStartedAtRef.current,
          extensionSec: 0,
          item,
          startedAt: sessionStartedAtRef.current,
          status: 'SKIPPED',
        }));

      setRoutine(nextRoutine);
      setPlan(nextPlan);
      setRemainingSec(runnableItems[0]?.plannedDurationSec ?? 0);
      taskStartedAtRef.current = new Date().toISOString();
      setIsLoading(false);
      if (runnableItems[0]) {
        speakTaskStart(runnableItems[0].title, runnableItems[0].plannedDurationSec);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [id, runMode, targetTotalSec]);

  const runnableItems = useMemo(() => plan?.items.filter((item) => item.status !== 'SKIPPED') ?? [], [plan]);
  const currentItem = runnableItems[currentIndex] ?? null;
  const nextItem = runnableItems[currentIndex + 1] ?? null;
  const totalRemainingSec = runnableItems
    .slice(currentIndex)
    .reduce((sum, item, index) => sum + (index === 0 ? remainingSec : item.plannedDurationSec), 0);

  const persistAndNavigate = useCallback(
    async (finalResults: TaskResult[]) => {
      if (!routine || !plan || isSavingRef.current) {
        return;
      }

      isSavingRef.current = true;
      setPhase('SAVING');

      const db = await getDatabase();
      await initializeDatabase(db);
      const completedAt = new Date().toISOString();
      const executionLogId = createId('execution');
      const actualTotalSec = finalResults.reduce((sum, result) => sum + result.actualDurationSec, 0);
      const skippedCount = finalResults.filter((result) => result.status === 'SKIPPED').length;
      const completedCount = finalResults.filter((result) => result.status !== 'SKIPPED').length;

      await saveExecutionWithTaskLogs(
        db,
        {
          id: executionLogId,
          routineId: routine.id,
          mode: plan.mode,
          status: 'COMPLETED',
          targetTotalSec: plan.targetTotalSec,
          plannedTotalSec: plan.plannedTotalSec,
          actualTotalSec,
          startedAt: sessionStartedAtRef.current,
          completedAt,
          pauseTotalSec: pauseTotalSecRef.current,
          usedEmergency: plan.mode === 'EMERGENCY',
          optionalNote: null,
        },
        finalResults
          .slice()
          .sort((a, b) => a.item.orderIndex - b.item.orderIndex)
          .map((result) => ({
            id: createId('task-log'),
            executionLogId,
            taskId: result.item.taskId,
            taskTitleSnapshot: result.item.title,
            plannedDurationSec: result.item.plannedDurationSec,
            actualDurationSec: result.actualDurationSec,
            status: result.status,
            startedAt: result.startedAt,
            endedAt: result.endedAt,
            extensionSec: result.extensionSec,
            orderIndex: result.item.orderIndex,
          })),
      );

      speakCompletion();
      await notifyCompletion();
      router.replace({
        pathname: '/routine/[id]/complete',
        params: {
          id: routine.id,
          executionLogId,
          completed: String(completedCount),
          skipped: String(skippedCount),
          plannedSec: String(plan.plannedTotalSec),
          actualSec: String(actualTotalSec),
          mode: plan.mode === 'EMERGENCY' ? 'emergency' : 'normal',
        },
      });
    },
    [plan, routine, router],
  );

  const finishCurrentTask = useCallback(
    async (status: TaskLog['status']) => {
      if (!currentItem || phase === 'SAVING') {
        return;
      }

      const endedAt = new Date().toISOString();
      const actualDurationSec =
        status === 'SKIPPED' ? 0 : Math.max(0, currentItem.plannedDurationSec + extensionSec - remainingSec);
      const nextResults = [
        ...taskResultsRef.current,
        {
          actualDurationSec,
          endedAt,
          extensionSec,
          item: currentItem,
          startedAt: taskStartedAtRef.current,
          status,
        },
      ];
      taskResultsRef.current = nextResults;

      await notifyTaskAdvance();

      if (currentIndex + 1 >= runnableItems.length) {
        await persistAndNavigate(nextResults);
        return;
      }

      const nextIndex = currentIndex + 1;
      const nextTask = runnableItems[nextIndex];
      setCurrentIndex(nextIndex);
      setRemainingSec(nextTask.plannedDurationSec);
      setExtensionSec(0);
      setPhase('RUNNING');
      taskStartedAtRef.current = new Date().toISOString();
      announcedThirtySecKeyRef.current = null;
      speakTaskStart(nextTask.title, nextTask.plannedDurationSec);
    },
    [
      currentIndex,
      currentItem,
      extensionSec,
      phase,
      persistAndNavigate,
      remainingSec,
      runnableItems,
    ],
  );

  useEffect(() => {
    if (phase !== 'RUNNING' || !currentItem) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSec((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          void finishCurrentTask('AUTO_COMPLETED');
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentItem, finishCurrentTask, phase]);

  useEffect(() => {
    if (!currentItem || remainingSec !== 30) {
      return;
    }
    const key = `${currentItem.taskId}-${currentIndex}`;
    if (announcedThirtySecKeyRef.current === key) {
      return;
    }
    announcedThirtySecKeyRef.current = key;
    speakThirtySecondsLeft();
  }, [currentIndex, currentItem, remainingSec]);

  const handleScreenPress = () => {
    const now = Date.now();
    if (now - lastTapMsRef.current < 320) {
      lastTapMsRef.current = 0;
      void finishCurrentTask('COMPLETED');
      return;
    }
    lastTapMsRef.current = now;
  };

  const togglePause = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (phase === 'PAUSED') {
      if (pauseStartedMsRef.current) {
        pauseTotalSecRef.current += Math.floor((Date.now() - pauseStartedMsRef.current) / 1000);
      }
      pauseStartedMsRef.current = null;
      setPhase('RUNNING');
      return;
    }

    pauseStartedMsRef.current = Date.now();
    setPhase('PAUSED');
  };

  const extendCurrentTask = (event: GestureResponderEvent) => {
    event.stopPropagation();
    setRemainingSec((previous) => previous + 30);
    setExtensionSec((previous) => previous + 30);
  };

  const skipCurrentTask = (event: GestureResponderEvent) => {
    event.stopPropagation();
    void finishCurrentTask('SKIPPED');
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!routine || !plan || !currentItem) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>実行できるタスクがありません</Text>
      </View>
    );
  }

  return (
    <Pressable style={styles.screen} onPress={handleScreenPress}>
      <View style={styles.topRow}>
        <Text style={styles.progress}>
          {currentIndex + 1} / {runnableItems.length}
        </Text>
        <Text style={styles.modeLabel}>{runMode === 'EMERGENCY' ? '短縮版' : '通常版'}</Text>
      </View>

      <View style={styles.mainPanel}>
        <Text style={styles.taskTitle}>{currentItem.title}</Text>
        <Text style={styles.timer}>{formatClock(remainingSec)}</Text>
        <Text style={styles.remaining}>全体残り {formatDuration(totalRemainingSec)}</Text>
      </View>

      <View style={styles.nextPanel}>
        <Text style={styles.nextLabel}>NEXT</Text>
        <Text style={styles.nextTask}>{nextItem?.title ?? '完了'}</Text>
      </View>

      <Text style={styles.hint}>画面全体をダブルタップで次へ</Text>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.controlButton} onPress={togglePause}>
          <Text style={styles.controlButtonText}>{phase === 'PAUSED' ? '再開' : '一時停止'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.controlButton} onPress={extendCurrentTask}>
          <Text style={styles.controlButtonText}>+30秒</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.dangerButton} onPress={skipCurrentTask}>
          <Text style={styles.dangerButtonText}>スキップ</Text>
        </Pressable>
      </View>

      {phase === 'SAVING' ? (
        <View style={styles.savingOverlay}>
          <ActivityIndicator />
          <Text style={styles.savingText}>ログを保存しています</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#111827',
    flex: 1,
    gap: 22,
    justifyContent: 'space-between',
    padding: 22,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  muted: {
    color: '#52606d',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progress: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '800',
  },
  modeLabel: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mainPanel: {
    alignItems: 'center',
    gap: 18,
  },
  taskTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  timer: {
    color: '#ffffff',
    fontSize: 76,
    fontWeight: '900',
  },
  remaining: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '700',
  },
  nextPanel: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    gap: 6,
    padding: 16,
  },
  nextLabel: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '900',
  },
  nextTask: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  hint: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 13,
  },
  controlButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 13,
  },
  dangerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  savingOverlay: {
    alignItems: 'center',
    backgroundColor: '#ffffffe6',
    borderRadius: 8,
    gap: 10,
    left: 22,
    padding: 18,
    position: 'absolute',
    right: 22,
    top: '45%',
  },
  savingText: {
    color: '#111827',
    fontWeight: '800',
  },
});
