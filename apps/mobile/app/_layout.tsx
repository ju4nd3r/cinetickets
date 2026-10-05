import React from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#ffffff',
          contentStyle: { backgroundColor: '#0b0f19' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'CineTickets' }} />
      </Stack>
    </QueryClientProvider>
  );
}
