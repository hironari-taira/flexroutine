import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getDatabase, initializeDatabase } from '@/db/database';
import {
  getRoutineWithTasks,
  type RoutineWithTasks,
} from '@/db/repositories/routineRepository';
import { formatDuration } from '@/utils/time';

export default function RunPreviewScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const [routine, setRoutine] = useState<RoutineWithTasks | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const title = useMemo(() => {
    if (mode === 'emergency') {
      return '短縮版の準備';
    }
    return '通常スタートの準備';
  }, [mode]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{title}</Text>
        <Text style={styles.title}>{routine?.title ?? 'ルーティン'}</Text>
        <Text style={styles.body}>
          Phase 2ではボタン遷移までを確認します。次のPhaseで時短モーダル、実行プラン、タイマー画面を実装します。
        </Text>
      </View>

      {routine ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>今回の確認ポイント</Text>
          <Text style={styles.line}>通常合計: {formatDuration(routine.normalTotalSec)}</Text>
          <Text style={styles.line}>最低限: {formatDuration(routine.minimumTotalSec)}</Text>
          <Text style={styles.line}>タスク数: {routine.tasks.length}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    padding: 20,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    gap: 10,
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
  line: {
    color: '#334155',
    fontSize: 15,
  },
});
