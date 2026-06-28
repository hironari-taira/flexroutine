import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getDatabase, initializeDatabase } from '@/db/database';
import {
  archiveTask,
  moveTask,
  updateTaskDetails,
  upsertTask,
} from '@/db/repositories/taskRepository';
import {
  getRoutineWithTasks,
  type RoutineWithTasks,
} from '@/db/repositories/routineRepository';
import type { EmergencyBehavior, Task } from '@/types/models';
import { createId } from '@/utils/ids';
import { formatDuration } from '@/utils/time';

const behaviorOptions: { label: string; value: EmergencyBehavior }[] = [
  { label: '絶対やる', value: 'MUST_DO' },
  { label: '短くしてやる', value: 'SHRINKABLE' },
  { label: '余裕があれば', value: 'OPTIONAL' },
];

export default function RoutineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [routine, setRoutine] = useState<RoutineWithTasks | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const handleMove = async (taskId: string, direction: 'UP' | 'DOWN') => {
    if (!routine) {
      return;
    }
    const db = await getDatabase();
    await initializeDatabase(db);
    await moveTask(db, routine.id, taskId, direction);
    await load();
  };

  const handleArchive = async (task: Task) => {
    Alert.alert('タスクを外しますか？', 'このタスクを今後のルーティンから外します。過去の実行ログは残ります。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const db = await getDatabase();
            await initializeDatabase(db);
            await archiveTask(db, task.id);
            await load();
          })();
        },
      },
    ]);
  };

  const handleAddTask = async () => {
    if (!routine) {
      return;
    }
    const title = newTaskTitle.trim();
    const normalDurationSec = Math.max(30, Number.parseInt(newTaskNormalMin || '1', 10) * 60);
    const minDurationSec = Math.min(
      normalDurationSec,
      Math.max(0, Number.parseInt(newTaskMinMin || '0', 10) * 60),
    );

    if (!title) {
      Alert.alert('タスク名を入力してください');
      return;
    }

    const nowIso = new Date().toISOString();
    const policies = behaviorToPolicies(newTaskBehavior);
    const db = await getDatabase();
    await initializeDatabase(db);
    await upsertTask(db, {
      id: createId('task'),
      routineId: routine.id,
      title,
      normalDurationSec,
      minDurationSec,
      emergencyBehavior: newTaskBehavior,
      skipPolicy: policies.skipPolicy,
      shortenPolicy: policies.shortenPolicy,
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
          通常 {formatDuration(routine.normalTotalSec)} / 最低限{' '}
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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>タスク編集</Text>
        <Text style={styles.sectionNote}>保存すると次の実行プランに反映されます。</Text>
      </View>

      <View style={styles.taskList}>
        {routine.tasks.map((task, index) => (
          <TaskEditor
            index={index}
            isFirst={index === 0}
            isLast={index === routine.tasks.length - 1}
            key={task.id}
            task={task}
            onArchive={handleArchive}
            onMove={handleMove}
            onSaved={load}
          />
        ))}
      </View>

      <View style={styles.addCard}>
        <Text style={styles.sectionTitle}>タスク追加</Text>
        <TextInput
          placeholder="新しいタスク名"
          style={styles.input}
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
        />
        <View style={styles.inlineInputs}>
          <LabeledInput
            label="通常(分)"
            value={newTaskNormalMin}
            onChangeText={(value) => setNewTaskNormalMin(value.replace(/[^0-9]/g, ''))}
          />
          <LabeledInput
            label="最小(分)"
            value={newTaskMinMin}
            onChangeText={(value) => setNewTaskMinMin(value.replace(/[^0-9]/g, ''))}
          />
        </View>
        <BehaviorPicker value={newTaskBehavior} onChange={setNewTaskBehavior} />
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={handleAddTask}>
          <Text style={styles.primaryButtonText}>追加する</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function TaskEditor({
  index,
  isFirst,
  isLast,
  onArchive,
  onMove,
  onSaved,
  task,
}: {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onArchive: (task: Task) => void;
  onMove: (taskId: string, direction: 'UP' | 'DOWN') => Promise<void>;
  onSaved: () => Promise<void>;
  task: Task;
}) {
  const [title, setTitle] = useState(task.title);
  const [normalMin, setNormalMin] = useState(String(Math.max(1, Math.round(task.normalDurationSec / 60))));
  const [minMin, setMinMin] = useState(String(Math.round(task.minDurationSec / 60)));
  const [behavior, setBehavior] = useState<EmergencyBehavior>(task.emergencyBehavior);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const normalDurationSec = Math.max(30, Number.parseInt(normalMin || '1', 10) * 60);
    const minDurationSec = Math.min(
      normalDurationSec,
      Math.max(0, Number.parseInt(minMin || '0', 10) * 60),
    );

    if (!trimmedTitle) {
      Alert.alert('タスク名を入力してください');
      return;
    }

    setIsSaving(true);
    const db = await getDatabase();
    await initializeDatabase(db);
    await updateTaskDetails(db, task.id, {
      title: trimmedTitle,
      normalDurationSec,
      minDurationSec,
      emergencyBehavior: behavior,
      ...behaviorToPolicies(behavior),
    });
    await onSaved();
    setIsSaving(false);
  };

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.orderBadge}>{index + 1}</Text>
        <TextInput style={styles.taskTitleInput} value={title} onChangeText={setTitle} />
      </View>

      <View style={styles.inlineInputs}>
        <LabeledInput
          label="通常(分)"
          value={normalMin}
          onChangeText={(value) => setNormalMin(value.replace(/[^0-9]/g, ''))}
        />
        <LabeledInput
          label="最小(分)"
          value={minMin}
          onChangeText={(value) => setMinMin(value.replace(/[^0-9]/g, ''))}
        />
      </View>

      <BehaviorPicker value={behavior} onChange={setBehavior} />

      <View style={styles.rowActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isFirst}
          style={[styles.smallButton, isFirst ? styles.disabledButton : null]}
          onPress={() => void onMove(task.id, 'UP')}
        >
          <Text style={[styles.smallButtonText, isFirst ? styles.disabledText : null]}>上へ</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isLast}
          style={[styles.smallButton, isLast ? styles.disabledButton : null]}
          onPress={() => void onMove(task.id, 'DOWN')}
        >
          <Text style={[styles.smallButtonText, isLast ? styles.disabledText : null]}>下へ</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{isSaving ? '保存中' : '保存'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.deleteButton} onPress={() => onArchive(task)}>
          <Text style={styles.deleteButtonText}>削除</Text>
        </Pressable>
      </View>
    </View>
  );
}

