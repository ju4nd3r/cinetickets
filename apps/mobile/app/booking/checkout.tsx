import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function CheckoutScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Checkout & Pago' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Checkout y Pago</Text>
        <Text style={styles.subtitle}>Resumen y Pasarela de Pago (Fase 7)</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
