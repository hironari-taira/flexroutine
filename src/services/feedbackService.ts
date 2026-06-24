import * as Haptics from 'expo-haptics';

export async function notifyTaskAdvance() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics are best-effort; timer controls must keep working without them.
  }
}

export async function notifyCompletion() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Best-effort only.
  }
}
