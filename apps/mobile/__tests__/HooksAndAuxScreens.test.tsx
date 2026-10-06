import React from 'react';
import { render } from '@testing-library/react-native';
import MyTicketsScreen from '../app/my-tickets';
import { useMovies } from '../src/features/movies/hooks/useMovies';
import { useMovieDetail } from '../src/features/movies/hooks/useMovieDetail';
import { useMovieShowtimes } from '../src/features/movies/hooks/useMovieShowtimes';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../src/api/client';

import RootLayout from '../app/_layout';

jest.mock('expo-router', () => {
  const React = require('react');
  const StackComponent = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('View', null, children);
  StackComponent.Screen = () => null;
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({ showtimeId: 'st-test-456' }),
    Stack: StackComponent,
  };
});

describe('Auxiliary Screens & Movie Hooks', () => {
  it('renders RootLayout properly', () => {
    const { toJSON } = render(<RootLayout />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders MyTicketsScreen properly', () => {
    const { getByText } = render(<MyTicketsScreen />);
    expect(getByText('Mis Entradas')).toBeTruthy();
  });

  describe('Hooks', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
    });

    afterEach(() => {
      queryClient.clear();
      jest.restoreAllMocks();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it('useMovies hook queries apiClient.getMovies', async () => {
      const spy = jest.spyOn(apiClient, 'getMovies').mockResolvedValueOnce([]);
      const { result } = renderHook(() => useMovies({ genre: 'Drama' }), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(spy).toHaveBeenCalledWith({ genre: 'Drama' });
    });

    it('useMovieDetail hook queries apiClient.getMovie', async () => {
      const mockMovie = {
        id: 'm1',
        title: 'Title',
        director: 'Dir',
        cast: [],
        synopsis: 'Syn',
        genres: [],
        durationMin: 100,
        rating: 'G',
        language: 'ES',
        subtitles: [],
        releaseDate: '2026-01-01',
        posterUrl: 'https://example.com/p.jpg',
        score: 8,
        country: 'AR',
        year: 2026,
      };
      const spy = jest.spyOn(apiClient, 'getMovie').mockResolvedValueOnce(mockMovie);
      const { result } = renderHook(() => useMovieDetail('m1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(spy).toHaveBeenCalledWith('m1');
    });

    it('useMovieShowtimes hook queries apiClient.getMovieShowtimes', async () => {
      const spy = jest.spyOn(apiClient, 'getMovieShowtimes').mockResolvedValueOnce([]);
      const { result } = renderHook(() => useMovieShowtimes('m1', '2026-10-06'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(spy).toHaveBeenCalledWith('m1', '2026-10-06');
    });
  });
});
