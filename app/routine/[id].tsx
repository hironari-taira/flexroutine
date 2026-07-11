import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Section } from '@/components/ui/Section';
import { getDatabase, initializeDatabase } from '@/db/database';
import {
  archiveRoutine,
  getRoutineWithTasks,
  type RoutineWithTasks,
  updateRoutineDetails,
} from '@/db/repositories/routineRepository';
import {
  archiveTask,
  moveTask,
  updateTaskDetails,
  upsertTask,
} from '@/db/repositories/taskRepository';
import {
  cancelRoutineNotification,
  scheduleRoutineNotification,
} from '@/services/notificationService';
import type { EmergencyBehavior, RoutineContext, Task } from '@/types/models';
import { createId } from '@/utils/ids';
import { formatDuration } from '@/utils/time';

const behaviorOptions: { label: string; value: EmergencyBehavior }[] = [
  { label: '必ずやる', value: 'MUST_DO' },
  { label: '短くする', value: 'SHRINKABLE' },
  { label: '余裕があれば', value: 'OPTIONAL' },
];

const contextOptions: { label: string; value: RoutineContext }[] = [
  { label: '朝', value: 'MORNING' },
  { label: '夜', value: 'NIGHT' },
  { label: '仕事前', value: 'WORK_START' },
  { label: 'カスタム', value: 'CUSTOM' },
];

