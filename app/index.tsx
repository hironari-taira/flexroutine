import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RoutineCard } from '@/components/RoutineCard';
import { SuggestionCard } from '@/components/SuggestionCard';
import { getDatabase, initializeDatabase } from '@/db/database';
import { listRoutineCards, type RoutineCardView } from '@/db/repositories/routineRepository';
import { buildHomeSuggestion, type HomeSuggestion } from '@/features/suggestions/homeSuggestion';

type HomeState =
  | { status: 'loading' }
  | { status: 'ready'; routines: RoutineCardView[]; suggestion: HomeSuggestion }
  | { status: 'error'; message: string };

export default function HomeScreen() {
  const router = useRouter();
  const [state, setState] = useState<HomeState>({ status: 'loading' });

  const load = useCallback(async () => {
    try {
      setState({ status: 'loading' });
      const db = await getDatabase();
      await initializeDatabase(db);
      const [routines, suggestion] = await Promise.all([listRoutineCards(db), buildHomeSuggestion(db)]);
      setState({ status: 'ready', routines, suggestion });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'DB初期化で問題が起きました',
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>FlexRoutine</Text>
        <Text style={styles.heading}>今日も短縮版で大丈夫</Text>
        <Text style={styles.subheading}>
          寝坊しても、予定が崩れても、今日の最低限まで組み直します。
        </Text>
      </View>

      {state.status === 'loading' ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>ルーティンを読み込んでいます</Text>
        </View>
      ) : null}

      {state.status === 'error' ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>読み込みに失敗しました</Text>
          <Text style={styles.errorMessage}>{state.message}</Text>
          <Pressable accessibilityRole="button" style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>再読み込み</Text>
          </Pressable>
        </View>
      ) : null}

      {state.status === 'ready' ? (
        <View style={styles.section}>
          {state.routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onEmergencyPress={() =>
                router.push({
                  pathname: '/routine/[id]/run',
                  params: { id: routine.id, mode: 'emergency' },
                })
              }
              onPress={() =>
                router.push({
                  pathname: '/routine/[id]',
                  params: { id: routine.id },
                })
              }
              onStartPress={() =>
                router.push({
                  pathname: '/routine/[id]/run',
                  params: { id: routine.id, mode: 'normal' },
                })
              }
            />
          ))}
        </View>
      ) : null}

      {state.status === 'ready' ? (
        <SuggestionCard title={state.suggestion.title} body={state.suggestion.body} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    gap: 8,
    paddingTop: 8,
  },
  appName: {
    color: '#50606f',
    fontSize: 15,
    fontWeight: '700',
  },
  heading: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
  },
  subheading: {
    color: '#52606d',
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 12,
  },
  loadingBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    gap: 10,
    padding: 24,
  },
  loadingText: {
    color: '#52606d',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  errorTitle: {
    color: '#9f1239',
    fontSize: 16,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#9f1239',
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#be123c',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
