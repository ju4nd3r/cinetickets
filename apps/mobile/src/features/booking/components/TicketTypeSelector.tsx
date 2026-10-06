import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SeatWithStatus, Showtime, TicketType } from '@cinetickets/shared';
import { calculateSeatPrice } from '@cinetickets/shared';

export interface TicketTypeSelectorProps {
  selectedSeats: SeatWithStatus[];
  ticketTypes: TicketType[];
  seatTicketTypes: Record<string, TicketType>;
  onSelectTicketType: (seatId: string, ticketType: TicketType) => void;
  showtime: Showtime;
}

export function TicketTypeSelector({
  selectedSeats,
  ticketTypes,
  seatTicketTypes,
  onSelectTicketType,
  showtime,
}: TicketTypeSelectorProps) {
  const getBasePriceForSeat = (seat: SeatWithStatus) => {
    if (seat.type === 'vip') return showtime.priceVipCents;
    if (seat.type === 'accessible') return showtime.priceAccessibleCents;
    return showtime.priceStandardCents;
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Tipo de Entrada por Asiento</Text>
      <Text style={styles.subtitle}>
        Asigna el tipo de entrada para cada persona y obtén tu descuento.
      </Text>

      {selectedSeats.map((seat) => {
        const currentTicket = seatTicketTypes[seat.id] || ticketTypes[0];
        const basePrice = getBasePriceForSeat(seat);
        const finalPrice = currentTicket
          ? calculateSeatPrice(basePrice, currentTicket.discountPct)
          : basePrice;

        return (
          <View key={seat.id} style={styles.seatRow}>
            <View style={styles.seatInfo}>
              <View style={styles.seatBadge}>
                <Text style={styles.seatBadgeText}>
                  {seat.row}
                  {seat.number}
                </Text>
              </View>
              <View>
                <Text style={styles.seatTypeLabel}>
                  Asiento{' '}
                  {seat.type === 'vip'
                    ? 'VIP'
                    : seat.type === 'accessible'
                      ? 'Accesible'
                      : 'Estándar'}
                </Text>
                <Text style={styles.priceFinalText}>{formatPrice(finalPrice)}</Text>
              </View>
            </View>

            {/* Selector de botones para los 4 tipos de entrada */}
            <View style={styles.ticketTypesList}>
              {ticketTypes.map((tt) => {
                const isSelected = currentTicket?.id === tt.id;
                return (
                  <TouchableOpacity
                    key={tt.id}
                    style={[styles.ticketChip, isSelected && styles.ticketChipSelected]}
                    onPress={() => onSelectTicketType(seat.id, tt)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${tt.label} para asiento ${seat.row}${seat.number}, descuento ${tt.discountPct}%`}
                  >
                    <Text
                      style={[styles.ticketChipText, isSelected && styles.ticketChipTextSelected]}
                    >
                      {tt.label}
                    </Text>
                    {tt.discountPct > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>-{tt.discountPct}%</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
  },
  seatRow: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  seatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  seatBadge: {
    backgroundColor: '#e11d48',
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  seatTypeLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  priceFinalText: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '800',
  },
  ticketTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ticketChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  ticketChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  ticketChipText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  ticketChipTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  discountBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
});
