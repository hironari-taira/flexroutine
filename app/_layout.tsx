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
        <Stack.Screen name="index" options={{ title: 'FlexRoutine' }} />
        <Stack.Screen name="routine/[id]" options={{ title: 'ルーティン' }} />
        <Stack.Screen name="routine/[id]/run" options={{ title: '実行プレビュー' }} />
      </Stack>
    </>
  );
}
