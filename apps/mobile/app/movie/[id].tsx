import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMovieDetail } from '../../src/features/movies/hooks/useMovieDetail';
import { useMovieShowtimes } from '../../src/features/movies/hooks/useMovieShowtimes';
import { ShowtimeSelector } from '../../src/features/movies/components/ShowtimeSelector';
import { Showtime } from '@cinetickets/shared';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Generar las 7 fechas consecutivas a partir de hoy (o base del seed)
  const availableDates = useMemo(() => {
    const dates = [];
    const base = new Date();
    // Normalizar a UTC mediodía para evitar saltos de huso horario
    base.setUTCHours(12, 0, 0, 0);

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayName = dayNames[d.getUTCDay()];
      const monthName = monthNames[d.getUTCMonth()];
      const label = i === 0 ? 'Hoy' : `${dayName} ${d.getUTCDate()} ${monthName}`;
      dates.push({ label, dateStr });
    }
    return dates;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0]?.dateStr || '');

  const {
    data: movie,
    isLoading: isMovieLoading,
    isError: isMovieError,
    error: movieError,
    refetch: refetchMovie,
  } = useMovieDetail(id || '');

  const {
    data: cinemaGroups,
    isLoading: isShowtimesLoading,
    isError: isShowtimesError,
    error: showtimesError,
    refetch: refetchShowtimes,
  } = useMovieShowtimes(id || '', selectedDate);

  const handleOpenTrailer = (trailerUrl?: string | null) => {
    if (trailerUrl) {
      Linking.openURL(trailerUrl).catch(() => {});
    }
  };

  const handleSelectShowtime = (showtime: Showtime) => {
    router.push(`/booking/${showtime.id}`);
  };

  if (isMovieLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e11d48" />
        <Text style={styles.loadingText}>Cargando detalle de la película...</Text>
      </View>
    );
  }

  if (isMovieError || !movie) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Error al cargar la película</Text>
        <Text style={styles.errorMessage}>
          {movieError?.message || 'No se encontró la película'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetchMovie()}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: movie.title,
          headerBackTitle: 'Cartelera',
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Banner con Póster e Info Principal */}
        <View style={styles.header}>
          <Image
            source={{ uri: movie.posterUrl }}
            style={styles.poster}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{movie.title}</Text>
            {movie.originalTitle && (
              <Text style={styles.originalTitle}>({movie.originalTitle})</Text>
            )}

            <View style={styles.scoreRow}>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>★ {movie.score.toFixed(1)} / 10</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{movie.rating}</Text>
              </View>
            </View>

            <Text style={styles.metaText}>
              {movie.durationMin} min • {movie.country} • {movie.year}
            </Text>

            <View style={styles.genresContainer}>
              {movie.genres.map((g) => (
                <View key={g} style={styles.genreTag}>
                  <Text style={styles.genreText}>{g}</Text>
                </View>
              ))}
            </View>

            {movie.trailerUrl && (
              <TouchableOpacity
                style={styles.trailerButton}
                onPress={() => handleOpenTrailer(movie.trailerUrl)}
                accessibilityRole="button"
                accessibilityLabel="Ver tráiler de la película"
              >
                <Text style={styles.trailerButtonText}>▶ Ver Tráiler</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Ficha Técnica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sinopsis</Text>
          <Text style={styles.synopsisText}>{movie.synopsis}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ficha Técnica</Text>
          <View style={styles.techRow}>
            <Text style={styles.techLabel}>Director:</Text>
            <Text style={styles.techValue}>{movie.director}</Text>
          </View>
          <View style={styles.techRow}>
            <Text style={styles.techLabel}>Reparto:</Text>
            <Text style={styles.techValue}>{movie.cast.join(', ')}</Text>
          </View>
          <View style={styles.techRow}>
            <Text style={styles.techLabel}>Idioma:</Text>
            <Text style={styles.techValue}>{movie.language}</Text>
          </View>
          <View style={styles.techRow}>
            <Text style={styles.techLabel}>Subtítulos:</Text>
            <Text style={styles.techValue}>
              {movie.subtitles.length > 0 ? movie.subtitles.join(', ') : 'Ninguno'}
            </Text>
          </View>
          <View style={styles.techRow}>
            <Text style={styles.techLabel}>Estreno:</Text>
            <Text style={styles.techValue}>{movie.releaseDate}</Text>
          </View>
        </View>

        {/* Selector de Funciones y Horarios */}
        {isShowtimesLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color="#e11d48" />
            <Text style={styles.inlineLoadingText}>Cargando funciones...</Text>
          </View>
        ) : isShowtimesError ? (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>
              Error al cargar funciones: {showtimesError?.message}
            </Text>
            <TouchableOpacity onPress={() => refetchShowtimes()}>
              <Text style={styles.inlineRetryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ShowtimeSelector
            cinemaGroups={cinemaGroups || []}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectShowtime={handleSelectShowtime}
            availableDates={availableDates}
          />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
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
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 22,
  },
  originalTitle: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  scoreBadge: {
    backgroundColor: '#eab308',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  ratingBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  genreTag: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  genreText: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  trailerButton: {
    backgroundColor: '#e11d48',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  trailerButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  synopsisText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  techRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  techLabel: {
    width: 85,
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  techValue: {
    flex: 1,
    fontSize: 13,
    color: '#f8fafc',
  },
  inlineLoading: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  inlineLoadingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  inlineError: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  inlineErrorText: {
    color: '#f43f5e',
    fontSize: 13,
  },
  inlineRetryText: {
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: 13,
  },
});
