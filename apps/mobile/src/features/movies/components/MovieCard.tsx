import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Movie } from '@cinetickets/shared';

export interface MovieCardProps {
  movie: Movie;
  onPress: () => void;
}

export function MovieCard({ movie, onPress }: MovieCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Película: ${movie.title}, calificación ${movie.score} de 10`}
    >
      <Image
        source={{ uri: movie.posterUrl }}
        style={styles.poster}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>
            {movie.title}
          </Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>★ {movie.score.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.genres} numberOfLines={1}>
          {movie.genres.join(' • ')}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{movie.rating}</Text>
          </View>
          <Text style={styles.durationText}>{movie.durationMin} min</Text>
          <Text style={styles.yearText}>{movie.year}</Text>
        </View>

        <Text style={styles.synopsis} numberOfLines={2}>
          {movie.synopsis}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  poster: {
    width: 105,
    height: 155,
    backgroundColor: '#334155',
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    marginRight: 8,
  },
  scoreBadge: {
    backgroundColor: '#eab308',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  genres: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  ratingBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  durationText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  yearText: {
    fontSize: 12,
    color: '#64748b',
  },
  synopsis: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 6,
    lineHeight: 16,
  },
});
