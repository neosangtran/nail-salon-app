import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type TextInputProps,
} from 'react-native';

// ─── Text field ───────────────────────────────────────────────────────────────

interface FormFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

export function FormField({ label, required, error, hint, style, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <FieldLabel label={label} required={required} />
      <TextInput
        placeholderTextColor="#9ca3af"
        style={[styles.input, inputProps.multiline && styles.inputMultiline, !!error && styles.inputError, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  if (!label) return null;
  return (
    <Text style={styles.label}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

// ─── Chip selector ────────────────────────────────────────────────────────────

interface ChipOption {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

interface ChipSelectProps {
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
}

export function ChipSelect({ options, value, onChange }: ChipSelectProps) {
  return (
    <View style={styles.chips}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            disabled={opt.disabled}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, selected && styles.chipSelected, opt.disabled && styles.chipDisabled]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                selected && styles.chipTextSelected,
                opt.disabled && styles.chipTextDisabled,
              ]}
            >
              {opt.label}
            </Text>
            {opt.sublabel ? (
              <Text style={[styles.chipSub, selected && styles.chipTextSelected]}>{opt.sublabel}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
}

export function FormButton({ title, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        variant === 'outline' && styles.buttonOutline,
        variant === 'danger' && styles.buttonDanger,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#e11d48'} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'outline' && styles.buttonTextOutline,
            variant === 'danger' && styles.buttonTextDanger,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.formError}>
      <Text style={styles.formErrorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#e11d48' },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  inputError: { borderColor: '#f87171' },
  errorText: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  chipDisabled: { backgroundColor: '#f3f4f6', borderColor: '#f3f4f6' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chipTextSelected: { color: '#ffffff' },
  chipTextDisabled: { color: '#d1d5db', textDecorationLine: 'line-through' },
  chipSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  button: {
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonOutline: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e11d48' },
  buttonDanger: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#fecaca' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  buttonTextOutline: { color: '#e11d48' },
  buttonTextDanger: { color: '#dc2626' },
  formError: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  formErrorText: { color: '#991b1b', fontSize: 13 },
});
