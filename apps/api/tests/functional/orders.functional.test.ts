import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/http/server.js';
import { prisma } from '../../src/infrastructure/db.js';
import { redis } from '../../src/infrastructure/redis.js';
import { runSeed } from '../../prisma/seed.js';

describe('Functional: Holds, Orders & Payment API (Phase 4)', () => {
  let app: FastifyInstance;
  let testShowtimeId: string;
  let testSeats: { id: string; type: string }[];
  let testTicketTypeId: string;
  let testFoodItemId: string;

  beforeAll(async () => {
    // 1. Población determinística
    await runSeed(42);

    // 2. Levantar Fastify app
    app = await buildApp();
    await app.ready();

    // 3. Obtener una función futura y asientos disponibles (no vendidos en el seed)
    const showtime = await prisma.showtime.findFirst({
      where: {
        startsAt: {
          gt: new Date(),
        },
      },
      include: {
        hall: true,
      },
    });

    if (!showtime) {
      throw new Error('No se encontró función de prueba en la base de datos');
    }

    testShowtimeId = showtime.id;

    const soldOrderSeats = await prisma.orderSeat.findMany({
      where: { showtimeId: showtime.id },
      select: { seatId: true },
    });
    const soldSeatIds = new Set(soldOrderSeats.map((os) => os.seatId));

    const hallSeats = await prisma.seat.findMany({
      where: { hallId: showtime.hallId },
    });

    const availableSeats = hallSeats.filter((s) => !soldSeatIds.has(s.id));
    if (availableSeats.length < 10) {
      throw new Error('No hay suficientes asientos libres en la función de prueba');
    }

    testSeats = availableSeats.map((s) => ({ id: s.id, type: s.type }));

    const ticketType = await prisma.ticketType.findFirst();
    if (!ticketType) {
      throw new Error('No se encontró ticketType de prueba');
    }
    testTicketTypeId = ticketType.id;

    const foodItem = await prisma.foodItem.findFirst();
    if (!foodItem) {
      throw new Error('No se encontró foodItem de prueba');
    }
    testFoodItemId = foodItem.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await prisma.$disconnect();
    if (redis.status === 'ready') {
      await redis.quit();
    }
  });

  it('Prueba 4: POST /api/v1/showtimes/:id/holds crea un hold atómico en Redis con TTL de ~8 minutos', async () => {
    const seatIds = [testSeats[0].id, testSeats[1].id];

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/showtimes/${testShowtimeId}/holds`,
      payload: { seatIds },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.holdId).toBeDefined();
    expect(body.showtimeId).toBe(testShowtimeId);
    expect(body.seatIds).toEqual(seatIds);
    expect(body.expiresAt).toBeDefined();

    const expiresAt = new Date(body.expiresAt).getTime();
    const diffMinutes = (expiresAt - Date.now()) / (1000 * 60);
    expect(diffMinutes).toBeGreaterThan(7.5);
    expect(diffMinutes).toBeLessThanOrEqual(8.1);

    // Verificar en Redis directamente
    const redisKey = `hold:seat:${testShowtimeId}:${testSeats[0].id}`;
    const ttl = await redis.ttl(redisKey);
    expect(ttl).toBeGreaterThan(450); // ~480s
    expect(ttl).toBeLessThanOrEqual(480);
  });

  it('Prueba 5: Conflicto de asientos simultáneos - segundo usuario recibe 409 SEAT_UNAVAILABLE', async () => {
    // Intentar hold sobre el mismo asiento que ya está bloqueado
    const seatIds = [testSeats[0].id];

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/showtimes/${testShowtimeId}/holds`,
      payload: { seatIds },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.payload);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('SEAT_UNAVAILABLE');
  });

  it('Prueba 6: DELETE /api/v1/holds/:id libera el hold y permite que otro usuario lo reserve', async () => {
    // Obtener el holdId del asiento reservado
    const redisKey = `hold:seat:${testShowtimeId}:${testSeats[0].id}`;
    const holdId = await redis.get(redisKey);
    expect(holdId).toBeDefined();

    // Liberar hold
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/holds/${holdId}`,
    });
    expect(deleteRes.statusCode).toBe(200);

    // Ahora otro usuario puede reservar el mismo asiento exitosamente
    const newHoldRes = await app.inject({
      method: 'POST',
      url: `/api/v1/showtimes/${testShowtimeId}/holds`,
      payload: { seatIds: [testSeats[0].id] },
    });
    expect(newHoldRes.statusCode).toBe(201);
  });

  it('Prueba 7: POST /api/v1/orders crea una orden desde un hold activo con cálculo exacto de precios', async () => {
    // 1. Crear hold de asientos 2 y 3
    const seatIds = [testSeats[2].id, testSeats[3].id];
    const holdRes = await app.inject({
      method: 'POST',
      url: `/api/v1/showtimes/${testShowtimeId}/holds`,
      payload: { seatIds },
    });
    expect(holdRes.statusCode).toBe(201);
    const hold = JSON.parse(holdRes.payload);

    // 2. Crear orden con Idempotency-Key
    const idempotencyKey = `idem-order-${Date.now()}`;
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: {
        'idempotency-key': idempotencyKey,
      },
      payload: {
        holdId: hold.holdId,
        showtimeId: testShowtimeId,
        customer: {
          name: 'Comprador Test',
          email: 'comprador.test@cinetickets.test',
          phone: '+54 11 1234-5678',
        },
        seats: [
          { seatId: testSeats[2].id, ticketTypeId: testTicketTypeId },
          { seatId: testSeats[3].id, ticketTypeId: testTicketTypeId },
        ],
        food: [{ foodItemId: testFoodItemId, qty: 1 }],
      },
    });

    expect(orderRes.statusCode).toBe(201);
    const order = JSON.parse(orderRes.payload);
    expect(order.id).toBeDefined();
    expect(order.status).toBe('SEATS_HELD');
    expect(order.subtotalCents).toBeGreaterThan(0);
    expect(order.feesCents).toBe(
      Math.round((order.seats[0].priceCents + order.seats[1].priceCents) * 0.05),
    );
    expect(order.totalCents).toBe(order.subtotalCents + order.feesCents);
    expect(order.seats).toHaveLength(2);
    expect(order.food).toHaveLength(1);
  });

  it('Prueba 8: Idempotencia en POST /api/v1/orders - misma cabecera devuelve la misma orden', async () => {
    // 1. Crear hold
    const seatIds = [testSeats[4].id];
    const holdRes = await app.inject({
      method: 'POST',
      url: `/api/v1/showtimes/${testShowtimeId}/holds`,
      payload: { seatIds },
    });
    expect(holdRes.statusCode).toBe(201);
    const hold = JSON.parse(holdRes.payload);

    const idempotencyKey = `idem-replay-${Date.now()}`;
    const payload = {
      holdId: hold.holdId,
      showtimeId: testShowtimeId,
      seats: [{ seatId: testSeats[4].id, ticketTypeId: testTicketTypeId }],
      food: [],
    };

    // Primera llamada
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { 'idempotency-key': idempotencyKey },
      payload,
    });
    expect(res1.statusCode).toBe(201);
    const order1 = JSON.parse(res1.payload);

    // Segunda llamada idéntica
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { 'idempotency-key': idempotencyKey },
      payload,
    });
    expect(res2.statusCode).toBe(201);
    const order2 = JSON.parse(res2.payload);

    expect(order1.id).toBe(order2.id);
    expect(order1.idempotencyKey).toBe(order2.idempotencyKey);
  });

  it('Prueba 9: Expiración de hold es rechazada con HOLD_EXPIRED', async () => {
    const fakeHoldId = 'hold-expirado-12345';
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { 'idempotency-key': `idem-expired-${Date.now()}` },
      payload: {
        holdId: fakeHoldId,
        showtimeId: testShowtimeId,
        seats: [{ seatId: testSeats[0].id, ticketTypeId: testTicketTypeId }],
      },
    });

    expect(response.statusCode).toBe(410);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('HOLD_EXPIRED');
  });

  it('Prueba 10: Flujo de pago - Tarjeta terminada en 0000 es rechazada (PAYMENT_DECLINED)', async () => {
    // 1. Crear un hold y una orden
    const extraSeat = testSeats[5];

    const holdRes = await app.inject({
      method: 'POST',
      url: `/api/v1/showtimes/${testShowtimeId}/holds`,
      payload: { seatIds: [extraSeat.id] },
    });
    const hold = JSON.parse(holdRes.payload);

    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { 'idempotency-key': `idem-fail-pay-${Date.now()}` },
      payload: {
        holdId: hold.holdId,
        showtimeId: testShowtimeId,
        seats: [{ seatId: extraSeat.id, ticketTypeId: testTicketTypeId }],
      },
    });
    const order = JSON.parse(orderRes.payload);

    // 2. Intentar pagar con tarjeta terminada en 0000
    const payRes = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${order.id}/pay`,
      headers: { 'idempotency-key': `idem-pay-0000-${Date.now()}` },
      payload: {
        paymentMethod: {
          cardNumber: '4532000000000000',
          cardHolderName: 'Juan Perez',
          expMonth: 12,
          expYear: 2028,
          cvv: '123',
        },
      },
    });

    expect(payRes.statusCode).toBe(402);
    const payBody = JSON.parse(payRes.payload);
    expect(payBody.error.code).toBe('PAYMENT_DECLINED');

    // Verificar en BD que la orden pasó a FAILED
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder?.status).toBe('FAILED');
  });

  it('Prueba 11: Flujo de pago exitoso - Tarjeta válida confirma orden, genera QR e idempotencia', async () => {
    const validSeat = testSeats[6];

    const holdRes = await app.inject({
      method: 'POST',
      url: `/api/v1/showtimes/${testShowtimeId}/holds`,
      payload: { seatIds: [validSeat.id] },
    });
    const hold = JSON.parse(holdRes.payload);

    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { 'idempotency-key': `idem-success-order-${Date.now()}` },
      payload: {
        holdId: hold.holdId,
        showtimeId: testShowtimeId,
        seats: [{ seatId: validSeat.id, ticketTypeId: testTicketTypeId }],
      },
    });
    const order = JSON.parse(orderRes.payload);

    // Pagar con tarjeta válida
    const payKey = `idem-success-pay-${Date.now()}`;
    const payRes = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${order.id}/pay`,
      headers: { 'idempotency-key': payKey },
      payload: {
        paymentMethod: {
          cardNumber: '4532123456789999',
          cardHolderName: 'Ana Gomez',
          expMonth: 8,
          expYear: 2027,
          cvv: '456',
        },
      },
    });

    expect(payRes.statusCode).toBe(200);
    const payBody = JSON.parse(payRes.payload);
    expect(payBody.status).toBe('CONFIRMED');
    expect(payBody.qrCode).toBeDefined();
    expect(payBody.qrCode).toContain(`CT-QR-${order.id}`);

    // Replay de pago con misma Idempotency-Key
    const replayRes = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${order.id}/pay`,
      headers: { 'idempotency-key': payKey },
      payload: {
        paymentMethod: {
          cardNumber: '4532123456789999',
          cardHolderName: 'Ana Gomez',
          expMonth: 8,
          expYear: 2027,
          cvv: '456',
        },
      },
    });
    expect(replayRes.statusCode).toBe(200);
    const replayBody = JSON.parse(replayRes.payload);
    expect(replayBody.qrCode).toBe(payBody.qrCode);

    // Consultar detalle de la orden GET /orders/:id
    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/${order.id}`,
    });
    expect(detailRes.statusCode).toBe(200);
    const detailBody = JSON.parse(detailRes.payload);
    expect(detailBody.status).toBe('CONFIRMED');
    expect(detailBody.qrCode).toBe(payBody.qrCode);

    // Consultar mis entradas GET /orders?userId=
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/orders?userId=${detailBody.userId}`,
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.payload);
    expect(Array.isArray(listBody)).toBe(true);
    expect(listBody.some((o: { id: string }) => o.id === order.id)).toBe(true);
  });
});
