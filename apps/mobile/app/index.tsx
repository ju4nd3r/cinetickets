import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMovies } from '../src/features/movies/hooks/useMovies';
import { MovieCard } from '../src/features/movies/components/MovieCard';
import { SearchBar } from '../src/features/movies/components/SearchBar';
import { FilterChips } from '../src/features/movies/components/FilterChips';

const GENRES = [
  'Todos',
  'Acción',
  'Aventura',
  'Ciencia Ficción',
  'Comedia',
  'Drama',
  'Fantasía',
  'Terror',
  'Misterio',
  'Animación',
  'Documental',
];

const FORMATS = ['Todos', '2D', '3D', 'IMAX', 'VIP'];

export default function BillboardScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [selectedFormat, setSelectedFormat] = useState('Todos');

  const filterParams = useMemo(() => {
    return {
      search: search.trim() ? search.trim() : undefined,
      genre: selectedGenre !== 'Todos' ? selectedGenre : undefined,
      format: selectedFormat !== 'Todos' ? selectedFormat : undefined,
    };
  }, [search, selectedGenre, selectedFormat]);

  const { data: movies, isLoading, isError, error, refetch } = useMovies(filterParams);

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra superior con navegación a Mis Entradas */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandTitle}>CineTickets</Text>
          <Text style={styles.brandSubtitle}>Cartelera de Cine</Text>
        </View>
        <TouchableOpacity
          style={styles.myTicketsButton}
          onPress={() => router.push('/my-tickets')}
          accessibilityRole="button"
          accessibilityLabel="Ir a Mis entradas"
        >
          <Text style={styles.myTicketsText}>🎟️ Mis Entradas</Text>
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <SearchBar value={search} onChangeText={setSearch} />

      {/* Filtros de Género */}
      <FilterChips
        label="Géneros"
        options={GENRES}
        selectedOption={selectedGenre}
        onSelect={setSelectedGenre}
      />

      {/* Filtros de Formato */}
      <FilterChips
        label="Formatos"
        options={FORMATS}
        selectedOption={selectedFormat}
        onSelect={setSelectedFormat}
      />

      {/* Estados de Carga, Error y Lista */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#e11d48" />
          <Text style={styles.loadingText}>Cargando cartelera...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error al cargar películas</Text>
          <Text style={styles.errorMessage}>{error?.message || 'Verifica tu conexión'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel="Reintentar carga de cartelera"
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : !movies || movies.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyTitle}>No se encontraron películas</Text>
          <Text style={styles.emptyMessage}>
            Intenta cambiar los filtros o el término de búsqueda
          </Text>
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MovieCard movie={item} onPress={() => router.push(`/movie/${item.id}`)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  myTicketsButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  myTicketsText: {
    color: '#f8fafc',
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
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 36,
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
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  emptyMessage: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 8,
  },
});
