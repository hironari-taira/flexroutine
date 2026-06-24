import { Link, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { normalizeRunMode } from '@/domain/runMode';
import { formatDuration } from '@/utils/time';

export default function CompletionScreen() {
  const { completed, skipped, plannedSec, actualSec, executionLogId, mode } = useLocalSearchParams<{
    actualSec?: string;
    completed?: string;
    executionLogId?: string;
    mode?: string;
    plannedSec?: string;
    skipped?: string;
  }>();
  const runMode = normalizeRunMode(mode);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>完了</Text>
        <Text style={styles.title}>今日の最低限を守れました</Text>
        <Text style={styles.body}>
          {runMode === 'EMERGENCY'
            ? '短縮版でも、守るタスクは残して進められました。'
            : '通常版のルーティンを完了しました。'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>実績</Text>
        <Text style={styles.line}>完了: {completed ?? '0'}件</Text>
        <Text style={styles.line}>スキップ: {skipped ?? '0'}件</Text>
        <Text style={styles.line}>予定: {formatDuration(Number(plannedSec ?? 0))}</Text>
        <Text style={styles.line}>実績: {formatDuration(Number(actualSec ?? 0))}</Text>
        <Text style={styles.logId}>log: {executionLogId}</Text>
      </View>

      <Link href="/" style={styles.homeLink}>
        ホームへ
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    gap: 10,
    padding: 18,
  },
  eyebrow: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    color: '#111827',
    fontSize: 28,
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
    fontWeight: '800',
  },
  line: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '700',
  },
  logId: {
    color: '#94a3b8',
    fontSize: 12,
  },
  homeLink: {
    backgroundColor: '#111827',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    overflow: 'hidden',
    padding: 15,
    textAlign: 'center',
  },
});
