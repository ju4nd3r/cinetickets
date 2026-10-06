import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../src/api/client';
import { SeatMap } from '../../src/features/booking/components/SeatMap';
import { TicketTypeSelector } from '../../src/features/booking/components/TicketTypeSelector';
import { HoldTimer } from '../../src/features/booking/components/HoldTimer';
import { useBookingStore } from '../../src/features/booking/stores/useBookingStore';
import { SeatWithStatus } from '@cinetickets/shared';

export default function BookingScreen() {
  const { showtimeId } = useLocalSearchParams<{ showtimeId: string }>();
  const router = useRouter();

  const {
    showtime,
    setShowtime,
    selectedSeats,
    toggleSeat,
    seatTicketTypes,
    setTicketTypeForSeat,
    holdExpiresAt,
    setHold,
    clearHold,
  } = useBookingStore();

  const [isHolding, setIsHolding] = useState(false);

  // Cargar mapa de asientos
  const {
    data: seatMapData,
    isLoading: isMapLoading,
    isError: isMapError,
    error: mapError,
    refetch: refetchMap,
  } = useQuery({
    queryKey: ['seatMap', showtimeId],
    queryFn: () => apiClient.getSeatMap(showtimeId || ''),
    enabled: Boolean(showtimeId),
    refetchInterval: 15000, // Refrescar cada 15 segundos
  });

  // Cargar tipos de tickets
  const { data: ticketTypes = [] } = useQuery({
    queryKey: ['ticketTypes'],
    queryFn: () => apiClient.getTicketTypes(),
  });

  useEffect(() => {
    if (seatMapData?.showtime) {
      setShowtime(seatMapData.showtime);
    }
  }, [seatMapData, setShowtime]);

  const handleToggleSeat = (seat: SeatWithStatus) => {
    const defaultTicket = ticketTypes[0];
    const success = toggleSeat(seat, defaultTicket);
    if (!success) {
      Alert.alert(
        'Límite alcanzado',
        'Solo puedes seleccionar un máximo de 10 asientos por compra.',
      );
    }
  };

  const handleHoldAndContinue = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Sin asientos', 'Por favor selecciona al menos un asiento.');
      return;
    }

    try {
      setIsHolding(true);
      const seatIds = selectedSeats.map((s) => s.id);
      const hold = await apiClient.createHold(showtimeId || '', seatIds);

      setHold(hold.holdId, hold.expiresAt);
      router.push('/booking/food');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'SEAT_UNAVAILABLE') {
        Alert.alert(
          'Asiento no disponible',
          'Uno o más asientos acaban de ser reservados por otro usuario. Por favor selecciona otros asientos.',
        );
        refetchMap();
      } else {
        const msg = err instanceof Error ? err.message : 'Error al reservar asientos';
        Alert.alert('Error', msg);
      }
    } finally {
      setIsHolding(false);
    }
  };

  if (isMapLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e11d48" />
        <Text style={styles.loadingText}>Cargando mapa de sala...</Text>
      </View>
    );
  }

  if (isMapError || !seatMapData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Error al cargar la sala</Text>
        <Text style={styles.errorMessage}>
          {mapError instanceof Error ? mapError.message : 'No se pudo obtener la sala'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetchMap()}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const movieTitle = seatMapData.showtime.movie?.title || 'Seleccionar Asientos';

  return (
    <>
      <Stack.Screen
        options={{
          title: movieTitle,
          headerBackTitle: 'Atrás',
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          {/* Header de la función */}
          <View style={styles.headerInfo}>
            <Text style={styles.hallName}>
              {seatMapData.hall.name} • {seatMapData.showtime.format}
            </Text>
            <Text style={styles.cinemaName}>{seatMapData.showtime.cinema?.name || 'Cine'}</Text>
          </View>

          {/* Temporizador de Hold si está activo */}
          {holdExpiresAt && (
            <HoldTimer
              expiresAt={holdExpiresAt}
              onExpire={() => {
                clearHold();
                Alert.alert(
                  'Tiempo Expirado',
                  'Tu reserva temporal de asientos ha finalizado. Por favor vuelve a seleccionarlos.',
                );
                refetchMap();
              }}
            />
          )}

          {/* Mapa de Asientos */}
          <SeatMap
            seats={seatMapData.seats}
            selectedSeatIds={selectedSeats.map((s) => s.id)}
            onToggleSeat={handleToggleSeat}
          />

          {/* Selector de tipos de ticket si hay asientos seleccionados */}
          {selectedSeats.length > 0 && ticketTypes.length > 0 && showtime && (
            <TicketTypeSelector
              selectedSeats={selectedSeats}
              ticketTypes={ticketTypes}
              seatTicketTypes={seatTicketTypes}
              onSelectTicketType={setTicketTypeForSeat}
              showtime={showtime}
            />
          )}
        </ScrollView>

        {/* Barra inferior de Confirmación */}
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.seatsCountText}>{selectedSeats.length} / 10 seleccionados</Text>
            <Text style={styles.hintText}>
              {selectedSeats.length === 0 ? 'Toca un asiento libre' : 'Asientos listos para hold'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              (selectedSeats.length === 0 || isHolding) && styles.continueButtonDisabled,
            ]}
            onPress={handleHoldAndContinue}
            disabled={selectedSeats.length === 0 || isHolding}
            accessibilityRole="button"
            accessibilityLabel="Bloquear asientos y continuar"
          >
            {isHolding ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.continueButtonText}>Continuar ▶</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0f19',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  headerInfo: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center',
  },
  hallName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cinemaName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  seatsCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  hintText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  continueButton: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 130,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
