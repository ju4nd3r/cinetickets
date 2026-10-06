import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useOrder } from '../../src/features/orders/hooks/useOrders';
import { formatPrice } from '../../src/features/booking/components/PriceBreakdown';

export default function ConfirmationScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const { data: order, isLoading, isError, error, refetch } = useOrder(orderId || '');

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e11d48" />
        <Text style={styles.loadingText}>Cargando confirmación...</Text>
      </View>
    );
  }

  if (isError || !order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Error al cargar la orden</Text>
        <Text style={styles.errorMessage}>
          {error instanceof Error ? error.message : 'No se pudo obtener la orden'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const movieTitle = order.showtime?.movie?.title || 'Película';
  const cinemaName = order.showtime?.cinema?.name || 'Cine';
  const hallName = order.showtime?.hall?.name || 'Sala';
  const qrString = order.qrCode || `CT-${order.id}`;

  const formattedDate = order.showtime?.startsAt
    ? new Date(order.showtime.startsAt).toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Confirmación de Compra',
          headerBackVisible: false,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Encabezado de éxito */}
        <View style={styles.successHeader}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>¡Compra Confirmada!</Text>
          <Text style={styles.successSubtitle}>Tus entradas han sido emitidas exitosamente</Text>
        </View>

        {/* Tarjeta con Código QR */}
        <View style={styles.qrCard} testID="confirmation-qr-card">
          <View style={styles.qrWrapper}>
            <QRCode value={qrString} size={200} color="#0b0f19" backgroundColor="#ffffff" />
          </View>
          <Text style={styles.qrCodeText}>{qrString}</Text>
          <Text style={styles.qrInstruction}>
            Presenta este código en el acceso de la sala para escanear tus boletos.
          </Text>
        </View>

        {/* Detalle de la Función */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Detalles de la Función</Text>

          <Text style={styles.movieTitle}>{movieTitle}</Text>
          <Text style={styles.metaText}>
            {cinemaName} • {hallName}
          </Text>
          <Text style={styles.dateText}>📅 {formattedDate}</Text>

          <View style={styles.divider} />

          {/* Asientos */}
          <Text style={styles.subheading}>Asientos Reservados:</Text>
          <View style={styles.seatsContainer}>
            {order.seats?.map((seatItem) => (
              <View key={seatItem.id} style={styles.seatBadge}>
                <Text style={styles.seatBadgeText}>
                  {seatItem.seat?.row}
                  {seatItem.seat?.number} ({seatItem.ticketType?.label || 'General'})
                </Text>
              </View>
            ))}
          </View>

          {/* Comida si existe */}
          {order.food && order.food.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subheading}>Snacks y Bebidas:</Text>
              {order.food.map((f) => (
                <View key={f.id} style={styles.foodRow}>
                  <Text style={styles.foodName}>
                    {f.qty}x {f.foodItem?.name || 'Producto'} {f.size ? `(${f.size})` : ''}
                  </Text>
                  <Text style={styles.foodPrice}>{formatPrice(f.priceCents * f.qty)}</Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Pagado:</Text>
            <Text style={styles.totalValue}>{formatPrice(order.totalCents)}</Text>
          </View>
        </View>

        {/* Acciones de Navegación */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/my-tickets')}
            accessibilityRole="button"
            accessibilityLabel="Ir a Mis Entradas"
          >
            <Text style={styles.primaryButtonText}>Ver en Mis Entradas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            accessibilityLabel="Volver a la cartelera principal"
          >
            <Text style={styles.secondaryButtonText}>Volver a la Cartelera</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 15,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#e11d48',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  successHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  qrCard: {
    backgroundColor: '#131d2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  qrCodeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 8,
  },
  qrInstruction: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  detailsCard: {
    backgroundColor: '#131d2e',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  metaText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#e2e8f0',
    marginTop: 6,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 14,
  },
  subheading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  seatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seatBadge: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  seatBadgeText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  foodName: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  foodPrice: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f43f5e',
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#e11d48',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
});
