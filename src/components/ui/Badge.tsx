import { StyleSheet, Text, type TextProps } from 'react-native';

type BadgeTone = 'neutral' | 'info' | 'warning' | 'danger';

interface BadgeProps extends TextProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, style, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <Text style={[styles.base, styles[tone], style]} {...props}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  neutral: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
  },
  info: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  warning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  danger: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
});
