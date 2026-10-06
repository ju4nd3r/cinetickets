import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SERVICE_FEE_PERCENTAGE } from '@cinetickets/shared';

export interface PriceBreakdownSeat {
  id: string;
  row: string;
  number: number;
  type?: string;
  ticketType?: {
    id?: string;
    label: string;
    discountPct: number;
  };
  priceCents: number;
}

export interface PriceBreakdownFood {
  foodItemId: string;
  name: string;
  size?: string | null;
  qty: number;
  priceCents: number;
}

export interface PriceBreakdownProps {
  seats?: PriceBreakdownSeat[];
  food?: PriceBreakdownFood[];
}

export function formatPrice(cents: number): string {
  const amount = cents / 100;
  return `$${amount.toFixed(2)}`;
}

export function PriceBreakdown({ seats = [], food = [] }: PriceBreakdownProps) {
  const safeSeats = Array.isArray(seats) ? seats : [];
  const safeFood = Array.isArray(food) ? food : [];
  const subtotalSeatsCents = safeSeats.reduce((acc, s) => acc + (s.priceCents || 0), 0);
  const subtotalFoodCents = safeFood.reduce(
    (acc, f) => acc + (f.priceCents || 0) * (f.qty || 1),
    0,
  );
  const feesCents = Math.round(subtotalSeatsCents * SERVICE_FEE_PERCENTAGE);
  const totalCents = subtotalSeatsCents + subtotalFoodCents + feesCents;

  return (
    <View style={styles.card} testID="price-breakdown-card">
      <Text style={styles.title}>Resumen del Pedido</Text>

      {/* Asientos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Entradas ({safeSeats.length})</Text>
        {safeSeats.map((seat) => (
          <View key={seat.id} style={styles.row}>
            <View style={styles.seatInfo}>
              <Text style={styles.itemName}>
                Asiento {seat.row}
                {seat.number} ({seat.type?.toUpperCase() || 'STANDARD'})
              </Text>
              <Text style={styles.itemSubtext}>
                {seat.ticketType?.label || 'General'}{' '}
                {seat.ticketType && seat.ticketType.discountPct > 0
                  ? `(-${seat.ticketType.discountPct}%)`
                  : ''}
              </Text>
            </View>
            <Text style={styles.itemPrice}>{formatPrice(seat.priceCents || 0)}</Text>
          </View>
        ))}
      </View>

      {/* Comida */}
      {safeFood.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snacks y Bebidas ({safeFood.length})</Text>
          {safeFood.map((item) => (
            <View key={`${item.foodItemId}-${item.size ?? 'default'}`} style={styles.row}>
              <View style={styles.seatInfo}>
                <Text style={styles.itemName}>
                  {item.qty}x {item.name}
                </Text>
                {item.size ? <Text style={styles.itemSubtext}>Tamaño: {item.size}</Text> : null}
              </View>
              <Text style={styles.itemPrice}>
                {formatPrice((item.priceCents || 0) * (item.qty || 1))}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Separador */}
      <View style={styles.divider} />

      {/* Subtotales y Desglose */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal Entradas</Text>
        <Text style={styles.summaryValue}>{formatPrice(subtotalSeatsCents)}</Text>
      </View>

      {food.length > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal Snacks</Text>
          <Text style={styles.summaryValue}>{formatPrice(subtotalFoodCents)}</Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Cargo por servicio (5%)</Text>
        <Text style={styles.summaryValue}>{formatPrice(feesCents)}</Text>
      </View>

      <View style={[styles.summaryRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total a pagar</Text>
        <Text style={styles.totalValue}>{formatPrice(totalCents)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131d2e',
    borderRadius: 16,
    padding: 18,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  seatInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  itemSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  summaryValue: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
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
});