function LabeledInput({
  label,
  onChangeText,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.labeledInput}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        inputMode="numeric"
        keyboardType="number-pad"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
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
    <View style={styles.behaviorRow}>
      {behaviorOptions.map((option) => (
        <Pressable
          accessibilityRole="button"
          key={option.value}
          style={[styles.behaviorChip, value === option.value ? styles.behaviorChipSelected : null]}
          onPress={() => onChange(option.value)}
        >
          <Text
            style={[
              styles.behaviorChipText,
              value === option.value ? styles.behaviorChipTextSelected : null,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
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
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionNote: {
    color: '#52606d',
    fontSize: 13,
  },
  taskList: {
    gap: 10,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    gap: 12,
    padding: 14,
  },
  taskHeader: {
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
  taskTitleInput: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  labeledInput: {
    flex: 1,
    gap: 5,
  },
  inputLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  behaviorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  behaviorChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  behaviorChipSelected: {
    backgroundColor: '#111827',
  },
  behaviorChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  behaviorChipTextSelected: {
    color: '#ffffff',
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  smallButtonText: {
    color: '#111827',
    fontWeight: '800',
  },
  saveButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  deleteButtonText: {
    color: '#991b1b',
    fontWeight: '900',
  },
  disabledButton: {
    backgroundColor: '#f1f5f9',
  },
  disabledText: {
    color: '#94a3b8',
  },
  addCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    gap: 12,
    padding: 14,
  },
});
