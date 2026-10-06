import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { Movie } from '@cinetickets/shared';

export interface UseMoviesFilterParams {
  search?: string;
  genre?: string;
  cinemaId?: string;
  format?: string;
}

export function useMovies(params: UseMoviesFilterParams = {}) {
  return useQuery<Movie[], Error>({
    queryKey: ['movies', params],
    queryFn: () => apiClient.getMovies(params),
    staleTime: 1000 * 60 * 5, // 5 min
  });
}
