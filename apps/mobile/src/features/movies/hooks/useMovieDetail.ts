import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { Movie } from '@cinetickets/shared';

export function useMovieDetail(movieId: string) {
  return useQuery<Movie, Error>({
    queryKey: ['movie', movieId],
    queryFn: () => apiClient.getMovie(movieId),
    enabled: Boolean(movieId),
    staleTime: 1000 * 60 * 5,
  });
}
