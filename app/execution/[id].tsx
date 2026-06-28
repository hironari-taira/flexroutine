import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getDatabase, initializeDatabase } from '@/db/database';
import {
  getExecutionLogById,
  listTaskLogsByExecutionLogId,
  updateTaskLogNotes,
  type ExecutionLogSummary,
} from '@/db/repositories/logRepository';
import type { TaskLog } from '@/types/models';
import { formatDuration } from '@/utils/time';

export default function ExecutionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [log, setLog] = useState<ExecutionLogSummary | null>(null);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let isMounted = true;
    void (async () => {
      const db = await getDatabase();
      await initializeDatabase(db);
      const [nextLog, nextTaskLogs] = await Promise.all([
        getExecutionLogById(db, id),
        listTaskLogsByExecutionLogId(db, id),
      ]);
      if (!isMounted) {
        return;
      }
      setLog(nextLog);
      setTaskLogs(nextTaskLogs);
      setNotes(Object.fromEntries(nextTaskLogs.map((taskLog) => [taskLog.id, taskLog.note ?? ''])));
    })();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const saveNotes = async () => {
    const db = await getDatabase();
    await initializeDatabase(db);
    await updateTaskLogNotes(
      db,
      taskLogs.map((taskLog) => ({
        taskLogId: taskLog.id,
        note: (notes[taskLog.id] ?? '').trim() || null,
      })),
    );
    setMessage('メモを保存しました');
    setIsEditingNotes(false);
  };

  if (!log) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title}>{log.routineTitle}</Text>
          <Badge label={log.usedEmergency ? '時短' : '通常'} tone={log.usedEmergency ? 'warning' : 'info'} />
        </View>
        <Text style={styles.meta}>{new Date(log.startedAt).toLocaleString('ja-JP')}</Text>
        <Text style={styles.meta}>
          予定 {formatDuration(log.plannedTotalSec)} / 実績 {formatDuration(log.actualTotalSec ?? 0)}
        </Text>
        <Text style={styles.meta}>一時停止 {formatDuration(log.pauseTotalSec)}</Text>
      </Card>

      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>タスク結果</Text>
          <Button label={isEditingNotes ? '閉じる' : 'メモ編集'} variant="secondary" onPress={() => setIsEditingNotes((v) => !v)} />
        </View>
        {taskLogs.map((taskLog) => (
          <View key={taskLog.id} style={styles.taskRow}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{taskLog.taskTitleSnapshot}</Text>
              <Badge label={taskLog.status === 'SKIPPED' ? 'スキップ' : '完了'} tone={taskLog.status === 'SKIPPED' ? 'danger' : 'info'} />
            </View>
            <Text style={styles.meta}>
              予定 {formatDuration(taskLog.plannedDurationSec)} / 実績 {formatDuration(taskLog.actualDurationSec ?? 0)}
            </Text>
            {isEditingNotes ? (
              <Input
                placeholder="メモなし"
                value={notes[taskLog.id] ?? ''}
                onChangeText={(value) => setNotes((current) => ({ ...current, [taskLog.id]: value }))}
              />
            ) : (
              <Text style={styles.note}>{taskLog.note?.trim() ? taskLog.note : 'メモなし'}</Text>
            )}
          </View>
        ))}
        {isEditingNotes ? <Button label="メモを保存" onPress={saveNotes} /> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </Card>
    </ScrollView>
  );
}

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
  card: {
    gap: 10,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  title: {
    color: '#111827',
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  meta: {
    color: '#52606d',
    fontSize: 13,
  },
  taskRow: {
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    gap: 7,
    paddingTop: 10,
  },
  taskHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  taskTitle: {
    color: '#111827',
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  note: {
    color: '#475569',
    fontSize: 13,
  },
  message: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
});
