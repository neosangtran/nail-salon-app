import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CustomerFormScreenProps } from '../navigation/types';
import { useCustomer, useCreateCustomer, useUpdateCustomer } from '../hooks/useCustomers';
import { getErrorMessage } from '../lib/api';
import { FormField, FormButton, FormError } from '../components/FormField';
import LoadingView from '../components/LoadingView';
import { isValidDateInput, toDateInput } from '../utils/format';

interface FormState {
  name: string;
  phone: string;
  email: string;
  birthday: string;
  notes: string;
}

const EMPTY: FormState = { name: '', phone: '', email: '', birthday: '', notes: '' };

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (form.birthday.trim() && !isValidDateInput(form.birthday.trim())) {
    errors.birthday = 'Use the format YYYY-MM-DD';
  }
  return errors;
}

export default function CustomerFormScreen({ route, navigation }: CustomerFormScreenProps) {
  const customerId = route.params?.customerId;
  const isEditing = !!customerId;

  const { data: customer, isLoading } = useCustomer(customerId ?? '');
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Customer' : 'New Customer' });
  }, [navigation, isEditing]);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        birthday: customer.birthday ? toDateInput(customer.birthday) : '',
        notes: customer.notes ?? '',
      });
    }
  }, [customer]);

  const set = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const saving = createCustomer.isPending || updateCustomer.isPending;

  const handleSubmit = async () => {
    setSubmitError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const trimmed = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      birthday: form.birthday.trim(),
      notes: form.notes.trim(),
    };

    try {
      if (isEditing && customerId) {
        // Send every field so that clearing one removes it on the server.
        await updateCustomer.mutateAsync({ id: customerId, payload: trimmed });
        navigation.goBack();
      } else {
        const created = await createCustomer.mutateAsync({
          name: trimmed.name,
          phone: trimmed.phone || undefined,
          email: trimmed.email || undefined,
          birthday: trimmed.birthday || undefined,
          notes: trimmed.notes || undefined,
        });
        navigation.replace('CustomerDetail', { customerId: created.id });
      }
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Failed to save customer. Please try again.'));
    }
  };

  if (isEditing && isLoading) return <LoadingView message="Loading customer..." />;
  if (isEditing && !customer) return <LoadingView message="Customer not found" />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FormError message={submitError} />

          <FormField
            label="Name"
            required
            value={form.name}
            onChangeText={set('name')}
            placeholder="Full name"
            autoCapitalize="words"
            error={errors.name}
          />
          <FormField
            label="Phone"
            value={form.phone}
            onChangeText={set('phone')}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
          />
          <FormField
            label="Email"
            value={form.email}
            onChangeText={set('email')}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />
          <FormField
            label="Birthday"
            value={form.birthday}
            onChangeText={set('birthday')}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            error={errors.birthday}
          />
          <FormField
            label="Notes"
            value={form.notes}
            onChangeText={set('notes')}
            placeholder="Preferences, allergies, favorite colors..."
            multiline
          />

          <FormButton
            title={isEditing ? 'Save Changes' : 'Create Customer'}
            onPress={handleSubmit}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
});
