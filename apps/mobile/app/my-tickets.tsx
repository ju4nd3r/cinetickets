import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function MyTicketsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Mis Entradas' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Mis Entradas</Text>
        <Text style={styles.subtitle}>
          Aquí podrás consultar tus entradas confirmadas y pasadas.
        </Text>
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
    textAlign: 'center',
  },
});
