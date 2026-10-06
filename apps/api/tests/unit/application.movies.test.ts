import { describe, it, expect, beforeEach } from 'vitest';
import {
  SearchMoviesUseCase,
  GetMovieDetailUseCase,
} from '../../src/application/use-cases/movies.js';
import {
  GetShowtimesUseCase,
  GetSeatMapUseCase,
} from '../../src/application/use-cases/showtimes.js';
import {
  FakeClock,
  InMemoryMovieRepository,
  InMemoryShowtimeRepository,
  InMemorySeatHoldStore,
} from './doubles/index.js';
import { NotFoundError } from '../../src/domain/errors.js';
import { Movie, Showtime, HallSeatMap } from '@cinetickets/shared';

describe('Application: Movies & Showtimes Use Cases', () => {
  let movieRepo: InMemoryMovieRepository;
  let showtimeRepo: InMemoryShowtimeRepository;
  let seatHoldStore: InMemorySeatHoldStore;
  let clock: FakeClock;

  let searchMoviesUseCase: SearchMoviesUseCase;
  let getMovieDetailUseCase: GetMovieDetailUseCase;
  let getShowtimesUseCase: GetShowtimesUseCase;
  let getSeatMapUseCase: GetSeatMapUseCase;

  const mockMovie: Movie = {
    id: 'mov-1',
    title: 'Inception',
    originalTitle: 'Inception',
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio'],
    synopsis: 'Mind-bending dream theft',
    genres: ['Sci-Fi', 'Action'],
    durationMin: 148,
    rating: 'PG-13',
    language: 'Inglés',
    subtitles: ['Español'],
    releaseDate: '2010-07-16',
    posterUrl: 'https://example.com/poster.jpg',
    score: 8.8,
    country: 'USA',
    year: 2010,
  };

  const mockShowtime: Showtime = {
    id: 'st-1',
    movieId: 'mov-1',
    hallId: 'hall-1',
    startsAt: '2026-10-06T18:00:00.000Z',
    language: 'Español',
    format: '2D',
    priceStandardCents: 500000,
    priceVipCents: 700000,
    priceAccessibleCents: 400000,
  };

  const mockSeatMap: HallSeatMap = {
    hall: {
      id: 'hall-1',
      cinemaId: 'cin-1',
      name: 'Sala 1',
      format: '2D',
      rows: 1,
      cols: 2,
    },
    showtime: mockShowtime,
    seats: [
      {
        id: 's1',
        hallId: 'hall-1',
        row: 'A',
        number: 1,
        type: 'standard',
        x: 0,
        y: 0,
        status: 'available',
      },
      {
        id: 's2',
        hallId: 'hall-1',
        row: 'A',
        number: 2,
        type: 'standard',
        x: 1,
        y: 0,
        status: 'available',
      },
    ],
  };

  beforeEach(() => {
    clock = new FakeClock();
    movieRepo = new InMemoryMovieRepository();
    movieRepo.movies = [mockMovie];

    showtimeRepo = new InMemoryShowtimeRepository();
    showtimeRepo.showtimes = [mockShowtime];
    showtimeRepo.seatMaps.set('st-1', mockSeatMap);
    showtimeRepo.cinemaGroups = [
      {
        cinema: {
          id: 'cin-1',
          name: 'Cine Central',
          address: 'Calle 123',
          city: 'Buenos Aires',
          timezone: 'America/Argentina/Buenos_Aires',
          amenities: ['IMAX'],
        },
        showtimes: [mockShowtime],
      },
    ];

    seatHoldStore = new InMemorySeatHoldStore(clock);

    searchMoviesUseCase = new SearchMoviesUseCase(movieRepo);
    getMovieDetailUseCase = new GetMovieDetailUseCase(movieRepo);
    getShowtimesUseCase = new GetShowtimesUseCase(showtimeRepo);
    getSeatMapUseCase = new GetSeatMapUseCase(showtimeRepo, seatHoldStore);
  });

  it('searches and filters movies', async () => {
    const all = await searchMoviesUseCase.execute({});
    expect(all.length).toBe(1);

    const filtered = await searchMoviesUseCase.execute({ search: 'Inception' });
    expect(filtered.length).toBe(1);

    const nonExistent = await searchMoviesUseCase.execute({ search: 'NonExistent' });
    expect(nonExistent.length).toBe(0);
  });

  it('gets movie detail or throws NotFoundError', async () => {
    const movie = await getMovieDetailUseCase.execute('mov-1');
    expect(movie.title).toBe('Inception');

    await expect(getMovieDetailUseCase.execute('unknown')).rejects.toThrow(NotFoundError);
  });

  it('gets showtimes grouped by cinema for a movie', async () => {
    const groups = await getShowtimesUseCase.execute('mov-1', '2026-10-06');
    expect(groups.length).toBe(1);
    expect(groups[0].cinema.name).toBe('Cine Central');
    expect(groups[0].showtimes[0].id).toBe('st-1');
  });

  it('reflects active holds in seat map real-time status', async () => {
    // Add occupied seat
    mockSeatMap.seats.push({
      id: 's3_occupied',
      hallId: 'hall-1',
      row: 'A',
      number: 3,
      type: 'standard',
      x: 2,
      y: 0,
      status: 'occupied',
    });

    await seatHoldStore.holdSeats('st-1', ['s1'], 480);

    const seatMap = await getSeatMapUseCase.execute('st-1');
    const seat1 = seatMap.seats.find((s) => s.id === 's1');
    const seat2 = seatMap.seats.find((s) => s.id === 's2');
    const seat3 = seatMap.seats.find((s) => s.id === 's3_occupied');

    expect(seat1?.status).toBe('held');
    expect(seat2?.status).toBe('available');
    expect(seat3?.status).toBe('occupied');
  });

  it('throws NotFoundError if seat map does not exist for showtime', async () => {
    await expect(getSeatMapUseCase.execute('unknown-showtime')).rejects.toThrow(NotFoundError);
  });
});
