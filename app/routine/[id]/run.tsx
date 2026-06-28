import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
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
      <Card style={styles.card}>
        <Text style={styles.eyebrow}>{runMode === 'EMERGENCY' ? '時短プレビュー' : '通常スタート'}</Text>
        <Text style={styles.title}>{routine.title}</Text>
        <Text style={styles.body}>
          {runMode === 'EMERGENCY'
            ? '持ち時間に合わせて、守るタスクと短くするタスクを整理しました。'
            : '通常時間で、並び順どおりに進めます。'}
        </Text>
      </Card>

      {runMode === 'EMERGENCY' ? (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>今日の持ち時間</Text>
          <View style={styles.quickRow}>
            {quickMinutes.map((minute) => (
              <Button
                key={minute}
                label={`${minute}分`}
                variant={targetMinutes === String(minute) ? 'primary' : 'secondary'}
                onPress={() => setTargetMinutes(String(minute))}
              />
            ))}
          </View>
          <Input
            accessibilityLabel="今日の持ち時間を分で入力"
            inputMode="numeric"
            keyboardType="number-pad"
            value={targetMinutes}
            onChangeText={(value) => setTargetMinutes(value.replace(/[^0-9]/g, ''))}
          />
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>今日のプラン</Text>
        <View style={styles.summaryGrid}>
          <Summary label="通常" value={formatDuration(plan.normalTotalSec)} />
          <Summary label="最低限" value={formatDuration(plan.minimumTotalSec)} />
          <Summary label="実行予定" value={formatDuration(plan.plannedTotalSec)} />
          <Summary label="短縮" value={formatDuration(plan.savedTotalSec)} />
        </View>

        {hasTargetWarning ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>最低限でも{formatDuration(plan.minimumTotalSec)}必要です</Text>
            <Text style={styles.warningText}>守る条件を壊さず、最低限のプランで始めます。</Text>
          </View>
        ) : null}
      </Card>

      <Button label={hasTargetWarning ? '最低限で始める' : 'このプランで始める'} onPress={startTimer} />

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>実行内容</Text>
        {plan.items.map((item) => (
          <View key={item.taskId} style={styles.planRow}>
            <View style={styles.planText}>
              <Text style={styles.planTitle}>{item.title}</Text>
              <Text style={styles.planMeta}>
                通常 {formatDuration(item.normalDurationSec)}
                {item.status !== 'SKIPPED' ? ` → ${formatDuration(item.plannedDurationSec)}` : ''}
              </Text>
              {item.status === 'SHORTENED' && item.emergencyNote ? (
                <Text style={styles.emergencyNote}>{item.emergencyNote}</Text>
              ) : null}
            </View>
            <Badge label={statusLabel[item.status]} tone={statusTone[item.status]} />
          </View>
        ))}
      </Card>
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

const statusTone = {
  PLANNED: 'info',
  SHORTENED: 'warning',
  SKIPPED: 'danger',
} as const;

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
    gap: 12,
  },
  eyebrow: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
  },
  body: {
    color: '#52606d',
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  emergencyNote: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '800',
  },
});
