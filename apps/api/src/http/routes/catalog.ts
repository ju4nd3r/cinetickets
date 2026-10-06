import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../infrastructure/db.js';
import { PrismaCatalogRepository } from '../../infrastructure/repositories/prisma-catalog.repository.js';

export const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  const catalogRepo = new PrismaCatalogRepository(prisma);

  fastify.get<{
    Querystring: { category?: string };
  }>(
    '/food',
    {
      schema: {
        description: 'Obtener catálogo de comida y bebidas con tamaños y precios',
        tags: ['Catálogo'],
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['combo', 'popcorn', 'drink', 'candy'] },
          },
        },
      },
    },
    async (request, reply) => {
      const items = await catalogRepo.getFoodItems(request.query.category);
      return reply.send(items);
    },
  );

  fastify.get(
    '/ticket-types',
    {
      schema: {
        description: 'Obtener tipos de entrada y sus porcentajes de descuento',
        tags: ['Catálogo'],
      },
    },
    async (_request, reply) => {
      const types = await catalogRepo.getTicketTypes();
      return reply.send(types);
    },
  );
};