export default function RoutineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [routine, setRoutine] = useState<RoutineWithTasks | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isEditingRoutine, setIsEditingRoutine] = useState(false);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineIcon, setRoutineIcon] = useState('');
  const [routineContext, setRoutineContext] = useState<RoutineContext>('CUSTOM');
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState('07:30');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNormalMin, setNewTaskNormalMin] = useState('3');
  const [newTaskMinMin, setNewTaskMinMin] = useState('1');
  const [newTaskBehavior, setNewTaskBehavior] = useState<EmergencyBehavior>('SHRINKABLE');

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    const db = await getDatabase();
    await initializeDatabase(db);
    const nextRoutine = await getRoutineWithTasks(db, id);
    setRoutine(nextRoutine);
    if (nextRoutine) {
      setRoutineTitle(nextRoutine.title);
      setRoutineIcon(nextRoutine.icon ?? '⏱️');
      setRoutineContext(nextRoutine.context);
      setNotificationEnabled(nextRoutine.notificationEnabled);
      setNotificationTime(nextRoutine.notificationTime ?? nextRoutine.defaultStartTime ?? '07:30');
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const saveRoutine = async () => {
    if (!routine) {
      return;
    }
    const db = await getDatabase();
    await initializeDatabase(db);
    const values = {
      title: routineTitle.trim() || routine.title,
      context: routineContext,
      icon: routineIcon.trim() || '⏱️',
      defaultStartTime: notificationTime,
      notificationEnabled,
      notificationTime,
    };
    await updateRoutineDetails(db, routine.id, values);
    if (notificationEnabled) {
      const notification = await scheduleRoutineNotification({ ...routine, ...values });
      if (!notification.ok) {
        Alert.alert(
          '通知は端末に設定されていません',
          `${notification.message}\nルーティンの保存は完了しています。`,
        );
      }
    } else {
      await cancelRoutineNotification(routine.id);
    }
    setIsEditingRoutine(false);
    await load();
  };

  const confirmArchiveRoutine = () => {
    if (!routine) {
      return;
    }
    Alert.alert(
      'ルーティンをアーカイブしますか？',
      'アクティブな一覧からは非表示になります。過去の実行ログは残ります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'アーカイブ',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const db = await getDatabase();
              await initializeDatabase(db);
              await archiveRoutine(db, routine.id);
              await cancelRoutineNotification(routine.id);
              router.replace('/');
            })();
          },
        },
      ],
    );
  };

  const handleMove = async (taskId: string, direction: 'UP' | 'DOWN') => {
    if (!routine) {
      return;
    }
    const db = await getDatabase();
    await initializeDatabase(db);
    await moveTask(db, routine.id, taskId, direction);
    await load();
  };

  const handleAddTask = async () => {
    if (!routine || !newTaskTitle.trim()) {
      Alert.alert('タスク名を入力してください');
      return;
    }
    const normalDurationSec = Math.max(30, Number.parseInt(newTaskNormalMin || '1', 10) * 60);
    const minDurationSec = Math.min(
      normalDurationSec,
      Math.max(0, Number.parseInt(newTaskMinMin || '0', 10) * 60),
    );
    const policies = behaviorToPolicies(newTaskBehavior);
    const nowIso = new Date().toISOString();
    const db = await getDatabase();
    await initializeDatabase(db);
    await upsertTask(db, {
      id: createId('task'),
      routineId: routine.id,
      title: newTaskTitle.trim(),
      normalDurationSec,
      minDurationSec,
      emergencyNote: '',
      emergencyBehavior: newTaskBehavior,
      ...policies,
      orderIndex: routine.tasks.length,
      announceThirtySecBefore: true,
      autoAdvanceOnTimeout: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
    });
    setNewTaskTitle('');
    await load();
  };

  if (!routine) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>ルーティンが見つかりませんでした</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.summary}>
        <Text style={styles.icon}>{routine.icon}</Text>
        <View style={styles.summaryText}>
          <Text style={styles.title}>{routine.title}</Text>
          <Text style={styles.meta}>
            通常 {formatDuration(routine.normalTotalSec)} / 最低限{' '}
            {formatDuration(routine.minimumTotalSec)}
          </Text>
        </View>
        <Button
          label={isEditingRoutine ? '閉じる' : '編集'}
          variant="secondary"
          onPress={() => setIsEditingRoutine((v) => !v)}
          style={styles.routineEditButton}
        />
      </Card>

      {isEditingRoutine ? (
        <Card style={styles.cardGap}>
          <Text style={styles.label}>ルーティン名</Text>
          <Input value={routineTitle} onChangeText={setRoutineTitle} />
          <Text style={styles.label}>アイコン</Text>
          <Input value={routineIcon} onChangeText={setRoutineIcon} />
          <Text style={styles.label}>用途</Text>
          <View style={styles.chipRow}>
            {contextOptions.map((option) => (
              <Button
                key={option.value}
                label={option.label}
                variant={routineContext === option.value ? 'primary' : 'secondary'}
                onPress={() => setRoutineContext(option.value)}
              />
            ))}
          </View>
          <Text style={styles.label}>通知</Text>
          <View style={styles.inlineActions}>
            <Button
              label={notificationEnabled ? '通知 ON' : '通知 OFF'}
              variant={notificationEnabled ? 'primary' : 'secondary'}
              onPress={() => setNotificationEnabled((v) => !v)}
              style={styles.flexButton}
            />
            <Input
              value={notificationTime}
              onChangeText={(value) => setNotificationTime(value.slice(0, 5))}
              style={styles.timeInput}
            />
          </View>
          <View style={styles.inlineActions}>
            <Button label="保存" onPress={saveRoutine} style={styles.flexButton} />
            <Button
              label="削除"
              variant="destructive"
              onPress={confirmArchiveRoutine}
              style={styles.flexButton}
            />
          </View>
        </Card>
      ) : null}

      <View style={styles.inlineActions}>
        <Button
          label="通常スタート"
          onPress={() =>
            router.push({
              pathname: '/routine/[id]/run',
              params: { id: routine.id, mode: 'normal' },
            })
          }
          style={styles.flexButton}
        />
        <Button
          label="緊急・時短"
          variant="destructive"
          onPress={() =>
            router.push({
              pathname: '/routine/[id]/run',
              params: { id: routine.id, mode: 'emergency' },
            })
          }
          style={styles.flexButton}
        />
      </View>

      <Button
        label={isEditingRoutine ? 'ルーティン設定を閉じる' : 'ルーティン設定'}
        variant="secondary"
        onPress={() => setIsEditingRoutine((v) => !v)}
      />

      <Section title="タスク" hint="場所・移動順を意識して並べると、自然に体が動きます。">
        <View style={styles.taskList}>
          {routine.tasks.map((task, index) => (
            <TaskRow
              index={index}
              isExpanded={expandedTaskId === task.id}
              isFirst={index === 0}
              isLast={index === routine.tasks.length - 1}
              key={task.id}
              task={task}
              onArchive={async () => {
                const db = await getDatabase();
                await initializeDatabase(db);
                await archiveTask(db, task.id);
                await load();
              }}
              onMove={handleMove}
              onSaved={load}
              onToggle={() =>
                setExpandedTaskId((current) => (current === task.id ? null : task.id))
              }
            />
          ))}
        </View>
      </Section>

      <Card style={styles.cardGap}>
        <Text style={styles.sectionTitle}>タスク追加</Text>
        <Input placeholder="新しいタスク名" value={newTaskTitle} onChangeText={setNewTaskTitle} />
        <View style={styles.inlineActions}>
          <Input
            value={newTaskNormalMin}
            onChangeText={(v) => setNewTaskNormalMin(v.replace(/[^0-9]/g, ''))}
            style={styles.flexButton}
          />
          <Input
            value={newTaskMinMin}
            onChangeText={(v) => setNewTaskMinMin(v.replace(/[^0-9]/g, ''))}
            style={styles.flexButton}
          />
        </View>
        <BehaviorPicker value={newTaskBehavior} onChange={setNewTaskBehavior} />
        <Button label="追加する" onPress={handleAddTask} />
      </Card>
    </ScrollView>
  );
}

