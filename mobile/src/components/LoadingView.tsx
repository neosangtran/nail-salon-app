import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingViewProps {
  message?: string;
}

export default function LoadingView({ message }: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#e11d48" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
});
