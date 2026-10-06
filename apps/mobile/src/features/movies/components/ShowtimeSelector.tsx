import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CinemaShowtimesGroup, Showtime } from '@cinetickets/shared';

export interface ShowtimeSelectorProps {
  cinemaGroups: CinemaShowtimesGroup[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onSelectShowtime: (showtime: Showtime) => void;
  availableDates: { label: string; dateStr: string }[];
}

export function ShowtimeSelector({
  cinemaGroups,
  selectedDate,
  onSelectDate,
  onSelectShowtime,
  availableDates,
}: ShowtimeSelectorProps) {
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const hours = d.getUTCHours().toString().padStart(2, '0');
      const minutes = d.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Funciones y Horarios</Text>

      {/* Selector de Fechas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateScroll}
      >
        {availableDates.map((item) => {
          const isSelected = selectedDate === item.dateStr;
          return (
            <TouchableOpacity
              key={item.dateStr}
              style={[styles.dateCard, isSelected && styles.dateCardSelected]}
              onPress={() => onSelectDate(item.dateStr)}
              accessibilityRole="button"
              accessibilityLabel={`Fecha ${item.label}`}
            >
              <Text style={[styles.dateLabel, isSelected && styles.dateLabelSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista de Cines */}
      {cinemaGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay funciones disponibles para esta fecha.</Text>
        </View>
      ) : (
        cinemaGroups.map((group) => (
          <View key={group.cinema.id} style={styles.cinemaCard}>
            <View style={styles.cinemaHeader}>
              <Text style={styles.cinemaName}>{group.cinema.name}</Text>
              <Text style={styles.cinemaAddress}>
                {group.cinema.address}, {group.cinema.city}
              </Text>
              {group.cinema.amenities && group.cinema.amenities.length > 0 && (
                <View style={styles.amenitiesRow}>
                  {group.cinema.amenities.map((amenity) => (
                    <View key={amenity} style={styles.amenityBadge}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Grilla de Funciones con Precios */}
            <View style={styles.showtimesGrid}>
              {group.showtimes.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  style={styles.showtimeButton}
                  onPress={() => onSelectShowtime(st)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Función a las ${formatTime(st.startsAt)}, formato ${st.format}, precio estándar ${formatPrice(st.priceStandardCents)}`}
                >
                  <View style={styles.showtimeTop}>
                    <Text style={styles.showtimeTime}>{formatTime(st.startsAt)}</Text>
                    <View style={styles.formatBadge}>
                      <Text style={styles.formatText}>{st.format}</Text>
                    </View>
                  </View>

                  <Text style={styles.languageText}>{st.language}</Text>

                  <View style={styles.pricesContainer}>
                    <Text style={styles.priceItem}>
                      Std:{' '}
                      <Text style={styles.priceHighlight}>
                        {formatPrice(st.priceStandardCents)}
                      </Text>
                    </Text>
                    <Text style={styles.priceItem}>
                      VIP:{' '}
                      <Text style={styles.priceHighlight}>{formatPrice(st.priceVipCents)}</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  dateScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  dateCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCardSelected: {
    backgroundColor: '#e11d48',
    borderColor: '#f43f5e',
  },
  dateLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  dateLabelSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  cinemaCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cinemaHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
  },
  cinemaName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cinemaAddress: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  amenityBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  amenityText: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  showtimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  showtimeButton: {
    width: '48%',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  showtimeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  showtimeTime: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  formatBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formatText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  languageText: {
    fontSize: 11,
    color: '#94a3b8',
    marginVertical: 4,
  },
  pricesContainer: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  priceItem: {
    fontSize: 11,
    color: '#94a3b8',
  },
  priceHighlight: {
    color: '#34d399',
    fontWeight: '700',
  },
});
