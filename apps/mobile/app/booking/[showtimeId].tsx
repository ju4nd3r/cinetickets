import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';

export default function BookingScreen() {
  const { showtimeId } = useLocalSearchParams<{ showtimeId: string }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Seleccionar Asientos' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Selección de Asientos</Text>
        <Text style={styles.subtitle}>Función ID: {showtimeId}</Text>
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
