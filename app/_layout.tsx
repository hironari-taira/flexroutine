import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: '#f6f7f9' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#f6f7f9' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="routine/new" options={{ title: '新しいルーティン' }} />
        <Stack.Screen name="routine/[id]" options={{ title: 'ルーティン' }} />
        <Stack.Screen name="routine/[id]/run" options={{ title: '実行プレビュー' }} />
        <Stack.Screen name="routine/[id]/timer" options={{ headerShown: false }} />
        <Stack.Screen name="routine/[id]/complete" options={{ title: '完了' }} />
        <Stack.Screen name="history" options={{ title: '履歴' }} />
        <Stack.Screen name="execution/[id]" options={{ title: '実行詳細' }} />
      </Stack>
    </>
  );
}
