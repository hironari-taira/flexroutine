import { StyleSheet, Text, View, type ViewProps } from 'react-native';

interface SectionProps extends ViewProps {
  hint?: string;
  title: string;
}

export function Section({ children, hint, style, title, ...props }: SectionProps) {
  return (
    <View style={[styles.section, style]} {...props}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  header: {
    gap: 4,
  },
  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  hint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
});
