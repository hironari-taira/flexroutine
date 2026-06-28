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
import type { AdvanceMode, TaskLog } from '@/types/models';
import { createId } from '@/utils/ids';
import { formatClock, formatDuration } from '@/utils/time';

type TimerPhase = 'RUNNING' | 'PAUSED' | 'SAVING' | 'TIME_UP_WAITING';

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
  const [advanceMode, setAdvanceMode] = useState<AdvanceMode>('AUTO');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [extensionSec, setExtensionSec] = useState(0);

  const taskStartedAtRef = useRef(new Date().toISOString());
  const taskStartedAtMsRef = useRef(0);
  const taskEndsAtMsRef = useRef(0);
  const taskPauseTotalSecRef = useRef(0);
  const sessionStartedAtRef = useRef(new Date().toISOString());
  const pauseStartedMsRef = useRef<number | null>(null);
  const pauseTotalSecRef = useRef(0);
  const taskResultsRef = useRef<TaskResult[]>([]);
  const lastTapMsRef = useRef(0);
  const isSavingRef = useRef(false);
  const announcedThirtySecKeyRef = useRef<string | null>(null);

  const runnableItems = useMemo(
    () => plan?.items.filter((item) => item.status !== 'SKIPPED') ?? [],
    [plan],
  );
  const currentItem = runnableItems[currentIndex] ?? null;
  const nextItem = runnableItems[currentIndex + 1] ?? null;
  const totalRemainingSec = runnableItems
    .slice(currentIndex)
    .reduce((sum, item, index) => sum + (index === 0 ? remainingSec : item.plannedDurationSec), 0);

  const startTask = useCallback((item: RunPlanItem) => {
    const nowMs = Date.now();
    taskStartedAtRef.current = new Date(nowMs).toISOString();
    taskStartedAtMsRef.current = nowMs;
    taskEndsAtMsRef.current = nowMs + item.plannedDurationSec * 1000;
    taskPauseTotalSecRef.current = 0;
    pauseStartedMsRef.current = null;
    announcedThirtySecKeyRef.current = null;
    setRemainingSec(item.plannedDurationSec);
    setExtensionSec(0);
    setPhase('RUNNING');
    speakTaskStart(item.title, item.plannedDurationSec);
  }, []);

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
      const runnable = nextPlan.items.filter((item) => item.status !== 'SKIPPED');
      const startedAt = new Date().toISOString();

      sessionStartedAtRef.current = startedAt;
      taskResultsRef.current = nextPlan.items
        .filter((item) => item.status === 'SKIPPED')
        .map((item) => ({
          actualDurationSec: 0,
          endedAt: startedAt,
          extensionSec: 0,
          item,
          startedAt,
          status: 'SKIPPED',
        }));

      setRoutine(nextRoutine);
      setPlan(nextPlan);
      setCurrentIndex(0);
      setAdvanceMode('AUTO');
      setIsLoading(false);
      if (runnable[0]) {
        startTask(runnable[0]);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [id, runMode, startTask, targetTotalSec]);

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
            note: null,
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
          routineTitle: routine.title,
        },
      });
    },
    [plan, routine, router],
  );

  const finishCurrentTask = useCallback(
    async (status: TaskLog['status']) => {
      if (!currentItem || phase === 'PAUSED' || phase === 'SAVING') {
        return;
      }

      const nowMs = Date.now();
      const endedAt = new Date(nowMs).toISOString();
      const elapsedSec = Math.max(
        0,
        Math.round((nowMs - taskStartedAtMsRef.current) / 1000) - taskPauseTotalSecRef.current,
      );
      const cappedActualSec = Math.min(
        elapsedSec,
        currentItem.plannedDurationSec + extensionSec,
      );
      const actualDurationSec = status === 'SKIPPED' ? 0 : cappedActualSec;
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
      startTask(nextTask);
    },
    [currentIndex, currentItem, extensionSec, persistAndNavigate, phase, runnableItems, startTask],
  );

  useEffect(() => {
    if (phase !== 'RUNNING' || !currentItem) {
      return;
    }

    const timer = setInterval(() => {
      const nextRemainingSec = Math.max(0, Math.ceil((taskEndsAtMsRef.current - Date.now()) / 1000));
      setRemainingSec(nextRemainingSec);
      if (nextRemainingSec > 0) {
        return;
      }

      if (advanceMode === 'AUTO') {
        void finishCurrentTask('AUTO_COMPLETED');
      } else {
        setPhase('TIME_UP_WAITING');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [advanceMode, currentItem, finishCurrentTask, phase]);

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
    if (phase === 'PAUSED' || phase === 'SAVING') {
      return;
    }

    const now = Date.now();
    if (now - lastTapMsRef.current < 320) {
      lastTapMsRef.current = 0;
      void finishCurrentTask('COMPLETED');
      return;
    }
    lastTapMsRef.current = now;
  };

  const toggleAdvanceMode = (event: GestureResponderEvent) => {
    event.stopPropagation();
    setAdvanceMode((current) => (current === 'AUTO' ? 'MANUAL' : 'AUTO'));
  };

  const togglePause = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (phase === 'SAVING' || phase === 'TIME_UP_WAITING') {
      return;
    }

    if (phase === 'PAUSED') {
      const pausedAtMs = pauseStartedMsRef.current;
      if (pausedAtMs) {
        const pausedSec = Math.floor((Date.now() - pausedAtMs) / 1000);
        pauseTotalSecRef.current += pausedSec;
        taskPauseTotalSecRef.current += pausedSec;
        taskEndsAtMsRef.current += Date.now() - pausedAtMs;
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
    if (phase === 'PAUSED' || phase === 'SAVING') {
      return;
    }

    taskEndsAtMsRef.current = Math.max(taskEndsAtMsRef.current, Date.now()) + 30_000;
    setRemainingSec((previous) => previous + 30);
    setExtensionSec((previous) => previous + 30);
    if (phase === 'TIME_UP_WAITING') {
      setPhase('RUNNING');
    }
  };

  const skipCurrentTask = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (phase === 'PAUSED' || phase === 'SAVING') {
      return;
    }
    void finishCurrentTask('SKIPPED');
  };

  const isPaused = phase === 'PAUSED';
  const disablesTaskActions = phase === 'PAUSED' || phase === 'SAVING';

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
        <View style={styles.modeGroup}>
          <Pressable accessibilityRole="button" style={styles.advanceToggle} onPress={toggleAdvanceMode}>
            <Text style={styles.advanceToggleText}>
              {advanceMode === 'AUTO' ? '自動で次へ' : 'タップで次へ'}
            </Text>
          </Pressable>
          <Text style={styles.modeLabel}>{runMode === 'EMERGENCY' ? '短縮版' : '通常版'}</Text>
        </View>
      </View>

      <View style={styles.mainPanel}>
        <Text style={styles.taskTitle}>{currentItem.title}</Text>
        <Text style={styles.timer}>{formatClock(remainingSec)}</Text>
        <Text style={styles.remaining}>全体残り {formatDuration(totalRemainingSec)}</Text>
        {isPaused ? <Text style={styles.pausedLabel}>一時停止中</Text> : null}
        {phase === 'TIME_UP_WAITING' ? (
          <View style={styles.timeUpBox}>
            <Text style={styles.timeUpTitle}>時間です</Text>
            <Text style={styles.timeUpText}>ダブルタップ、または次へボタンで進みます。</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.nextButton}
              onPress={() => void finishCurrentTask('AUTO_COMPLETED')}
            >
              <Text style={styles.nextButtonText}>次へ進む</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.nextPanel}>
        <Text style={styles.nextLabel}>NEXT</Text>
        <Text style={styles.nextTask}>{nextItem?.title ?? '完了'}</Text>
      </View>

      <Text style={styles.hint}>
        {isPaused ? '一時停止中はダブルタップ無効' : '画面全体をダブルタップで次へ'}
      </Text>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.controlButton} onPress={togglePause}>
          <Text style={styles.controlButtonText}>{phase === 'PAUSED' ? '再開' : '一時停止'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disablesTaskActions}
          style={[styles.controlButton, disablesTaskActions ? styles.disabledButton : null]}
          onPress={extendCurrentTask}
        >
          <Text style={[styles.controlButtonText, disablesTaskActions ? styles.disabledButtonText : null]}>
            +30秒
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disablesTaskActions}
          style={[styles.dangerButton, disablesTaskActions ? styles.disabledButton : null]}
          onPress={skipCurrentTask}
        >
          <Text style={[styles.dangerButtonText, disablesTaskActions ? styles.disabledButtonText : null]}>
            スキップ
          </Text>
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
    gap: 12,
    justifyContent: 'space-between',
  },
  progress: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '800',
  },
  modeGroup: {
    alignItems: 'flex-end',
    gap: 8,
  },
  advanceToggle: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  advanceToggleText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '900',
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
  pausedLabel: {
    backgroundColor: '#374151',
    borderRadius: 8,
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  timeUpBox: {
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    gap: 8,
    padding: 14,
    width: '100%',
  },
  timeUpTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  timeUpText: {
    color: '#cbd5e1',
    fontSize: 13,
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  nextButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
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
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  disabledButtonText: {
    color: '#9ca3af',
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
