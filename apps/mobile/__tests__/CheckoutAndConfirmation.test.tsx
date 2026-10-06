import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheckoutScreen from '../app/booking/checkout';
import ConfirmationScreen from '../app/booking/confirmation';
import { useBookingStore } from '../src/features/booking/stores/useBookingStore';
import { apiClient, ApiError } from '../src/api/client';
import { Showtime, Order } from '@cinetickets/shared';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ orderId: 'ord-test-123' }),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  Stack: {
    Screen: () => null,
  },
}));

describe('Checkout and Confirmation Screens', () => {
  let queryClient: QueryClient;

  const mockShowtime: Showtime = {
    id: 'st-chk-1',
    movieId: 'm1',
    hallId: 'h1',
    startsAt: '2026-10-06T20:00:00.000Z',
    language: 'Español',
    format: '2D',
    priceStandardCents: 450000,
    priceVipCents: 650000,
    priceAccessibleCents: 350000,
    movie: {
      id: 'm1',
      title: 'Película Épica',
      director: 'Director Test',
      cast: ['Actor Test'],
      synopsis: 'Sinopsis test',
      genres: ['Aventura'],
      durationMin: 120,
      rating: 'B15',
      language: 'Español',
      subtitles: [],
      releaseDate: '2026-01-01',
      posterUrl: 'https://example.com/poster.jpg',
      score: 9.0,
      country: 'México',
      year: 2026,
    },
    cinema: {
      id: 'c1',
      name: 'Cineplex Centro',
      address: 'Calle Falsa 123',
      city: 'CDMX',
      timezone: 'America/Mexico_City',
      amenities: ['Estacionamiento'],
    },
  };

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

  it('CheckoutScreen shows empty state if no seats are selected', () => {
    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <CheckoutScreen />
      </QueryClientProvider>,
    );

    expect(getByText('Sin asientos seleccionados')).toBeTruthy();
    fireEvent.press(getByText('Ir a la cartelera'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('CheckoutScreen submits order and payment successfully', async () => {
    const store = useBookingStore.getState();
    store.setShowtime(mockShowtime);
    store.toggleSeat(
      {
        id: 's1',
        hallId: 'h1',
        row: 'B',
        number: 4,
        type: 'standard',
        x: 0,
        y: 0,
        status: 'available',
      },
      { id: 'adult', label: 'Adulto', discountPct: 0 },
    );
    store.setHold('hld-777', new Date(Date.now() + 600000).toISOString());

    const mockCreatedOrder: Order = {
      id: 'ord-test-123',
      userId: 'user-demo-1',
      showtimeId: 'st-chk-1',
      status: 'SEATS_HELD',
      subtotalCents: 450000,
      feesCents: 22500,
      totalCents: 472500,
      holdExpiresAt: new Date(Date.now() + 600000).toISOString(),
      idempotencyKey: 'ord-hld-777',
      createdAt: new Date().toISOString(),
    };

    const createOrderSpy = jest
      .spyOn(apiClient, 'createOrder')
      .mockResolvedValueOnce(mockCreatedOrder);
    const payOrderSpy = jest.spyOn(apiClient, 'payOrder').mockResolvedValueOnce({
      orderId: 'ord-test-123',
      status: 'CONFIRMED',
      qrCode: 'CT-QR-TEST-123',
      message: 'Pago aprobado exitosamente',
    });

    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <CheckoutScreen />
      </QueryClientProvider>,
    );

    expect(getByText('Resumen del Pedido')).toBeTruthy();
    expect(getByText('✓ Tarjeta Válida')).toBeTruthy();

    fireEvent.press(getByText('Pagar Pedido'));

    await waitFor(() => {
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          holdId: 'hld-777',
          showtimeId: 'st-chk-1',
          customer: expect.objectContaining({ name: 'Demo Usuario' }),
        }),
        'ord-hld-777',
      );
      expect(payOrderSpy).toHaveBeenCalledWith(
        'ord-test-123',
        expect.objectContaining({ cardNumber: '4532000000001234' }),
        'pay-ord-test-123',
      );
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/booking/confirmation',
        params: { orderId: 'ord-test-123' },
      });
    });
  }, 15000);

  it('CheckoutScreen handles simulated PAYMENT_DECLINED with card ending in 0000', async () => {
    const store = useBookingStore.getState();
    store.setShowtime(mockShowtime);
    store.toggleSeat(
      {
        id: 's1',
        hallId: 'h1',
        row: 'B',
        number: 4,
        type: 'standard',
        x: 0,
        y: 0,
        status: 'available',
      },
      { id: 'adult', label: 'Adulto', discountPct: 0 },
    );
    store.setHold('hld-777', new Date(Date.now() + 600000).toISOString());

    const mockCreatedOrder: Order = {
      id: 'ord-test-123',
      userId: 'user-demo-1',
      showtimeId: 'st-chk-1',
      status: 'SEATS_HELD',
      subtotalCents: 450000,
      feesCents: 22500,
      totalCents: 472500,
      holdExpiresAt: new Date(Date.now() + 600000).toISOString(),
      idempotencyKey: 'ord-hld-777',
      createdAt: new Date().toISOString(),
    };

    jest.spyOn(apiClient, 'createOrder').mockResolvedValueOnce(mockCreatedOrder);
    jest
      .spyOn(apiClient, 'payOrder')
      .mockRejectedValueOnce(
        new ApiError('PAYMENT_DECLINED', 'Tarjeta rechazada por el banco emisor', 402),
      );

    const { getByText, getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <CheckoutScreen />
      </QueryClientProvider>,
    );

    // Seleccionar tarjeta rechazada
    fireEvent.press(getByText('✕ Termina 0000 (Rechazo)'));
    fireEvent.press(getByText('Pagar Pedido'));

    await waitFor(() => {
      expect(getByTestId('checkout-error-banner')).toBeTruthy();
      expect(
        getByText(
          'Pago rechazado por el banco emisor (Tarjeta terminada en 0000). Por favor utiliza otra tarjeta.',
        ),
      ).toBeTruthy();
    });
  }, 15000);

  it('ConfirmationScreen renders order details, QR code and navigation buttons', async () => {
    const mockOrder: Order = {
      id: 'ord-confirmed-999',
      userId: 'user-demo-1',
      showtimeId: 'st-chk-1',
      status: 'CONFIRMED',
      subtotalCents: 450000,
      feesCents: 22500,
      totalCents: 472500,
      holdExpiresAt: new Date(Date.now() + 600000).toISOString(),
      idempotencyKey: 'ord-key',
      qrCode: 'CT-CONFIRMED-999',
      createdAt: new Date().toISOString(),
      showtime: mockShowtime,
      seats: [
        {
          id: 'os-1',
          orderId: 'ord-confirmed-999',
          showtimeId: 'st-chk-1',
          seatId: 's1',
          ticketTypeId: 'adult',
          priceCents: 450000,
          seat: {
            id: 's1',
            hallId: 'h1',
            row: 'B',
            number: 4,
            type: 'standard',
            x: 0,
            y: 0,
          },
          ticketType: { id: 'adult', label: 'Adulto', discountPct: 0 },
        },
      ],
      food: [],
    };

    jest.spyOn(apiClient, 'getOrder').mockResolvedValueOnce(mockOrder);

    const { getByText, getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <ConfirmationScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(getByText('¡Compra Confirmada!')).toBeTruthy();
      expect(getByText('Película Épica')).toBeTruthy();
      expect(getByText('Cineplex Centro • Sala')).toBeTruthy();
      expect(getByTestId('confirmation-qr-card')).toBeTruthy();
      expect(getByText('CT-CONFIRMED-999')).toBeTruthy();
      expect(getByText('B4 (Adulto)')).toBeTruthy();
      expect(getByText('$4725.00')).toBeTruthy();
    });

    fireEvent.press(getByText('Ver en Mis Entradas'));
    expect(mockReplace).toHaveBeenCalledWith('/my-tickets');

    fireEvent.press(getByText('Volver a la Cartelera'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  }, 15000);
});
