import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getDatabase, initializeDatabase } from '@/db/database';
import {
  getRoutineWithTasks,
  type RoutineWithTasks,
} from '@/db/repositories/routineRepository';
import { formatDuration } from '@/utils/time';

export default function RoutineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>ルーティンが見つかりませんでした</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.icon}>{routine.icon}</Text>
        <Text style={styles.title}>{routine.title}</Text>
        <Text style={styles.meta}>
          通常 {formatDuration(routine.normalTotalSec)} / 最短{' '}
          {formatDuration(routine.minimumTotalSec)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() =>
            router.push({ pathname: '/routine/[id]/run', params: { id: routine.id, mode: 'normal' } })
          }
        >
          <Text style={styles.primaryButtonText}>通常スタート</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.emergencyButton}
          onPress={() =>
            router.push({
              pathname: '/routine/[id]/run',
              params: { id: routine.id, mode: 'emergency' },
            })
          }
        >
          <Text style={styles.emergencyButtonText}>緊急！時短スタート</Text>
        </Pressable>
      </View>

      <View style={styles.taskList}>
        {routine.tasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={styles.taskText}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskMeta}>
                通常 {formatDuration(task.normalDurationSec)} / 最小{' '}
                {formatDuration(task.minDurationSec)}
              </Text>
            </View>
            <Text style={styles.badge}>{behaviorLabel[task.emergencyBehavior]}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const behaviorLabel = {
  MUST_DO: '絶対やる',
  SHRINKABLE: '短く',
  OPTIONAL: '余裕',
};

const styles = StyleSheet.create({
  container: {
    gap: 18,
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
  summary: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    gap: 8,
    padding: 18,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
  },
  meta: {
    color: '#52606d',
    fontSize: 15,
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emergencyButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 14,
  },
  emergencyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  taskList: {
    gap: 10,
  },
  taskRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 14,
  },
  taskText: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  taskMeta: {
    color: '#52606d',
    fontSize: 13,
  },
  badge: {
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
});
