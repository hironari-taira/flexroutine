import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getDatabase, initializeDatabase } from '@/db/database';
import { listExecutionLogSummaries, type ExecutionLogSummary } from '@/db/repositories/logRepository';
import { formatDuration } from '@/utils/time';

export default function HistoryScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<ExecutionLogSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      void (async () => {
        const db = await getDatabase();
        await initializeDatabase(db);
        const nextLogs = await listExecutionLogSummaries(db);
        if (isMounted) {
          setLogs(nextLogs);
        }
      })();
      return () => {
        isMounted = false;
      };
    }, []),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>履歴</Text>
      {!logs ? <ActivityIndicator /> : null}
      {logs?.length === 0 ? <Text style={styles.muted}>まだ履歴はありません</Text> : null}
      {logs?.map((log) => (
        <Pressable
          accessibilityRole="button"
          key={log.id}
          onPress={() => router.push({ pathname: '/execution/[id]', params: { id: log.id } })}
        >
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.textGroup}>
                <Text style={styles.routineTitle}>{log.routineTitle}</Text>
                <Text style={styles.meta}>{new Date(log.startedAt).toLocaleString('ja-JP')}</Text>
              </View>
              <Badge label={log.usedEmergency ? '時短' : '通常'} tone={log.usedEmergency ? 'warning' : 'info'} />
            </View>
            <Text style={styles.meta}>
              予定 {formatDuration(log.plannedTotalSec)} / 実績 {formatDuration(log.actualTotalSec ?? 0)}
            </Text>
            <Text style={styles.meta}>
              完了 {log.completedCount}件 / スキップ {log.skippedCount}件
            </Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  muted: {
    color: '#64748b',
  },
  card: {
    gap: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  textGroup: {
    flex: 1,
    gap: 4,
  },
  routineTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  meta: {
    color: '#52606d',
    fontSize: 13,
  },
});
