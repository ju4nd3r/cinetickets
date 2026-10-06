import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface HoldTimerProps {
  expiresAt: string | null;
  onExpire?: () => void;
}

export function HoldTimer({ expiresAt, onExpire }: HoldTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setSecondsRemaining(null);
      return;
    }

    const targetTime = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        onExpire?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (secondsRemaining === null) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = secondsRemaining < 120 && secondsRemaining > 0;
  const isExpired = secondsRemaining === 0;

  return (
    <View
      style={[
        styles.container,
        isUrgent && styles.containerUrgent,
        isExpired && styles.containerExpired,
      ]}
      accessibilityRole="timer"
      accessibilityLabel={`Temporizador de reserva de asientos: ${formatted}`}
    >
      <Text style={styles.icon}>{isExpired ? '⚠️' : '⏱️'}</Text>
      <Text style={[styles.text, (isUrgent || isExpired) && styles.textUrgent]}>
        {isExpired ? 'Tiempo de reserva expirado' : `Asientos reservados por: ${formatted}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#38bdf8',
    gap: 8,
    justifyContent: 'center',
  },
  containerUrgent: {
    backgroundColor: '#451a03',
    borderColor: '#f59e0b',
  },
  containerExpired: {
    backgroundColor: '#4c0519',
    borderColor: '#f43f5e',
  },
  icon: {
    fontSize: 16,
  },
  text: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  textUrgent: {
    color: '#fbbf24',
  },
});
