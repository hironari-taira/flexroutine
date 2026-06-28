import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Section } from '@/components/ui/Section';
import { getDatabase, initializeDatabase } from '@/db/database';
import { listRoutineCards, upsertRoutine } from '@/db/repositories/routineRepository';
import { upsertTask } from '@/db/repositories/taskRepository';
import { scheduleRoutineNotification } from '@/services/notificationService';
import type { EmergencyBehavior, RoutineContext, Task } from '@/types/models';
import { createId } from '@/utils/ids';

const templates: {
  context: RoutineContext;
  icon: string;
  label: string;
  tasks: [string, number, number, EmergencyBehavior, string][];
  title: string;
}[] = [
  {
    context: 'MORNING',
    icon: '☀️',
    label: '朝',
    title: '朝の支度',
    tasks: [
      ['水を飲む', 1, 1, 'MUST_DO', '最低限でも水だけは飲む'],
      ['洗顔', 3, 2, 'MUST_DO', '短縮時は顔を洗うだけ'],
      ['着替え', 5, 3, 'SHRINKABLE', '迷わず着る服を選ぶ'],
    ],
  },
  {
    context: 'NIGHT',
    icon: '🌙',
    label: '夜',
    title: '夜の支度',
    tasks: [
      ['部屋を少し戻す', 5, 1, 'OPTIONAL', '床だけ見る'],
      ['歯磨き', 3, 2, 'MUST_DO', '最低限で口をさっぱりさせる'],
      ['明日の予定を見る', 2, 1, 'SHRINKABLE', '最初の予定だけ確認する'],
    ],
  },
  {
    context: 'WORK_START',
    icon: '💻',
    label: '仕事前',
    title: '仕事開始前',
    tasks: [
      ['机の上を戻す', 2, 1, 'SHRINKABLE', '作業場所だけ空ける'],
      ['今日の予定を見る', 2, 1, 'MUST_DO', '最初の予定だけ見る'],
      ['作業開始', 1, 1, 'MUST_DO', '1つ目を開く'],
    ],
  },
  {
    context: 'CUSTOM',
    icon: '⏱️',
    label: '空で作る',
    title: '',
    tasks: [['最初のタスク', 3, 1, 'MUST_DO', '短縮時に何をするかを書く']],
  },
];

export default function NewRoutineScreen() {
  const router = useRouter();
  const [templateIndex, setTemplateIndex] = useState(0);
  const template = templates[templateIndex];
  const [title, setTitle] = useState(template.title);
  const [icon, setIcon] = useState(template.icon);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationTime, setNotificationTime] = useState('07:30');
  const [firstTaskTitle, setFirstTaskTitle] = useState(template.tasks[0][0]);

  const selectTemplate = (index: number) => {
    const next = templates[index];
    setTemplateIndex(index);
    setTitle(next.title);
    setIcon(next.icon);
    setFirstTaskTitle(next.tasks[0][0]);
  };

  const createRoutine = async () => {
    const trimmedTitle = title.trim();
    const trimmedTaskTitle = firstTaskTitle.trim();
    if (!trimmedTitle || !trimmedTaskTitle) {
      Alert.alert('ルーティン名と最初のタスクを入力してください');
      return;
    }

    const db = await getDatabase();
    await initializeDatabase(db);
    const routines = await listRoutineCards(db);
    const nowIso = new Date().toISOString();
    const routineId = createId('routine');
    const routine = {
      id: routineId,
      title: trimmedTitle,
      context: template.context,
      icon,
      sortIndex: routines.length,
      defaultStartTime: notificationTime,
      notificationEnabled,
      notificationTime,
      createdAt: nowIso,
      updatedAt: nowIso,
      archivedAt: null,
    };

    await upsertRoutine(db, routine);
    const taskDefs = template.tasks.map((task, index) =>
      index === 0 ? ([trimmedTaskTitle, task[1], task[2], task[3], task[4]] satisfies typeof task) : task,
    );
    for (const [taskIndex, [taskTitle, normalMin, minMin, behavior, emergencyNote]] of taskDefs.entries()) {
      const canSkip = behavior === 'OPTIONAL';
      await upsertTask(db, {
        id: createId('task'),
        routineId,
        title: String(taskTitle),
        normalDurationSec: Number(normalMin) * 60,
        minDurationSec: Number(minMin) * 60,
        emergencyNote: String(emergencyNote),
        emergencyBehavior: behavior as EmergencyBehavior,
        skipPolicy: canSkip ? 'EMERGENCY_ONLY' : 'NEVER',
        shortenPolicy: behavior === 'OPTIONAL' ? 'NEVER' : 'ALLOW',
        orderIndex: taskIndex,
        announceThirtySecBefore: true,
        autoAdvanceOnTimeout: true,
        createdAt: nowIso,
        updatedAt: nowIso,
        archivedAt: null,
      } satisfies Task);
    }

    if (notificationEnabled) {
      await scheduleRoutineNotification(routine);
    }

    router.replace({ pathname: '/routine/[id]', params: { id: routineId } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="新しいルーティン" hint="場所・移動順を意識して並べると、自然に体が動きます。">
        <Card style={styles.cardGap}>
          <Text style={styles.label}>テンプレート</Text>
          <View style={styles.chipRow}>
            {templates.map((item, index) => (
              <Button
                key={item.label}
                label={item.label}
                variant={templateIndex === index ? 'primary' : 'secondary'}
                onPress={() => selectTemplate(index)}
              />
            ))}
          </View>
          <Text style={styles.label}>ルーティン名</Text>
          <Input value={title} onChangeText={setTitle} />
          <Text style={styles.label}>アイコン</Text>
          <Input value={icon} onChangeText={setIcon} />
          <Text style={styles.label}>最初のタスク</Text>
          <Input value={firstTaskTitle} onChangeText={setFirstTaskTitle} />
        </Card>
      </Section>

      <Section title="通知">
        <Card style={styles.cardGap}>
          <Button
            label={notificationEnabled ? '通知 ON' : '通知 OFF'}
            variant={notificationEnabled ? 'primary' : 'secondary'}
            onPress={() => setNotificationEnabled((current) => !current)}
          />
          <Text style={styles.label}>通知時刻</Text>
          <Input
            inputMode="numeric"
            placeholder="07:30"
            value={notificationTime}
            onChangeText={(value) => setNotificationTime(value.replace(/[^0-9:]/g, '').slice(0, 5))}
          />
        </Card>
      </Section>

      <Button label="作成する" onPress={createRoutine} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 32,
  },
  cardGap: {
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
});
