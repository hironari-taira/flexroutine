import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RoutineCardView } from '@/db/repositories/routineRepository';
import { formatDuration } from '@/utils/time';

interface RoutineCardProps {
  routine: RoutineCardView;
  onEmergencyPress: () => void;
  onPress: () => void;
  onStartPress: () => void;
}

export function RoutineCard({
  routine,
  onEmergencyPress,
  onPress,
  onStartPress,
}: RoutineCardProps) {
  return (
    <Pressable accessibilityRole="button" style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.icon}>{routine.icon}</Text>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>{routine.title}</Text>
          <Text style={styles.meta}>
            通常 {formatDuration(routine.normalTotalSec)} / 最近平均{' '}
            {routine.recentAverageSec ? formatDuration(routine.recentAverageSec) : '未計測'}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>最低限 {formatDuration(routine.minimumTotalSec)}</Text>
        <Text style={styles.detailText}>タスク {routine.taskCount}件</Text>
        {routine.notificationEnabled && routine.notificationTime ? (
          <Text style={styles.detailText}>通知 {routine.notificationTime}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.startButton} onPress={onStartPress}>
          <Text style={styles.startButtonText}>スタート</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.emergencyButton}
          onPress={onEmergencyPress}
        >
          <Text style={styles.emergencyButtonText}>緊急！時短</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  icon: {
    fontSize: 26,
    width: 34,
  },
  titleGroup: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    color: '#52606d',
    fontSize: 13,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailText: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 12,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  emergencyButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 12,
  },
  emergencyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
