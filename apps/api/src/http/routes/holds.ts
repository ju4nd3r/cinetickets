import { FastifyInstance } from 'fastify';
import { CreateHoldRequestSchema } from '@cinetickets/shared';
import { HoldSeatsUseCase, ReleaseHoldUseCase } from '../../application/use-cases/holds.js';
import { PrismaShowtimeRepository } from '../../infrastructure/repositories/prisma-showtime.repository.js';
import { RedisSeatHoldStore } from '../../infrastructure/redis-seat-hold.store.js';
import { SystemClock } from '../../infrastructure/system-clock.js';
import { prisma } from '../../infrastructure/db.js';
import { redis } from '../../infrastructure/redis.js';

export async function holdRoutes(app: FastifyInstance) {
  const showtimeRepo = new PrismaShowtimeRepository(prisma);
  const seatHoldStore = new RedisSeatHoldStore(redis);
  const clock = new SystemClock();

  const holdSeatsUseCase = new HoldSeatsUseCase(showtimeRepo, seatHoldStore, clock);
  const releaseHoldUseCase = new ReleaseHoldUseCase(seatHoldStore);

  // POST /showtimes/:id/holds
  app.post<{
    Params: { id: string };
    Body: unknown;
  }>(
    '/showtimes/:id/holds',
    {
      schema: {
        description: 'Bloquea temporalmente hasta 10 asientos para una función durante 8 minutos',
        tags: ['Holds'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID de la función' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          required: ['seatIds'],
          properties: {
            seatIds: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              maxItems: 10,
              description: 'Lista de IDs de asientos a bloquear',
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              holdId: { type: 'string' },
              showtimeId: { type: 'string' },
              seatIds: { type: 'array', items: { type: 'string' } },
              expiresAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsedBody = CreateHoldRequestSchema.parse(request.body);
      const result = await holdSeatsUseCase.execute(request.params.id, parsedBody.seatIds);
      return reply.status(201).send(result);
    },
  );

  // DELETE /holds/:id
  app.delete<{
    Params: { id: string };
  }>(
    '/holds/:id',
    {
      schema: {
        description: 'Libera un bloqueo temporal de asientos antes de su expiración',
        tags: ['Holds'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID del hold' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      await releaseHoldUseCase.execute(request.params.id);
      return reply.status(200).send({ success: true });
    },
  );
}
