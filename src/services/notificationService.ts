import type { Routine } from '@/types/models';

export interface NotificationResult {
  ok: boolean;
  message: string;
  notificationId?: string;
}

type ExpoNotifications = typeof import('expo-notifications');

let cachedNotifications: ExpoNotifications | null | undefined;
let didSetHandler = false;

async function getNotifications(): Promise<ExpoNotifications | null> {
  if (cachedNotifications !== undefined) {
    return cachedNotifications;
  }

  try {
    cachedNotifications = await import('expo-notifications');
  } catch {
    cachedNotifications = null;
  }

  if (cachedNotifications && !didSetHandler) {
    cachedNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    didSetHandler = true;
  }

  return cachedNotifications;
}

function unavailable(): NotificationResult {
  return {
    ok: false,
    message: 'この実行環境では通知を使えません。AndroidのExpo Goではdevelopment buildで確認してください。',
  };
}

export async function requestNotificationPermission(): Promise<NotificationResult> {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return unavailable();
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return { ok: true, message: '通知は許可されています' };
  }

  const next = await Notifications.requestPermissionsAsync();
  if (!next.granted) {
    return {
      ok: false,
      message: '通知が許可されませんでした。設定から後で変更できます。',
    };
  }

  return { ok: true, message: '通知を許可しました' };
}

export async function scheduleRoutineNotification(routine: Routine): Promise<NotificationResult> {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return unavailable();
  }

  if (!routine.notificationEnabled || !routine.notificationTime) {
    return { ok: true, message: '通知はOFFです' };
  }

  const permission = await requestNotificationPermission();
  if (!permission.ok) {
    return permission;
  }

  await cancelRoutineNotification(routine.id);
  const [hourText, minuteText] = routine.notificationTime.split(':');
  const hour = Number.parseInt(hourText ?? '', 10);
  const minute = Number.parseInt(minuteText ?? '', 10);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return { ok: false, message: '通知時刻が不正です' };
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      body: '今日の最低限だけでも進めましょう',
      data: { routineId: routine.id },
      title: `${routine.icon ?? '⏱'} ${routine.title}`,
    },
    trigger: {
      hour,
      minute,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
  });

  return { ok: true, message: '通知を設定しました', notificationId };
}

export async function cancelRoutineNotification(routineId: string): Promise<NotificationResult> {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return unavailable();
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.routineId === routineId)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );

  return { ok: true, message: '通知を解除しました' };
}

export async function rescheduleAllRoutineNotifications(routines: Routine[]): Promise<NotificationResult[]> {
  return Promise.all(routines.map((routine) => scheduleRoutineNotification(routine)));
}
