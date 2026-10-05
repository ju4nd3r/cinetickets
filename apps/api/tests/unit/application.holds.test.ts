import { describe, it, expect, beforeEach } from 'vitest';
import { HoldSeatsUseCase, ReleaseHoldUseCase } from '../../src/application/use-cases/holds.js';
import { FakeClock, InMemoryShowtimeRepository, InMemorySeatHoldStore } from './doubles/index.js';
import { SeatUnavailableError, NotFoundError, ValidationError } from '../../src/domain/errors.js';
import { Showtime, HallSeatMap } from '@cinetickets/shared';

describe('Application: Holds Use Cases', () => {
  let clock: FakeClock;
  let showtimeRepo: InMemoryShowtimeRepository;
  let seatHoldStore: InMemorySeatHoldStore;
  let holdSeatsUseCase: HoldSeatsUseCase;
  let releaseHoldUseCase: ReleaseHoldUseCase;

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
      rows: 2,
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
      {
        id: 's3',
        hallId: 'hall-1',
        row: 'B',
        number: 1,
        type: 'vip',
        x: 0,
        y: 1,
        status: 'available',
      },
      {
        id: 's4_sold',
        hallId: 'hall-1',
        row: 'B',
        number: 2,
        type: 'standard',
        x: 1,
        y: 1,
        status: 'occupied',
      },
    ],
  };

  beforeEach(() => {
    clock = new FakeClock(new Date('2026-10-06T12:00:00.000Z'));
    showtimeRepo = new InMemoryShowtimeRepository();
    showtimeRepo.showtimes = [mockShowtime];
    showtimeRepo.seatMaps.set(mockShowtime.id, mockSeatMap);

    seatHoldStore = new InMemorySeatHoldStore(clock);
    holdSeatsUseCase = new HoldSeatsUseCase(showtimeRepo, seatHoldStore, clock);
    releaseHoldUseCase = new ReleaseHoldUseCase(seatHoldStore);
  });

  it('creates an atomic hold with 8 minutes TTL', async () => {
    const result = await holdSeatsUseCase.execute('st-1', ['s1', 's2']);

    expect(result.holdId).toBeDefined();
    expect(result.showtimeId).toBe('st-1');
    expect(result.seatIds).toEqual(['s1', 's2']);
    expect(new Date(result.expiresAt).getTime()).toBe(
      new Date('2026-10-06T12:08:00.000Z').getTime(),
    );
  });

  it('prevents double-hold on the same seats (concurrency conflict)', async () => {
    await holdSeatsUseCase.execute('st-1', ['s1']);

    await expect(holdSeatsUseCase.execute('st-1', ['s1'])).rejects.toThrow(SeatUnavailableError);
  });

  it('releases hold and allows re-selecting seats', async () => {
    const hold = await holdSeatsUseCase.execute('st-1', ['s1']);
    await releaseHoldUseCase.execute(hold.holdId);

    // Now s1 can be held again
    const secondHold = await holdSeatsUseCase.execute('st-1', ['s1']);
    expect(secondHold.holdId).toBeDefined();
  });

  it('automatically frees seats once TTL expires using FakeClock', async () => {
    await holdSeatsUseCase.execute('st-1', ['s1']);

    // Advance clock 8 minutes and 1 second
    clock.advanceSeconds(481);

    // Now s1 should be available again
    const newHold = await holdSeatsUseCase.execute('st-1', ['s1']);
    expect(newHold.holdId).toBeDefined();
  });

  it('rejects holding already sold seats', async () => {
    await expect(holdSeatsUseCase.execute('st-1', ['s4_sold'])).rejects.toThrow(
      SeatUnavailableError,
    );
  });

  it('rejects holding seats for a past showtime', async () => {
    // Showtime is at 18:00, advance clock to 19:00
    clock.advanceHours(7);
    await expect(holdSeatsUseCase.execute('st-1', ['s1'])).rejects.toThrow(ValidationError);
  });

  it('rejects holding seats if showtime does not exist', async () => {
    await expect(holdSeatsUseCase.execute('non-existent-showtime', ['s1'])).rejects.toThrow(
      NotFoundError,
    );
  });

  it('rejects seats that do not exist in the hall', async () => {
    await expect(holdSeatsUseCase.execute('st-1', ['non-existent-seat'])).rejects.toThrow(
      NotFoundError,
    );
  });
});
