import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoutineCard } from '@/components/RoutineCard';
import { SuggestionCard } from '@/components/SuggestionCard';
import { Button } from '@/components/ui/Button';
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appName}>FlexRoutine</Text>
          <Text style={styles.heading}>今日も最低限から整える</Text>
          <Text style={styles.subheading}>
            予定が崩れても、動ける順番に並べたルーティンで最後まで進めます。
          </Text>
          <View style={styles.headerActions}>
            <Button label="新しいルーティン" onPress={() => router.push('/routine/new')} style={styles.headerButton} />
            <Button label="履歴" variant="secondary" onPress={() => router.push('/history')} style={styles.headerButton} />
          </View>
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
            <Button label="再読み込み" variant="destructive" onPress={load} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f6f7f9',
    flex: 1,
  },
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
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  headerButton: {
    flex: 1,
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
});
