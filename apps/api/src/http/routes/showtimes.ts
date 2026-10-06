import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../infrastructure/db.js';
import { redis } from '../../infrastructure/redis.js';
import { PrismaShowtimeRepository } from '../../infrastructure/repositories/prisma-showtime.repository.js';
import { RedisSeatHoldStore } from '../../infrastructure/redis-seat-hold.store.js';
import { GetShowtimesUseCase, GetSeatMapUseCase } from '../../application/use-cases/showtimes.js';

export const showtimeRoutes: FastifyPluginAsync = async (fastify) => {
  const showtimeRepo = new PrismaShowtimeRepository(prisma);
  const seatHoldStore = new RedisSeatHoldStore(redis);
  const getShowtimesUseCase = new GetShowtimesUseCase(showtimeRepo);
  const getSeatMapUseCase = new GetSeatMapUseCase(showtimeRepo, seatHoldStore);

  fastify.get<{
    Params: { id: string };
    Querystring: { date?: string };
  }>(
    '/movies/:id/showtimes',
    {
      schema: {
        description: 'Obtener funciones de una película agrupadas por cine con precios',
        tags: ['Funciones'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
          },
        },
      },
    },
    async (request, reply) => {
      const dateStr = request.query.date || new Date().toISOString().slice(0, 10);
      const groups = await getShowtimesUseCase.execute(request.params.id, dateStr);
      return reply.send(groups);
    },
  );

  fastify.get<{
    Params: { id: string };
  }>(
    '/showtimes/:id/seats',
    {
      schema: {
        description: 'Obtener mapa de sala de una función con el estado real de cada asiento',
        tags: ['Funciones'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const seatMap = await getSeatMapUseCase.execute(request.params.id);
      return reply.send(seatMap);
    },
  );
};
