import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BillboardScreen from '../app/index';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock useMovies hook
jest.mock('../src/features/movies/hooks/useMovies', () => ({
  useMovies: () => ({
    data: [
      {
        id: 'm1',
        title: 'Película en Cartelera',
        director: 'Director Uno',
        cast: ['Actor Principal'],
        synopsis: 'Una aventura emocionante.',
        genres: ['Acción', 'Aventura'],
        durationMin: 120,
        rating: 'PG-13',
        language: 'Español',
        subtitles: [],
        releaseDate: '2026-01-01',
        posterUrl: 'https://example.com/poster.jpg',
        score: 8.5,
        country: 'Argentina',
        year: 2026,
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe('BillboardScreen', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  it('renders CineTickets title, search bar, filter chips and movie cards', () => {
    const { getByText, getByPlaceholderText } = render(
      <QueryClientProvider client={queryClient}>
        <BillboardScreen />
      </QueryClientProvider>,
    );

    expect(getByText('CineTickets')).toBeTruthy();
    expect(getByText('Cartelera de Cine')).toBeTruthy();
    expect(getByText('🎟️ Mis Entradas')).toBeTruthy();
    expect(getByPlaceholderText('Buscar película, director o actor...')).toBeTruthy();
    expect(getByText('Géneros')).toBeTruthy();
    expect(getByText('Formatos')).toBeTruthy();
    expect(getByText('Película en Cartelera')).toBeTruthy();
    expect(getByText('★ 8.5')).toBeTruthy();
  });
});
