import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
}

export function Button({ disabled, label, style, variant = 'primary', ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.base, styles[variant], disabled ? styles.disabled : null, style]}
      {...props}
    >
      <Text style={[styles.text, styles[`${variant}Text`], disabled ? styles.disabledText : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primary: {
    backgroundColor: '#111827',
  },
  secondary: {
    backgroundColor: '#e2e8f0',
  },
  destructive: {
    backgroundColor: '#fee2e2',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: '#d1d5db',
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#111827',
  },
  destructiveText: {
    color: '#991b1b',
  },
  ghostText: {
    color: '#2563eb',
  },
  disabledText: {
    color: '#9ca3af',
  },
});
