import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { CinemaShowtimesGroup } from '@cinetickets/shared';

export function useMovieShowtimes(movieId: string, dateStr: string) {
  return useQuery<CinemaShowtimesGroup[], Error>({
    queryKey: ['showtimes', movieId, dateStr],
    queryFn: () => apiClient.getMovieShowtimes(movieId, dateStr),
    enabled: Boolean(movieId) && Boolean(dateStr),
    staleTime: 1000 * 60 * 2, // 2 min
  });
}
