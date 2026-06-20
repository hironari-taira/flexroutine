import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SuggestionCardProps {
  body: string;
  title: string;
}

export function SuggestionCard({ body, title }: SuggestionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>提案</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>編集で確認</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>閉じる</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  label: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  body: {
    color: '#52606d',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  secondaryButton: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '800',
  },
  ghostButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  ghostButtonText: {
    color: '#52606d',
    fontSize: 13,
    fontWeight: '700',
  },
});