function TaskRow({
  index,
  isExpanded,
  isFirst,
  isLast,
  onArchive,
  onMove,
  onSaved,
  onToggle,
  task,
}: {
  index: number;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  onArchive: () => Promise<void>;
  onMove: (taskId: string, direction: 'UP' | 'DOWN') => Promise<void>;
  onSaved: () => Promise<void>;
  onToggle: () => void;
  task: Task;
}) {
  const [title, setTitle] = useState(task.title);
  const [normalMin, setNormalMin] = useState(
    String(Math.max(1, Math.round(task.normalDurationSec / 60))),
  );
  const [minMin, setMinMin] = useState(String(Math.round(task.minDurationSec / 60)));
  const [behavior, setBehavior] = useState<EmergencyBehavior>(task.emergencyBehavior);
  const [emergencyNote, setEmergencyNote] = useState(task.emergencyNote ?? '');

  const save = async () => {
    const normalDurationSec = Math.max(30, Number.parseInt(normalMin || '1', 10) * 60);
    const minDurationSec = Math.min(
      normalDurationSec,
      Math.max(0, Number.parseInt(minMin || '0', 10) * 60),
    );
    const db = await getDatabase();
    await initializeDatabase(db);
    await updateTaskDetails(db, task.id, {
      title: title.trim() || task.title,
      normalDurationSec,
      minDurationSec,
      emergencyNote: emergencyNote.trim() || null,
      emergencyBehavior: behavior,
      ...behaviorToPolicies(behavior),
    });
    await onSaved();
  };

  const confirmArchive = () => {
    Alert.alert(
      'タスクをアーカイブしますか？',
      `「${task.title}」はこのルーティンの一覧から非表示になります。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'アーカイブ',
          style: 'destructive',
          onPress: () => void onArchive(),
        },
      ],
    );
  };

  return (
    <Card style={styles.taskCard}>
      <Pressable accessibilityRole="button" style={styles.taskCompact} onPress={onToggle}>
        <Text style={styles.orderBadge}>{index + 1}</Text>
        <View style={styles.taskText}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskMeta}>
            {formatDuration(task.normalDurationSec)} / 最低 {formatDuration(task.minDurationSec)}
          </Text>
        </View>
        <Badge
          label={
            task.emergencyBehavior === 'OPTIONAL'
              ? '余裕'
              : task.emergencyBehavior === 'SHRINKABLE'
                ? '短縮'
                : '必須'
          }
          tone={task.emergencyBehavior === 'OPTIONAL' ? 'warning' : 'info'}
        />
      </Pressable>

      <View style={styles.inlineActions}>
        <Button
          label="↑"
          variant="secondary"
          disabled={isFirst}
          onPress={() => void onMove(task.id, 'UP')}
        />
        <Button
          label="↓"
          variant="secondary"
          disabled={isLast}
          onPress={() => void onMove(task.id, 'DOWN')}
        />
        <Button
          label={isExpanded ? '閉じる' : '編集'}
          variant="ghost"
          onPress={onToggle}
          style={styles.flexButton}
        />
      </View>

      {isExpanded ? (
        <View style={styles.expanded}>
          <Input value={title} onChangeText={setTitle} />
          <View style={styles.inlineActions}>
            <Input
              value={normalMin}
              onChangeText={(v) => setNormalMin(v.replace(/[^0-9]/g, ''))}
              style={styles.flexButton}
            />
            <Input
              value={minMin}
              onChangeText={(v) => setMinMin(v.replace(/[^0-9]/g, ''))}
              style={styles.flexButton}
            />
          </View>
          <BehaviorPicker value={behavior} onChange={setBehavior} />
          <Input
            placeholder="時短版では何をする？ 例: 髪だけ整える"
            value={emergencyNote}
            onChangeText={setEmergencyNote}
          />
          <View style={styles.inlineActions}>
            <Button label="保存" onPress={save} style={styles.flexButton} />
            <Button
              label="アーカイブ"
              variant="destructive"
              onPress={confirmArchive}
              style={styles.flexButton}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function BehaviorPicker({
  onChange,
  value,
}: {
  onChange: (value: EmergencyBehavior) => void;
  value: EmergencyBehavior;
}) {
  return (
    <View style={styles.chipRow}>
      {behaviorOptions.map((option) => (
        <Button
          key={option.value}
          label={option.label}
          variant={value === option.value ? 'primary' : 'secondary'}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

function behaviorToPolicies(behavior: EmergencyBehavior) {
  return {
    shortenPolicy: behavior === 'OPTIONAL' ? 'NEVER' : 'ALLOW',
    skipPolicy: behavior === 'OPTIONAL' ? 'EMERGENCY_ONLY' : 'NEVER',
  } as const;
}

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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  icon: {
    fontSize: 28,
  },
  summaryText: {
    flex: 1,
    gap: 4,
  },
  routineEditButton: {
    marginRight: 56,
    minWidth: 96,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  meta: {
    color: '#52606d',
    fontSize: 14,
  },
  cardGap: {
    gap: 10,
  },
  label: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 10,
  },
  flexButton: {
    flex: 1,
  },
  timeInput: {
    flex: 1,
  },
  taskList: {
    gap: 10,
  },
  taskCard: {
    gap: 10,
  },
  taskCompact: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  orderBadge: {
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    color: '#3730a3',
    fontSize: 13,
    fontWeight: '900',
    minWidth: 28,
    overflow: 'hidden',
    paddingVertical: 6,
    textAlign: 'center',
  },
  taskText: {
    flex: 1,
    gap: 3,
  },
  taskTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  taskMeta: {
    color: '#64748b',
    fontSize: 13,
  },
  expanded: {
    gap: 10,
  },
});
