import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

export function Input({ style, ...props }: TextInputProps) {
  return <TextInput placeholderTextColor="#94a3b8" style={[styles.input, style]} {...props} />;
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
