import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getDatabase, initializeDatabase } from '@/db/database';
import {
  getRoutineWithTasks,
  type RoutineWithTasks,
} from '@/db/repositories/routineRepository';
import { createRunPlan } from '@/domain/runPlan';
import { normalizeRunMode, runModeToParam } from '@/domain/runMode';
import { formatDuration } from '@/utils/time';

const quickMinutes = [5, 10, 15, 20, 30];

export default function RunPreviewScreen() {
  const router = useRouter();
  const { id, minutes, mode } = useLocalSearchParams<{ id: string; minutes?: string; mode?: string }>();
  const runMode = minutes && !mode ? 'EMERGENCY' : normalizeRunMode(mode);
  const [routine, setRoutine] = useState<RoutineWithTasks | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [targetMinutes, setTargetMinutes] = useState('15');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!id) {
        return;
      }
      const db = await getDatabase();
      await initializeDatabase(db);
      const nextRoutine = await getRoutineWithTasks(db, id);
      if (isMounted) {
        setRoutine(nextRoutine);
        if (minutes && Number.parseInt(minutes, 10) > 0) {
          setTargetMinutes(String(Number.parseInt(minutes, 10)));
        } else if (nextRoutine) {
          setTargetMinutes(String(Math.max(1, Math.round(nextRoutine.normalTotalSec / 120))));
        }
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [id, minutes]);

  const targetTotalSec = Math.max(1, Number.parseInt(targetMinutes || '1', 10)) * 60;
  const plan = useMemo(() => {
    if (!routine) {
      return null;
    }
    return createRunPlan(routine.tasks, runMode, targetTotalSec);
  }, [routine, runMode, targetTotalSec]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!routine || !plan) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>ルーティンが見つかりませんでした</Text>
      </View>
    );
  }

  const hasTargetWarning = plan.warnings.includes('TARGET_TOO_SHORT');
  const timerParams = {
    id: routine.id,
    mode: runModeToParam(runMode),
    targetSec: String(hasTargetWarning ? plan.minimumTotalSec : plan.targetTotalSec ?? plan.plannedTotalSec),
  };
  const startTimer = () => router.push({ pathname: '/routine/[id]/timer', params: timerParams });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>
          {runMode === 'EMERGENCY' ? '短縮版の準備' : '通常スタートの準備'}
        </Text>
        <Text style={styles.title}>{routine.title}</Text>
        <Text style={styles.body}>
          {runMode === 'EMERGENCY'
            ? '今日の持ち時間に合わせて、最低限を守る実行プランを作ります。'
            : '通常時間で全タスクを順番に進めます。'}
        </Text>
      </View>

      {runMode === 'EMERGENCY' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>今日の持ち時間</Text>
          <View style={styles.quickRow}>
            {quickMinutes.map((minutes) => (
              <Pressable
                accessibilityRole="button"
                key={minutes}
                style={[
                  styles.quickChip,
                  targetMinutes === String(minutes) ? styles.quickChipSelected : null,
                ]}
                onPress={() => setTargetMinutes(String(minutes))}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    targetMinutes === String(minutes) ? styles.quickChipTextSelected : null,
                  ]}
                >
                  {minutes}分
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            accessibilityLabel="今日の持ち時間を分で入力"
            inputMode="numeric"
            keyboardType="number-pad"
            style={styles.input}
            value={targetMinutes}
            onChangeText={(value) => setTargetMinutes(value.replace(/[^0-9]/g, ''))}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>今日のプラン</Text>
        <View style={styles.summaryGrid}>
          <Summary label="通常" value={formatDuration(plan.normalTotalSec)} />
          <Summary label="最低限" value={formatDuration(plan.minimumTotalSec)} />
          <Summary label="実行予定" value={formatDuration(plan.plannedTotalSec)} />
          <Summary label="短縮" value={formatDuration(plan.savedTotalSec)} />
        </View>

        {hasTargetWarning ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>
              最低限でも{formatDuration(plan.minimumTotalSec)}必要です
            </Text>
            <Text style={styles.warningText}>
              守る条件を破らず、最低限のプランで始められます。
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        style={styles.primaryButton}
        onPress={startTimer}
      >
        <Text style={styles.primaryButtonText}>
          {hasTargetWarning ? '最低限で始める' : 'このプランで始める'}
        </Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>実行内容</Text>
        {plan.items.map((item) => (
          <View key={item.taskId} style={styles.planRow}>
            <View style={styles.planText}>
              <Text style={styles.planTitle}>{item.title}</Text>
              <Text style={styles.planMeta}>
                通常 {formatDuration(item.normalDurationSec)}
                {item.status !== 'SKIPPED' ? ` → ${formatDuration(item.plannedDurationSec)}` : ''}
              </Text>
            </View>
            <Text style={[styles.statusBadge, statusStyle[item.status]]}>{statusLabel[item.status]}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const statusLabel = {
  PLANNED: '実行',
  SHORTENED: '短縮',
  SKIPPED: 'スキップ',
};

const statusStyle = {
  PLANNED: { backgroundColor: '#eef2ff', color: '#3730a3' },
  SHORTENED: { backgroundColor: '#fef3c7', color: '#92400e' },
  SKIPPED: { backgroundColor: '#fee2e2', color: '#991b1b' },
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
    padding: 20,
    paddingBottom: 32,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  muted: {
    color: '#52606d',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    gap: 12,
    padding: 18,
  },
  eyebrow: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
  },
  body: {
    color: '#52606d',
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  quickChipSelected: {
    backgroundColor: '#111827',
  },
  quickChipText: {
    color: '#334155',
    fontWeight: '700',
  },
  quickChipTextSelected: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    minWidth: '45%',
    padding: 12,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  warningBox: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  warningTitle: {
    color: '#9a3412',
    fontSize: 15,
    fontWeight: '800',
  },
  warningText: {
    color: '#9a3412',
    fontSize: 13,
  },
  planRow: {
    alignItems: 'center',
    borderTopColor: '#f1f5f9',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  planText: {
    flex: 1,
    gap: 4,
  },
  planTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  planMeta: {
    color: '#64748b',
    fontSize: 13,
  },
  statusBadge: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
