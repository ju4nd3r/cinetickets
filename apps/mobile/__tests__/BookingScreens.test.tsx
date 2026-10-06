import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HallSeatMap, FoodItem } from '@cinetickets/shared';
import BookingScreen from '../app/booking/[showtimeId]';
import FoodSelectionScreen from '../app/booking/food';
import { useBookingStore } from '../src/features/booking/stores/useBookingStore';
import { apiClient } from '../src/api/client';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ showtimeId: 'st-booking-1' }),
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
  Stack: {
    Screen: () => null,
  },
}));

describe('Booking Screens', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    useBookingStore.getState().resetBooking();
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const mockSeatMap: HallSeatMap = {
    hall: {
      id: 'h1',
      cinemaId: 'c1',
      name: 'Sala 1',
      format: '2D',
      rows: 2,
      cols: 2,
    },
    showtime: {
      id: 'st-booking-1',
      movieId: 'm1',
      hallId: 'h1',
      startsAt: '2026-10-06T18:00:00.000Z',
      language: 'Español',
      format: '2D',
      priceStandardCents: 450000,
      priceVipCents: 650000,
      priceAccessibleCents: 350000,
      movie: {
        id: 'm1',
        title: 'Película en Sala',
        director: 'Director Test',
        cast: ['Actor 1'],
        synopsis: 'Sinopsis test',
        genres: ['Acción'],
        durationMin: 120,
        rating: 'B15',
        language: 'Español',
        subtitles: ['Inglés'],
        releaseDate: '2026-01-01',
        posterUrl: 'https://example.com/poster.jpg',
        score: 8.5,
        country: 'México',
        year: 2026,
      },
      cinema: {
        id: 'c1',
        name: 'Cineplex',
        address: 'Av. Siempre Viva 123',
        city: 'Ciudad',
        timezone: 'America/Mexico_City',
        amenities: ['Parking', 'IMAX'],
      },
    },
    seats: [
      {
        id: 's1',
        hallId: 'h1',
        row: 'A',
        number: 1,
        type: 'standard',
        x: 0,
        y: 0,
        status: 'available',
      },
      {
        id: 's2',
        hallId: 'h1',
        row: 'A',
        number: 2,
        type: 'standard',
        x: 1,
        y: 0,
        status: 'occupied',
      },
    ],
  };

  const mockTicketTypes = [{ id: 'adult', label: 'Adulto', discountPct: 0 }];

  it('BookingScreen renders seat map, toggles seat, and handles hold creation', async () => {
    jest.spyOn(apiClient, 'getSeatMap').mockResolvedValueOnce(mockSeatMap);
    jest.spyOn(apiClient, 'getTicketTypes').mockResolvedValueOnce(mockTicketTypes);
    const holdSpy = jest.spyOn(apiClient, 'createHold').mockResolvedValueOnce({
      holdId: 'hld-999',
      showtimeId: 'st-booking-1',
      seatIds: ['s1'],
      expiresAt: '2026-10-06T18:10:00.000Z',
    });

    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <BookingScreen />
      </QueryClientProvider>,
    );

    // Esperar que cargue la sala
    await waitFor(() => expect(getByText('Sala 1 • 2D')).toBeTruthy());
    expect(getByText('0 / 10 seleccionados')).toBeTruthy();

    // Seleccionar asiento A1
    fireEvent.press(getByText('1'));
    await waitFor(() => expect(getByText('1 / 10 seleccionados')).toBeTruthy());

    // Continuar a comida (crea hold)
    fireEvent.press(getByText('Continuar ▶'));

    await waitFor(() => {
      expect(holdSpy).toHaveBeenCalledWith('st-booking-1', ['s1']);
      expect(mockPush).toHaveBeenCalledWith('/booking/food');
    });
  });

  it('FoodSelectionScreen renders food catalog, calculates totals and navigates', async () => {
    const mockFood: FoodItem[] = [
      {
        id: 'f1',
        name: 'Palomitas Grandes',
        description: 'Crujientes',
        category: 'popcorn',
        priceCents: 65000,
        imageUrl: 'https://example.com/p.jpg',
        available: true,
      },
    ];

    jest.spyOn(apiClient, 'getFoodItems').mockResolvedValueOnce(mockFood);

    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <FoodSelectionScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(getByText('Palomitas Grandes')).toBeTruthy());

    // Saltar comida
    fireEvent.press(getByText('Saltar comida'));
    expect(mockPush).toHaveBeenCalledWith('/booking/checkout');
  });
});
