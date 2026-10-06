import { describe, it, expect, beforeEach } from 'vitest';
import {
  CreateOrderUseCase,
  PayOrderUseCase,
  GetOrdersUseCase,
  GetOrderDetailUseCase,
} from '../../src/application/use-cases/orders.js';
import {
  FakeClock,
  InMemoryShowtimeRepository,
  InMemorySeatHoldStore,
  InMemoryOrderRepository,
  InMemoryCatalogRepository,
  DeterministicPaymentGateway,
} from './doubles/index.js';
import { HoldExpiredError, PaymentDeclinedError, NotFoundError } from '../../src/domain/errors.js';
import { Showtime, HallSeatMap, TICKET_TYPES } from '@cinetickets/shared';

describe('Application: Orders & Payment Use Cases', () => {
  let clock: FakeClock;
  let orderRepo: InMemoryOrderRepository;
  let showtimeRepo: InMemoryShowtimeRepository;
  let catalogRepo: InMemoryCatalogRepository;
  let seatHoldStore: InMemorySeatHoldStore;
  let paymentGateway: DeterministicPaymentGateway;

  let createOrderUseCase: CreateOrderUseCase;
  let payOrderUseCase: PayOrderUseCase;
  let getOrdersUseCase: GetOrdersUseCase;
  let getOrderDetailUseCase: GetOrderDetailUseCase;

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
        type: 'vip',
        x: 1,
        y: 0,
        status: 'available',
      },
    ],
  };

  beforeEach(() => {
    clock = new FakeClock(new Date('2026-10-06T12:00:00.000Z'));
    orderRepo = new InMemoryOrderRepository();
    showtimeRepo = new InMemoryShowtimeRepository();
    showtimeRepo.showtimes = [mockShowtime];
    showtimeRepo.seatMaps.set(mockShowtime.id, mockSeatMap);

    catalogRepo = new InMemoryCatalogRepository();
    catalogRepo.ticketTypes = [...TICKET_TYPES];
    catalogRepo.foodItems = [
      {
        id: 'food-1',
        name: 'Palomitas Grandes',
        description: 'Palomitas de maíz saladas',
        category: 'popcorn',
        priceCents: 150000,
        imageUrl: 'https://example.com/p.jpg',
        sizes: ['Grande'],
        available: true,
      },
    ];

    seatHoldStore = new InMemorySeatHoldStore(clock);
    paymentGateway = new DeterministicPaymentGateway();

    createOrderUseCase = new CreateOrderUseCase(
      orderRepo,
      showtimeRepo,
      catalogRepo,
      seatHoldStore,
      clock,
    );

    payOrderUseCase = new PayOrderUseCase(orderRepo, seatHoldStore, paymentGateway, clock);
    getOrdersUseCase = new GetOrdersUseCase(orderRepo);
    getOrderDetailUseCase = new GetOrderDetailUseCase(orderRepo);
  });

  describe('CreateOrderUseCase', () => {
    it('creates an order from a valid hold calculating prices server-side', async () => {
      const hold = await seatHoldStore.holdSeats('st-1', ['s1', 's2'], 480);

      const order = await createOrderUseCase.execute({
        holdId: hold.holdId,
        showtimeId: 'st-1',
        userId: 'user-demo',
        idempotencyKey: 'key-1234',
        seats: [
          { seatId: 's1', ticketTypeId: 'adult' }, // 500000 * 1 = 500000
          { seatId: 's2', ticketTypeId: 'child' }, // 700000 * 0.7 = 490000
        ],
        food: [{ foodItemId: 'food-1', qty: 1 }], // 150000
      });

      // Subtotal entradas = 990000
      // Subtotal comida = 150000
      // Subtotal = 1140000
      // Fees = 990000 * 0.05 = 49500
      // Total = 1140000 + 49500 = 1189500
      expect(order.id).toBeDefined();
      expect(order.subtotalCents).toBe(1140000);
      expect(order.feesCents).toBe(49500);
      expect(order.totalCents).toBe(1189500);
      expect(order.status).toBe('SEATS_HELD');
    });

    it('idempotency: returns existing order when using the same Idempotency-Key without duplicates', async () => {
      const hold = await seatHoldStore.holdSeats('st-1', ['s1'], 480);

      const order1 = await createOrderUseCase.execute({
        holdId: hold.holdId,
        showtimeId: 'st-1',
        userId: 'user-demo',
        idempotencyKey: 'idemp-key-repeat',
        seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
      });

      const order2 = await createOrderUseCase.execute({
        holdId: hold.holdId,
        showtimeId: 'st-1',
        userId: 'user-demo',
        idempotencyKey: 'idemp-key-repeat',
        seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
      });

      expect(order1.id).toBe(order2.id);
      expect(orderRepo.orders.length).toBe(1);
    });

    it('rejects order creation if hold has expired', async () => {
      const hold = await seatHoldStore.holdSeats('st-1', ['s1'], 480);

      // Advance clock past 8 minutes
      clock.advanceMinutes(9);

      await expect(
        createOrderUseCase.execute({
          holdId: hold.holdId,
          showtimeId: 'st-1',
          userId: 'user-demo',
          idempotencyKey: 'key-expired',
          seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
        }),
      ).rejects.toThrow(HoldExpiredError);
    });

    it('rejects order creation if idempotency key is missing', async () => {
      await expect(
        createOrderUseCase.execute({
          holdId: 'hold-1',
          showtimeId: 'st-1',
          userId: 'user-demo',
          idempotencyKey: '',
          seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
        }),
      ).rejects.toThrow();
    });

    it('rejects order creation if showtime is not found', async () => {
      await expect(
        createOrderUseCase.execute({
          holdId: 'hold-1',
          showtimeId: 'unknown-showtime',
          userId: 'user-demo',
          idempotencyKey: 'key-unknown-st',
          seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects order creation if food item is unavailable', async () => {
      catalogRepo.foodItems[0].available = false;
      const hold = await seatHoldStore.holdSeats('st-1', ['s1'], 480);

      await expect(
        createOrderUseCase.execute({
          holdId: hold.holdId,
          showtimeId: 'st-1',
          userId: 'user-demo',
          idempotencyKey: 'key-unavail-food',
          seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
          food: [{ foodItemId: 'food-1', qty: 1 }],
        }),
      ).rejects.toThrow();
    });
  });

  describe('PayOrderUseCase', () => {
    it('successfully processes payment and confirms order with QR code', async () => {
      const hold = await seatHoldStore.holdSeats('st-1', ['s1'], 480);
      const order = await createOrderUseCase.execute({
        holdId: hold.holdId,
        showtimeId: 'st-1',
        userId: 'user-demo',
        idempotencyKey: 'key-pay-success',
        seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
      });

      const result = await payOrderUseCase.execute({
        orderId: order.id,
        idempotencyKey: 'pay-key-1',
        paymentDetails: {
          cardNumber: '4111222233334567', // Approved
          cardHolderName: 'Juan Pérez',
          expMonth: 10,
          expYear: 2028,
          cvv: '123',
        },
      });

      expect(result.order.status).toBe('CONFIRMED');
      expect(result.qrCode).toMatch(/^CT-QR-/);
      expect(result.message).toContain('exitosamente');
    });

    it('idempotency on payment: repeated pay returns confirmed order with same QR code', async () => {
      const hold = await seatHoldStore.holdSeats('st-1', ['s1'], 480);
      const order = await createOrderUseCase.execute({
        holdId: hold.holdId,
        showtimeId: 'st-1',
        userId: 'user-demo',
        idempotencyKey: 'key-pay-idem',
        seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
      });

      const res1 = await payOrderUseCase.execute({
        orderId: order.id,
        idempotencyKey: 'pay-key-idem',
        paymentDetails: {
          cardNumber: '4111222233334567',
          cardHolderName: 'Juan Pérez',
          expMonth: 10,
          expYear: 2028,
          cvv: '123',
        },
      });

      const res2 = await payOrderUseCase.execute({
        orderId: order.id,
        idempotencyKey: 'pay-key-idem',
        paymentDetails: {
          cardNumber: '4111222233334567',
          cardHolderName: 'Juan Pérez',
          expMonth: 10,
          expYear: 2028,
          cvv: '123',
        },
      });

      expect(res1.order.id).toBe(res2.order.id);
      expect(res1.qrCode).toBe(res2.qrCode);
    });

    it('deterministic payment failure: card ending with 0000 throws PaymentDeclinedError and marks order FAILED', async () => {
      const hold = await seatHoldStore.holdSeats('st-1', ['s1'], 480);
      const order = await createOrderUseCase.execute({
        holdId: hold.holdId,
        showtimeId: 'st-1',
        userId: 'user-demo',
        idempotencyKey: 'key-pay-fail',
        seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
      });

      await expect(
        payOrderUseCase.execute({
          orderId: order.id,
          idempotencyKey: 'pay-key-declined',
          paymentDetails: {
            cardNumber: '4000000000000000', // Ends in 0000 -> Declined
            cardHolderName: 'Juan Pérez',
            expMonth: 10,
            expYear: 2028,
            cvv: '123',
          },
        }),
      ).rejects.toThrow(PaymentDeclinedError);

      const updatedOrder = await orderRepo.findById(order.id);
      expect(updatedOrder?.status).toBe('FAILED');
    });

    it('simulated network error: card ending with 1111 throws DomainError', async () => {
      const hold = await seatHoldStore.holdSeats('st-1', ['s1'], 480);
      const order = await createOrderUseCase.execute({
        holdId: hold.holdId,
        showtimeId: 'st-1',
        userId: 'user-demo',
        idempotencyKey: 'key-pay-net-err',
        seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
      });

      await expect(
        payOrderUseCase.execute({
          orderId: order.id,
          idempotencyKey: 'pay-key-network',
          paymentDetails: {
            cardNumber: '4111111111111111', // Ends in 1111 -> Network error
            cardHolderName: 'Juan Pérez',
            expMonth: 10,
            expYear: 2028,
            cvv: '123',
          },
        }),
      ).rejects.toThrow();

      const updatedOrder = await orderRepo.findById(order.id);
      expect(updatedOrder?.status).toBe('FAILED');
    });

    it('rejects pay order if idempotency key is missing', async () => {
      await expect(
        payOrderUseCase.execute({
          orderId: 'any-ord',
          idempotencyKey: '',
          paymentDetails: {
            cardNumber: '4111222233334567',
            cardHolderName: 'Juan Pérez',
            expMonth: 10,
            expYear: 2028,
            cvv: '123',
          },
        }),
      ).rejects.toThrow();
    });

    it('rejects payment if hold expired before paying and transitions order to EXPIRED', async () => {
      const hold = await seatHoldStore.holdSeats('st-1', ['s1'], 480);
      const order = await createOrderUseCase.execute({
        holdId: hold.holdId,
        showtimeId: 'st-1',
        userId: 'user-demo',
        idempotencyKey: 'key-pay-timeout',
        seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
      });

      // Advance clock past 8 minutes
      clock.advanceMinutes(9);

      await expect(
        payOrderUseCase.execute({
          orderId: order.id,
          idempotencyKey: 'pay-key-timeout',
          paymentDetails: {
            cardNumber: '4111222233334567',
            cardHolderName: 'Juan Pérez',
            expMonth: 10,
            expYear: 2028,
            cvv: '123',
          },
        }),
      ).rejects.toThrow(HoldExpiredError);

      const updatedOrder = await orderRepo.findById(order.id);
      expect(updatedOrder?.status).toBe('EXPIRED');
    });
  });

  describe('GetOrdersUseCase & GetOrderDetailUseCase', () => {
    it('retrieves orders for a user and detail by id', async () => {
      const hold = await seatHoldStore.holdSeats('st-1', ['s1'], 480);
      const order = await createOrderUseCase.execute({
        holdId: hold.holdId,
        showtimeId: 'st-1',
        userId: 'user-1',
        idempotencyKey: 'key-user-orders',
        seats: [{ seatId: 's1', ticketTypeId: 'adult' }],
      });

      const userOrders = await getOrdersUseCase.execute('user-1');
      expect(userOrders.length).toBe(1);
      expect(userOrders[0].id).toBe(order.id);

      const detail = await getOrderDetailUseCase.execute(order.id);
      expect(detail.id).toBe(order.id);
    });

    it('throws NotFoundError for unknown order id', async () => {
      await expect(getOrderDetailUseCase.execute('non-existent')).rejects.toThrow(NotFoundError);
    });
  });
});
