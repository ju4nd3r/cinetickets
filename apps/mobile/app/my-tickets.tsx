import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useOrders } from '../src/features/orders/hooks/useOrders';
import { Order } from '@cinetickets/shared';
import { formatPrice } from '../src/features/booking/components/PriceBreakdown';

export default function MyTicketsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading, isError, error, refetch, isRefetching } = useOrders();

  const now = new Date();

  const { upcomingOrders, pastOrders } = useMemo(() => {
    const upcoming: Order[] = [];
    const past: Order[] = [];

    for (const order of orders) {
      const showtimeDate = order.showtime?.startsAt
        ? new Date(order.showtime.startsAt)
        : new Date(order.createdAt);

      if (showtimeDate >= now && order.status !== 'EXPIRED' && order.status !== 'FAILED') {
        upcoming.push(order);
      } else {
        past.push(order);
      }
    }

    // Ordenar: próximas por fecha ascendente, pasadas por fecha descendente
    upcoming.sort((a, b) => {
      const dateA = a.showtime?.startsAt ? new Date(a.showtime.startsAt).getTime() : 0;
      const dateB = b.showtime?.startsAt ? new Date(b.showtime.startsAt).getTime() : 0;
      return dateA - dateB;
    });

    past.sort((a, b) => {
      const dateA = a.showtime?.startsAt ? new Date(a.showtime.startsAt).getTime() : 0;
      const dateB = b.showtime?.startsAt ? new Date(b.showtime.startsAt).getTime() : 0;
      return dateB - dateA;
    });

    return { upcomingOrders: upcoming, pastOrders: past };
  }, [orders, now]);

  const displayedOrders = activeTab === 'upcoming' ? upcomingOrders : pastOrders;

  const renderOrderItem = ({ item }: { item: Order }) => {
    const movieTitle = item.showtime?.movie?.title || 'Película';
    const cinemaName = item.showtime?.cinema?.name || 'Cine';
    const hallName = item.showtime?.hall?.name || 'Sala';
    const format = item.showtime?.format || '2D';

    const formattedDate = item.showtime?.startsAt
      ? new Date(item.showtime.startsAt).toLocaleString('es-ES', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '';

    const seatsSummary =
      item.seats?.map((s) => `${s.seat?.row ?? ''}${s.seat?.number ?? ''}`).join(', ') || 'N/A';

    const isConfirmed = item.status === 'CONFIRMED';

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => setSelectedOrder(item)}
        activeOpacity={0.8}
        testID={`order-card-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Ver boleto para ${movieTitle}`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.movieTitle} numberOfLines={1}>
            {movieTitle}
          </Text>
          <View
            style={[styles.statusBadge, isConfirmed ? styles.statusConfirmed : styles.statusOther]}
          >
            <Text
              style={[
                styles.statusText,
                isConfirmed ? styles.statusTextConfirmed : styles.statusTextOther,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.cinemaText}>
          {cinemaName} • {hallName} ({format})
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.dateText}>📅 {formattedDate}</Text>
          <Text style={styles.seatsText}>🎟️ Asientos: {seatsSummary}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalPrice}>{formatPrice(item.totalCents)}</Text>
          {item.qrCode ? (
            <View style={styles.qrButton}>
              <Text style={styles.qrButtonText}>Ver QR 📱</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Mis Entradas' }} />
      <View style={styles.container}>
        {/* Pestañas Próximas / Pasadas */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
            onPress={() => setActiveTab('upcoming')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'upcoming' }}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
              Próximas ({upcomingOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'past' && styles.activeTab]}
            onPress={() => setActiveTab('past')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'past' }}
          >
            <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
              Pasadas ({pastOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenido Principal */}
        {isLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#e11d48" />
            <Text style={styles.loadingText}>Cargando tus entradas...</Text>
          </View>
        )}

        {isError && (
          <View style={styles.centerContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Error al cargar entradas</Text>
            <Text style={styles.errorMessage}>
              {error instanceof Error ? error.message : 'No se pudieron obtener las órdenes'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !isError && displayedOrders.length === 0 && (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming'
                ? 'No tienes funciones próximas'
                : 'No tienes entradas pasadas'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? 'Elige una película de nuestra cartelera y reserva tus asientos.'
                : 'Aquí verás el historial de todas tus compras anteriores.'}
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableOpacity style={styles.exploreButton} onPress={() => router.replace('/')}>
                <Text style={styles.exploreButtonText}>Ver Cartelera</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isLoading && !isError && displayedOrders.length > 0 && (
          <FlatList
            data={displayedOrders}
            keyExtractor={(item) => item.id}
            renderItem={renderOrderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#e11d48" />
            }
          />
        )}

        {/* Modal de Detalle con Código QR */}
        <Modal
          visible={Boolean(selectedOrder)}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedOrder(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent} testID="ticket-qr-modal">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Boleto Digital</Text>
                <TouchableOpacity
                  onPress={() => setSelectedOrder(null)}
                  style={styles.closeButton}
                  accessibilityLabel="Cerrar ventana"
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedOrder && (
                <View style={styles.modalBody}>
                  <Text style={styles.modalMovieTitle}>{selectedOrder.showtime?.movie?.title}</Text>
                  <Text style={styles.modalMeta}>
                    {selectedOrder.showtime?.cinema?.name} • {selectedOrder.showtime?.hall?.name}
                  </Text>

                  {/* QR */}
                  <View style={styles.qrModalWrapper}>
                    <QRCode
                      value={selectedOrder.qrCode || `CT-${selectedOrder.id}`}
                      size={180}
                      color="#0b0f19"
                      backgroundColor="#ffffff"
                    />
                  </View>

                  <Text style={styles.modalQrString}>
                    {selectedOrder.qrCode || `CT-${selectedOrder.id}`}
                  </Text>

                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Asientos:</Text>
                    <Text style={styles.modalValue}>
                      {selectedOrder.seats
                        ?.map((s) => `${s.seat?.row ?? ''}${s.seat?.number ?? ''}`)
                        .join(', ') || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Total:</Text>
                    <Text style={styles.modalValue}>{formatPrice(selectedOrder.totalCents)}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modalDoneButton}
                    onPress={() => setSelectedOrder(null)}
                  >
                    <Text style={styles.modalDoneButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#131d2e',
    margin: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#e11d48',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  orderCard: {
    backgroundColor: '#131d2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  movieTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusConfirmed: {
    backgroundColor: '#064e3b',
  },
  statusOther: {
    backgroundColor: '#1e293b',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextConfirmed: {
    color: '#34d399',
  },
  statusTextOther: {
    color: '#94a3b8',
  },
  cinemaText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 10,
  },
  metaRow: {
    gap: 4,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  seatsText: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f43f5e',
  },
  qrButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  qrButtonText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: '#e11d48',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#131d2e',
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    alignItems: 'center',
  },
  modalMovieTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  modalMeta: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 16,
  },
  qrModalWrapper: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  modalQrString: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#38bdf8',
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4,
  },
  modalLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  modalValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalDoneButton: {
    backgroundColor: '#e11d48',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  modalDoneButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
