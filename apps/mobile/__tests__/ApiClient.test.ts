import { ApiClient, ApiError } from '../src/api/client';

describe('ApiClient', () => {
  const mockBaseUrl = 'http://test-api:3000/api/v1';
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient(mockBaseUrl);
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('normalizes base url to always have /api/v1', () => {
    const c1 = new ApiClient('http://localhost:3000');
    expect((c1 as unknown as { baseUrl: string }).baseUrl).toBe('http://localhost:3000/api/v1');

    const c2 = new ApiClient('http://localhost:3000/api/v1/');
    expect((c2 as unknown as { baseUrl: string }).baseUrl).toBe('http://localhost:3000/api/v1');

    c1.setBaseUrl('http://10.0.2.2:3000');
    expect((c1 as unknown as { baseUrl: string }).baseUrl).toBe('http://10.0.2.2:3000/api/v1');
  });

  const mockMovie = {
    id: 'm1',
    title: 'Película Test',
    director: 'Director Test',
    cast: ['Actor 1'],
    synopsis: 'Sinopsis test',
    genres: ['Acción'],
    durationMin: 120,
    rating: 'PG-13',
    language: 'Español',
    subtitles: [],
    releaseDate: '2026-01-01',
    posterUrl: 'https://example.com/poster.jpg',
    score: 8.5,
    country: 'Argentina',
    year: 2026,
  };

  it('fetches movies with filters', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockMovie],
    });

    const movies = await client.getMovies({
      search: 'Peli',
      genre: 'Acción',
      cinemaId: 'c1',
      format: 'IMAX',
    });
    expect(movies).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${mockBaseUrl}/movies?search=Peli&genre=Acci%C3%B3n&cinemaId=c1&format=IMAX`,
      expect.anything(),
    );
  });

  it('fetches single movie by id', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovie,
    });

    const movie = await client.getMovie('m1');
    expect(movie.id).toBe('m1');
  });

  it('fetches movie showtimes grouped by cinema', async () => {
    const mockGroup = {
      cinema: {
        id: 'c1',
        name: 'Cine Uno',
        address: 'Calle 1',
        city: 'BsAs',
        timezone: 'America/Argentina/Buenos_Aires',
        amenities: [],
      },
      showtimes: [
        {
          id: 'st1',
          movieId: 'm1',
          hallId: 'h1',
          startsAt: '2026-10-06T18:00:00.000Z',
          language: 'Español',
          format: '2D',
          priceStandardCents: 450000,
          priceVipCents: 650000,
          priceAccessibleCents: 350000,
        },
      ],
    };

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockGroup],
    });

    const groups = await client.getMovieShowtimes('m1', '2026-10-06');
    expect(groups).toHaveLength(1);
    expect(groups[0].cinema.name).toBe('Cine Uno');
  });

  it('fetches seat map for a showtime', async () => {
    const mockSeatMap = {
      hall: {
        id: 'h1',
        cinemaId: 'c1',
        name: 'Sala 1',
        format: '2D',
        rows: 5,
        cols: 5,
      },
      showtime: {
        id: 'st1',
        movieId: 'm1',
        hallId: 'h1',
        startsAt: '2026-10-06T18:00:00.000Z',
        language: 'Español',
        format: '2D',
        priceStandardCents: 450000,
        priceVipCents: 650000,
        priceAccessibleCents: 350000,
      },
      seats: [
        {
          id: 'seat-1',
          hallId: 'h1',
          row: 'A',
          number: 1,
          type: 'standard',
          x: 0,
          y: 0,
          status: 'available',
        },
      ],
    };

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSeatMap,
    });

    const map = await client.getSeatMap('st1');
    expect(map.seats).toHaveLength(1);
  });

  it('fetches food items and ticket types', async () => {
    const mockFood = [
      {
        id: 'f1',
        name: 'Palomitas',
        description: 'Con mantequilla',
        category: 'popcorn',
        priceCents: 65000,
        imageUrl: 'https://example.com/popcorn.jpg',
        available: true,
      },
    ];
    const mockTicketTypes = [{ id: 'adult', label: 'Adulto', discountPct: 0 }];

    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockFood })
      .mockResolvedValueOnce({ ok: true, json: async () => mockTicketTypes });

    const food = await client.getFoodItems('popcorn');
    expect(food).toHaveLength(1);

    const ticketTypes = await client.getTicketTypes();
    expect(ticketTypes).toHaveLength(1);
  });

  it('releases a hold', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const res = await client.releaseHold('hld_123');
    expect(res.success).toBe(true);
  });

  it('creates an order and processes payment', async () => {
    const mockOrder = {
      id: 'ord-1',
      userId: 'u1',
      showtimeId: 'st1',
      status: 'SEATS_HELD',
      subtotalCents: 450000,
      feesCents: 22500,
      totalCents: 472500,
      holdExpiresAt: '2026-10-06T18:10:00.000Z',
      idempotencyKey: 'idem-1',
      createdAt: '2026-10-06T18:02:00.000Z',
    };

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrder,
    });

    const order = await client.createOrder(
      {
        holdId: 'hld_1',
        showtimeId: 'st1',
        seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
        food: [],
      },
      'idem-1',
    );
    expect(order.id).toBe('ord-1');

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orderId: 'ord-1',
        status: 'CONFIRMED',
        qrCode: 'CT-QR-ord-1',
        message: 'Aprobado',
      }),
    });

    const payRes = await client.payOrder(
      'ord-1',
      {
        cardNumber: '4532123456789999',
        cardHolderName: 'Test',
        expMonth: 12,
        expYear: 2028,
        cvv: '123',
      },
      'idem-pay-1',
    );
    expect(payRes.status).toBe('CONFIRMED');
    expect(payRes.qrCode).toBe('CT-QR-ord-1');
  });

  it('fetches user orders and single order detail', async () => {
    const mockOrder = {
      id: 'ord-1',
      userId: 'u1',
      showtimeId: 'st1',
      status: 'CONFIRMED',
      subtotalCents: 450000,
      feesCents: 22500,
      totalCents: 472500,
      holdExpiresAt: '2026-10-06T18:10:00.000Z',
      idempotencyKey: 'idem-1',
      qrCode: 'CT-QR-123',
      createdAt: '2026-10-06T18:02:00.000Z',
    };

    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [mockOrder] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockOrder });

    const orders = await client.getOrders('u1');
    expect(orders).toHaveLength(1);

    const order = await client.getOrder('ord-1');
    expect(order.id).toBe('ord-1');
  });

  it('handles errors without structured body gracefully', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('Not JSON');
      },
    });

    await expect(client.getMovies()).rejects.toThrow(ApiError);
  });
});
