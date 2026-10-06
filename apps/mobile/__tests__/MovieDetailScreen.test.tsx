import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MovieDetailScreen from '../app/movie/[id]';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'm-1' }),
  useRouter: () => ({
    push: mockPush,
  }),
  Stack: {
    Screen: () => null,
  },
}));

jest.mock('../src/features/movies/hooks/useMovieDetail', () => ({
  useMovieDetail: () => ({
    data: {
      id: 'm-1',
      title: 'Sombras del Pasado',
      originalTitle: 'Echoes of the Past',
      director: 'Alejandro Rossi',
      cast: ['Mateo Morales', 'Lucía Fernandez'],
      synopsis: 'Un detective retirado en Buenos Aires debe enfrentar el caso sin resolver.',
      genres: ['Thriller', 'Misterio'],
      durationMin: 124,
      rating: 'PG-13',
      language: 'Español',
      subtitles: ['Inglés'],
      releaseDate: '2026-03-15',
      posterUrl: 'https://example.com/poster.jpg',
      trailerUrl: 'https://youtube.com/trailer',
      score: 8.4,
      country: 'Argentina',
      year: 2026,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('../src/features/movies/hooks/useMovieShowtimes', () => ({
  useMovieShowtimes: () => ({
    data: [
      {
        cinema: {
          id: 'c1',
          name: 'CineTickets Grand Plaza',
          address: 'Av. Libertador 4500',
          city: 'Buenos Aires',
          amenities: ['IMAX Láser'],
        },
        showtimes: [
          {
            id: 'st-100',
            movieId: 'm-1',
            hallId: 'h-1',
            startsAt: '2026-10-06T20:00:00.000Z',
            language: 'Subtitulada',
            format: 'IMAX',
            priceStandardCents: 600000,
            priceVipCents: 850000,
            priceAccessibleCents: 500000,
          },
        ],
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe('MovieDetailScreen', () => {
  const queryClient = new QueryClient();

  it('renders all movie details, metadata, synopsis, cast and showtimes', () => {
    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <MovieDetailScreen />
      </QueryClientProvider>,
    );

    expect(getByText('Sombras del Pasado')).toBeTruthy();
    expect(getByText('(Echoes of the Past)')).toBeTruthy();
    expect(getByText('★ 8.4 / 10')).toBeTruthy();
    expect(getByText('124 min • Argentina • 2026')).toBeTruthy();
    expect(getByText('Alejandro Rossi')).toBeTruthy();
    expect(getByText('Mateo Morales, Lucía Fernandez')).toBeTruthy();
    expect(
      getByText('Un detective retirado en Buenos Aires debe enfrentar el caso sin resolver.'),
    ).toBeTruthy();
    expect(getByText('▶ Ver Tráiler')).toBeTruthy();
    expect(getByText('CineTickets Grand Plaza')).toBeTruthy();
    expect(getByText('20:00')).toBeTruthy();

    // Tap showtime and navigate to booking
    fireEvent.press(getByText('20:00'));
    expect(mockPush).toHaveBeenCalledWith('/booking/st-100');
  });
});
