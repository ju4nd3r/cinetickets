import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyTicketsScreen from '../app/my-tickets';
import { apiClient } from '../src/api/client';
import { Order } from '@cinetickets/shared';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
  }),
  Stack: {
    Screen: () => null,
  },
}));

describe('MyTicketsScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
  const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();

  const mockOrders: Order[] = [
    {
      id: 'ord-upcoming-1',
      userId: 'user-demo-1',
      showtimeId: 'st-up-1',
      status: 'CONFIRMED',
      subtotalCents: 450000,
      feesCents: 22500,
      totalCents: 472500,
      holdExpiresAt: futureDate,
      idempotencyKey: 'key-1',
      qrCode: 'CT-UPCOMING-1',
      createdAt: new Date().toISOString(),
      showtime: {
        id: 'st-up-1',
        movieId: 'm1',
        hallId: 'h1',
        startsAt: futureDate,
        language: 'Español',
        format: '2D',
        priceStandardCents: 450000,
        priceVipCents: 650000,
        priceAccessibleCents: 350000,
        movie: {
          id: 'm1',
          title: 'Película Futura',
          director: 'Director 1',
          cast: [],
          synopsis: 'Sinopsis',
          genres: ['Acción'],
          durationMin: 120,
          rating: 'B15',
          language: 'Español',
          subtitles: [],
          releaseDate: '2026-01-01',
          posterUrl: 'https://example.com/p.jpg',
          score: 8.5,
          country: 'México',
          year: 2026,
        },
        cinema: {
          id: 'c1',
          name: 'Cineplex Norte',
          address: 'Av. Norte',
          city: 'CDMX',
          timezone: 'America/Mexico_City',
          amenities: [],
        },
        hall: {
          id: 'h1',
          cinemaId: 'c1',
          name: 'Sala 1',
          format: '2D',
          rows: 5,
          cols: 5,
        },
      },
      seats: [
        {
          id: 'os-1',
          orderId: 'ord-upcoming-1',
          showtimeId: 'st-up-1',
          seatId: 's1',
          ticketTypeId: 'adult',
          priceCents: 450000,
          seat: {
            id: 's1',
            hallId: 'h1',
            row: 'C',
            number: 3,
            type: 'standard',
            x: 0,
            y: 0,
          },
        },
      ],
      food: [],
    },
    {
      id: 'ord-past-1',
      userId: 'user-demo-1',
      showtimeId: 'st-past-1',
      status: 'CONFIRMED',
      subtotalCents: 450000,
      feesCents: 22500,
      totalCents: 472500,
      holdExpiresAt: pastDate,
      idempotencyKey: 'key-2',
      qrCode: 'CT-PAST-1',
      createdAt: pastDate,
      showtime: {
        id: 'st-past-1',
        movieId: 'm2',
        hallId: 'h2',
        startsAt: pastDate,
        language: 'Español',
        format: '3D',
        priceStandardCents: 500000,
        priceVipCents: 700000,
        priceAccessibleCents: 400000,
        movie: {
          id: 'm2',
          title: 'Película Pasada',
          director: 'Director 2',
          cast: [],
          synopsis: 'Sinopsis',
          genres: ['Comedia'],
          durationMin: 95,
          rating: 'A',
          language: 'Español',
          subtitles: [],
          releaseDate: '2026-01-01',
          posterUrl: 'https://example.com/p2.jpg',
          score: 7.5,
          country: 'México',
          year: 2026,
        },
        cinema: {
          id: 'c1',
          name: 'Cineplex Sur',
          address: 'Av. Sur',
          city: 'CDMX',
          timezone: 'America/Mexico_City',
          amenities: [],
        },
        hall: {
          id: 'h2',
          cinemaId: 'c1',
          name: 'Sala 2',
          format: '3D',
          rows: 5,
          cols: 5,
        },
      },
      seats: [],
      food: [],
    },
  ];

  it('renders upcoming orders and switches to past orders tab', async () => {
    jest.spyOn(apiClient, 'getOrders').mockResolvedValueOnce(mockOrders);

    const { getByText, queryByText } = render(
      <QueryClientProvider client={queryClient}>
        <MyTicketsScreen />
      </QueryClientProvider>,
    );

    // Próximas tab activa por defecto
    await waitFor(() => {
      expect(getByText('Película Futura')).toBeTruthy();
      expect(queryByText('Película Pasada')).toBeNull();
    });

    // Cambiar a Pasadas
    fireEvent.press(getByText('Pasadas (1)'));

    await waitFor(() => {
      expect(getByText('Película Pasada')).toBeTruthy();
      expect(queryByText('Película Futura')).toBeNull();
    });
  }, 15000);

  it('opens and closes QR modal on ticket press', async () => {
    jest.spyOn(apiClient, 'getOrders').mockResolvedValueOnce(mockOrders);

    const { getByText, getByTestId, queryByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <MyTicketsScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(getByText('Película Futura')).toBeTruthy());

    // Tocar tarjeta para ver modal
    fireEvent.press(getByText('Película Futura'));

    await waitFor(() => {
      expect(getByTestId('ticket-qr-modal')).toBeTruthy();
      expect(getByText('Boleto Digital')).toBeTruthy();
      expect(getByText('CT-UPCOMING-1')).toBeTruthy();
    });

    // Cerrar modal
    fireEvent.press(getByText('Cerrar'));
    await waitFor(() => {
      expect(queryByTestId('ticket-qr-modal')).toBeNull();
    });
  }, 15000);

  it('shows empty state when user has no orders', async () => {
    jest.spyOn(apiClient, 'getOrders').mockResolvedValueOnce([]);

    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <MyTicketsScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(getByText('No tienes funciones próximas')).toBeTruthy();
    });

    fireEvent.press(getByText('Ver Cartelera'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  }, 15000);
});
