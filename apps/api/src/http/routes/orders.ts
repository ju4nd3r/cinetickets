import { FastifyInstance } from 'fastify';
import { CreateOrderRequestSchema, PaymentRequestSchema } from '@cinetickets/shared';
import {
  CreateOrderUseCase,
  PayOrderUseCase,
  GetOrdersUseCase,
  GetOrderDetailUseCase,
} from '../../application/use-cases/orders.js';
import { PrismaOrderRepository } from '../../infrastructure/repositories/prisma-order.repository.js';
import { PrismaShowtimeRepository } from '../../infrastructure/repositories/prisma-showtime.repository.js';
import { PrismaCatalogRepository } from '../../infrastructure/repositories/prisma-catalog.repository.js';
import { RedisSeatHoldStore } from '../../infrastructure/redis-seat-hold.store.js';
import { DeterministicPaymentGateway } from '../../infrastructure/payment-gateway.js';
import { SystemClock } from '../../infrastructure/system-clock.js';
import { prisma } from '../../infrastructure/db.js';
import { redis } from '../../infrastructure/redis.js';
import { ValidationError } from '../../domain/errors.js';

export async function orderRoutes(app: FastifyInstance) {
  const orderRepo = new PrismaOrderRepository(prisma);
  const showtimeRepo = new PrismaShowtimeRepository(prisma);
  const catalogRepo = new PrismaCatalogRepository(prisma);
  const seatHoldStore = new RedisSeatHoldStore(redis);
  const paymentGateway = new DeterministicPaymentGateway();
  const clock = new SystemClock();

  const createOrderUseCase = new CreateOrderUseCase(
    orderRepo,
    showtimeRepo,
    catalogRepo,
    seatHoldStore,
    clock,
  );
  const payOrderUseCase = new PayOrderUseCase(orderRepo, seatHoldStore, paymentGateway, clock);
  const getOrdersUseCase = new GetOrdersUseCase(orderRepo);
  const getOrderDetailUseCase = new GetOrderDetailUseCase(orderRepo);

  // POST /orders
  app.post<{
    Body: unknown;
  }>(
    '/orders',
    {
      schema: {
        description:
          'Crea una orden desde un hold de asientos activo (requiere cabecera Idempotency-Key)',
        tags: ['Órdenes'],
        headers: {
          type: 'object',
          properties: {
            'idempotency-key': {
              type: 'string',
              description: 'Clave de idempotencia única para la orden',
            },
          },
          required: ['idempotency-key'],
        },
      },
    },
    async (request, reply) => {
      const idempotencyKey = (request.headers['idempotency-key'] as string | undefined)?.trim();
      if (!idempotencyKey) {
        throw new ValidationError('La cabecera Idempotency-Key es obligatoria');
      }

      const body = CreateOrderRequestSchema.parse(request.body);

      // Determinar el userId correspondiente
      let userId = body.userId;
      if (!userId) {
        if (body.customer) {
          const user = await prisma.user.upsert({
            where: { email: body.customer.email },
            update: {
              name: body.customer.name,
              phone: body.customer.phone ?? null,
            },
            create: {
              email: body.customer.email,
              name: body.customer.name,
              phone: body.customer.phone ?? null,
            },
          });
          userId = user.id;
        } else {
          // Usuario demo por defecto
          const demoUser = await prisma.user.findUnique({
            where: { email: 'demo@cinetickets.test' },
          });
          if (demoUser) {
            userId = demoUser.id;
          } else {
            const created = await prisma.user.create({
              data: {
                email: 'demo@cinetickets.test',
                name: 'Usuario Demo',
              },
            });
            userId = created.id;
          }
        }
      }

      const order = await createOrderUseCase.execute({
        holdId: body.holdId,
        showtimeId: body.showtimeId,
        userId,
        idempotencyKey,
        seats: body.seats,
        food: body.food,
      });

      return reply.status(201).send(order);
    },
  );

  // POST /orders/:id/pay
  app.post<{
    Params: { id: string };
    Body: unknown;
  }>(
    '/orders/:id/pay',
    {
      schema: {
        description: 'Procesa el pago de una orden pendiente (requiere cabecera Idempotency-Key)',
        tags: ['Órdenes', 'Pagos'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID de la orden' },
          },
          required: ['id'],
        },
        headers: {
          type: 'object',
          properties: {
            'idempotency-key': {
              type: 'string',
              description: 'Clave de idempotencia única para el pago',
            },
          },
          required: ['idempotency-key'],
        },
      },
    },
    async (request, reply) => {
      const idempotencyKey = (request.headers['idempotency-key'] as string | undefined)?.trim();
      if (!idempotencyKey) {
        throw new ValidationError('La cabecera Idempotency-Key es obligatoria');
      }

      const body = PaymentRequestSchema.parse(request.body);

      const result = await payOrderUseCase.execute({
        orderId: request.params.id,
        paymentDetails: body.paymentMethod,
        idempotencyKey,
      });

      return reply.status(200).send({
        orderId: result.order.id,
        status: result.order.status,
        qrCode: result.qrCode,
        message: result.message,
      });
    },
  );

  // GET /orders?userId=
  app.get<{
    Querystring: { userId?: string };
  }>(
    '/orders',
    {
      schema: {
        description: 'Obtiene las órdenes de un usuario (Mis entradas)',
        tags: ['Órdenes'],
        querystring: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'ID del usuario' },
          },
        },
      },
    },
    async (request, reply) => {
      let userId = request.query.userId;
      if (!userId) {
        const demoUser = await prisma.user.findUnique({
          where: { email: 'demo@cinetickets.test' },
        });
        userId = demoUser?.id || '';
      }

      const orders = await getOrdersUseCase.execute(userId);
      return reply.status(200).send(orders);
    },
  );

  // GET /orders/:id
  app.get<{
    Params: { id: string };
  }>(
    '/orders/:id',
    {
      schema: {
        description: 'Obtiene el detalle completo de una orden con código QR',
        tags: ['Órdenes'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID de la orden' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const order = await getOrderDetailUseCase.execute(request.params.id);
      return reply.status(200).send(order);
    },
  );
}
