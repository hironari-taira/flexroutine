import * as Speech from 'expo-speech';

export function speakTaskStart(taskTitle: string, durationSec: number) {
  speak(`次は、${taskTitle}です。${Math.max(1, Math.ceil(durationSec / 60))}分です。`);
}

export function speakThirtySecondsLeft() {
  speak('あと30秒です。');
}

export function speakCompletion() {
  speak('完了です。今日の最低限を守れました。');
}

function speak(text: string) {
  try {
    Speech.speak(text, { language: 'ja-JP' });
  } catch {
    // Speech is best-effort; UI and timer state remain authoritative.
  }
}
