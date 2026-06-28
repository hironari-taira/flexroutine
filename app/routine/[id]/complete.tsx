import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { getDatabase, initializeDatabase } from '@/db/database';
import {
  listTaskLogsByExecutionLogId,
  updateTaskLogNotes,
} from '@/db/repositories/logRepository';
import { normalizeRunMode } from '@/domain/runMode';
import type { TaskLog } from '@/types/models';
import { formatDuration } from '@/utils/time';

type BackgroundPreset = 'soft-morning' | 'calm-night' | 'focus-blue' | 'warm-minimal' | 'green-reset';

const backgroundPresets: { label: string; value: BackgroundPreset }[] = [
  { label: 'Morning', value: 'soft-morning' },
  { label: 'Night', value: 'calm-night' },
  { label: 'Focus', value: 'focus-blue' },
  { label: 'Warm', value: 'warm-minimal' },
  { label: 'Reset', value: 'green-reset' },
];

export default function CompletionScreen() {
  const {
    actualSec,
    completed,
    executionLogId,
    mode,
    plannedSec,
    routineTitle,
    skipped,
  } = useLocalSearchParams<{
    actualSec?: string;
    completed?: string;
    executionLogId?: string;
    mode?: string;
    plannedSec?: string;
    routineTitle?: string;
    skipped?: string;
  }>();
  const runMode = normalizeRunMode(mode);
  const [backgroundPreset, setBackgroundPreset] = useState<BackgroundPreset>('soft-morning');
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showsNotes, setShowsNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [noteMessage, setNoteMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<View>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTaskLogs() {
      if (!executionLogId) {
        return;
      }

      const db = await getDatabase();
      await initializeDatabase(db);
      const logs = await listTaskLogsByExecutionLogId(db, executionLogId);
      if (!isMounted) {
        return;
      }

      setTaskLogs(logs);
      setNotes(
        Object.fromEntries(logs.map((log) => [log.id, log.note ?? ''])),
      );
    }

    void loadTaskLogs();
    return () => {
      isMounted = false;
    };
  }, [executionLogId]);

  const handleSaveNotes = async () => {
    if (!executionLogId) {
      return;
    }

    setIsSavingNotes(true);
    setNoteMessage(null);
    const db = await getDatabase();
    await initializeDatabase(db);
    await updateTaskLogNotes(
      db,
      taskLogs.map((log) => ({
        taskLogId: log.id,
        note: (notes[log.id] ?? '').trim() || null,
      })),
    );
    setIsSavingNotes(false);
    setNoteMessage('メモを保存しました');
  };

  const handleShare = async () => {
    setIsSharing(true);
    setShareMessage(null);

    try {
      if (!cardRef.current) {
        throw new Error('share card view is not ready');
      }

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
      });
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        setShareMessage('この端末では共有を使えません。スクリーンショットで保存してください。');
        return;
      }

      await Sharing.shareAsync(uri, {
        dialogTitle: 'FlexRoutineの完了カードを共有',
        mimeType: 'image/png',
      });
      setShareMessage(`PNGを共有シートへ渡しました: ${uri}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setShareMessage(`この端末では画像生成を使えません: ${message}`);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View ref={cardRef} collapsable={false} style={[styles.shareCard, presetStyles[backgroundPreset]]}>
        <Text style={styles.cardBrand}>FlexRoutine</Text>
        <Text style={styles.cardRoutine}>{routineTitle ?? 'ルーティン'}</Text>
        <Text style={styles.cardTitle}>今日の最低限を守れました</Text>
        <Text style={styles.cardBody}>
          {runMode === 'EMERGENCY'
            ? '短縮版でも、守るタスクは残して進められました。'
            : '通常版のルーティンを完了しました。'}
        </Text>
        <View style={styles.cardStats}>
          <CardStat label="完了" value={`${completed ?? '0'}件`} />
          <CardStat label="スキップ" value={`${skipped ?? '0'}件`} />
          <CardStat label="予定" value={formatDuration(Number(plannedSec ?? 0))} />
          <CardStat label="実績" value={formatDuration(Number(actualSec ?? 0))} />
        </View>
        <Text style={styles.cardFooter}>{new Date().toLocaleDateString('ja-JP')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>背景テンプレート</Text>
        <View style={styles.presetRow}>
          {backgroundPresets.map((preset) => (
            <Pressable
              accessibilityRole="button"
              key={preset.value}
              style={[
                styles.presetChip,
                backgroundPreset === preset.value ? styles.presetChipSelected : null,
              ]}
              onPress={() => setBackgroundPreset(preset.value)}
            >
              <Text
                style={[
                  styles.presetChipText,
                  backgroundPreset === preset.value ? styles.presetChipTextSelected : null,
                ]}
              >
                {preset.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>実績</Text>
        <Text style={styles.line}>完了: {completed ?? '0'}件</Text>
        <Text style={styles.line}>スキップ: {skipped ?? '0'}件</Text>
        <Text style={styles.line}>予定: {formatDuration(Number(plannedSec ?? 0))}</Text>
        <Text style={styles.line}>実績: {formatDuration(Number(actualSec ?? 0))}</Text>
        <Text style={styles.logId}>log: {executionLogId}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>メモ</Text>
          <Pressable accessibilityRole="button" onPress={() => setShowsNotes((current) => !current)}>
            <Text style={styles.secondaryAction}>{showsNotes ? '閉じる' : 'メモを残す'}</Text>
          </Pressable>
        </View>
        {showsNotes ? (
          <View style={styles.noteList}>
            {taskLogs.length === 0 ? (
              <ActivityIndicator />
            ) : (
              taskLogs.map((log) => (
                <View key={log.id} style={styles.noteRow}>
                  <Text style={styles.noteTaskTitle}>
                    {log.taskTitleSnapshot}
                    {log.status === 'SKIPPED' ? '（スキップ）' : ''}
                  </Text>
                  <TextInput
                    placeholder="気づいたことがあれば"
                    style={styles.noteInput}
                    value={notes[log.id] ?? ''}
                    onChangeText={(value) =>
                      setNotes((current) => ({
                        ...current,
                        [log.id]: value,
                      }))
                    }
                  />
                </View>
              ))
            )}
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleSaveNotes}>
              <Text style={styles.primaryButtonText}>{isSavingNotes ? '保存中' : 'メモを保存'}</Text>
            </Pressable>
            {noteMessage ? <Text style={styles.inlineMessage}>{noteMessage}</Text> : null}
          </View>
        ) : (
          <Text style={styles.subtleText}>完了直後だけ、必要なときに軽く残せます。</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>共有</Text>
        <Text style={styles.subtleText}>カードをPNGにしてAndroid共有シートへ渡します。</Text>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleShare}>
          <Text style={styles.primaryButtonText}>{isSharing ? '準備中' : '画像で共有'}</Text>
        </Pressable>
        {shareMessage ? <Text style={styles.inlineMessage}>{shareMessage}</Text> : null}
      </View>

      <Link href="/" style={styles.homeLink}>
        ホームへ
      </Link>
    </ScrollView>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cardStat}>
      <Text style={styles.cardStatLabel}>{label}</Text>
      <Text style={styles.cardStatValue}>{value}</Text>
    </View>
  );
}

const presetStyles = StyleSheet.create<Record<BackgroundPreset, object>>({
  'soft-morning': {
    backgroundColor: '#fef3c7',
  },
  'calm-night': {
    backgroundColor: '#dbeafe',
  },
  'focus-blue': {
    backgroundColor: '#bfdbfe',
  },
  'warm-minimal': {
    backgroundColor: '#fde68a',
  },
  'green-reset': {
    backgroundColor: '#bbf7d0',
  },
});

const styles = StyleSheet.create({
  container: {
    gap: 14,
    padding: 20,
    paddingBottom: 32,
  },
  shareCard: {
    borderRadius: 8,
    gap: 14,
    padding: 22,
  },
  cardBrand: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    opacity: 0.7,
  },
  cardRoutine: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
  },
  cardTitle: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 38,
  },
  cardBody: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
  },
  cardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cardStat: {
    backgroundColor: '#ffffffcc',
    borderRadius: 8,
    minWidth: '45%',
    padding: 12,
  },
  cardStatLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  cardStatValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  cardFooter: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    gap: 10,
    padding: 18,
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
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  presetChipSelected: {
    backgroundColor: '#111827',
  },
  presetChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  presetChipTextSelected: {
    color: '#ffffff',
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryAction: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '900',
  },
  subtleText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
  },
  noteList: {
    gap: 12,
  },
  noteRow: {
    gap: 6,
  },
  noteTaskTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  noteInput: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  inlineMessage: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
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
