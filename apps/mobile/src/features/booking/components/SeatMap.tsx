import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SeatWithStatus } from '@cinetickets/shared';

export interface SeatMapProps {
  seats: SeatWithStatus[];
  selectedSeatIds: string[];
  onToggleSeat: (seat: SeatWithStatus) => void;
}

export function SeatMap({ seats, selectedSeatIds, onToggleSeat }: SeatMapProps) {
  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);

  // Agrupar asientos por fila
  const rows = useMemo(() => {
    const rowMap = new Map<string, SeatWithStatus[]>();
    for (const seat of seats) {
      if (!rowMap.has(seat.row)) {
        rowMap.set(seat.row, []);
      }
      rowMap.get(seat.row)!.push(seat);
    }
    // Ordenar cada fila por número de asiento
    for (const rowSeats of rowMap.values()) {
      rowSeats.sort((a, b) => a.number - b.number);
    }
    // Ordenar filas alfabéticamente
    return Array.from(rowMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [seats]);

  const getSeatStyle = (seat: SeatWithStatus, isSelected: boolean) => {
    if (seat.status === 'occupied') {
      return styles.seatOccupied;
    }
    if (isSelected) {
      return styles.seatSelected;
    }
    if (seat.type === 'vip') {
      return styles.seatVip;
    }
    if (seat.type === 'accessible') {
      return styles.seatAccessible;
    }
    return styles.seatAvailable;
  };

  const getSeatIcon = (seat: SeatWithStatus, isSelected: boolean) => {
    if (seat.status === 'occupied') return '✕';
    if (isSelected) return '✓';
    if (seat.type === 'accessible') return '♿';
    if (seat.type === 'vip') return '★';
    return String(seat.number);
  };

  return (
    <View style={styles.container}>
      {/* Barra de Pantalla de Cine */}
      <View style={styles.screenContainer}>
        <View style={styles.screenBar} />
        <Text style={styles.screenText}>PANTALLA</Text>
      </View>

      {/* Grilla de Asientos con Scroll Horizontal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.gridContainer}>
          {rows.map(([rowLetter, rowSeats]) => (
            <View key={rowLetter} style={styles.row}>
              <View style={styles.rowLabelContainer}>
                <Text style={styles.rowLabel}>{rowLetter}</Text>
              </View>

              <View style={styles.seatsInRow}>
                {rowSeats.map((seat) => {
                  const isSelected = selectedSet.has(seat.id);
                  const isOccupied = seat.status === 'occupied';

                  let statusText = 'Disponible';
                  if (isOccupied) statusText = 'Ocupado';
                  else if (isSelected) statusText = 'Seleccionado';

                  return (
                    <TouchableOpacity
                      key={seat.id}
                      style={[styles.seatBase, getSeatStyle(seat, isSelected)]}
                      onPress={() => onToggleSeat(seat)}
                      disabled={isOccupied}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected, disabled: isOccupied }}
                      accessibilityLabel={`Fila ${seat.row}, Asiento ${seat.number}, Tipo ${seat.type}, ${statusText}`}
                    >
                      <Text
                        style={[
                          styles.seatText,
                          isSelected && styles.seatTextSelected,
                          isOccupied && styles.seatTextOccupied,
                        ]}
                      >
                        {getSeatIcon(seat, isSelected)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.rowLabelContainer}>
                <Text style={styles.rowLabel}>{rowLetter}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Leyenda de Asientos */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.seatAvailable]} />
          <Text style={styles.legendText}>Estándar</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.seatVip]} />
          <Text style={styles.legendText}>VIP (★)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.seatAccessible]} />
          <Text style={styles.legendText}>Accesible (♿)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.seatSelected]} />
          <Text style={styles.legendText}>Seleccionado</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.seatOccupied]} />
          <Text style={styles.legendText}>Ocupado</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    alignItems: 'center',
  },
  screenContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '90%',
  },
  screenBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#38bdf8',
    borderRadius: 3,
    shadowColor: '#38bdf8',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  screenText: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  gridContainer: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  rowLabelContainer: {
    width: 24,
    alignItems: 'center',
  },
  rowLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  seatsInRow: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 8,
  },
  seatBase: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatAvailable: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
  },
  seatVip: {
    backgroundColor: '#854d0e',
    borderWidth: 1,
    borderColor: '#eab308',
  },
  seatAccessible: {
    backgroundColor: '#0369a1',
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  seatSelected: {
    backgroundColor: '#e11d48',
    borderWidth: 2,
    borderColor: '#f43f5e',
  },
  seatOccupied: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#0f172a',
    opacity: 0.6,
  },
  seatText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
  },
  seatTextSelected: {
    color: '#ffffff',
  },
  seatTextOccupied: {
    color: '#475569',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
});
