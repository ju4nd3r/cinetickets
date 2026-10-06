import fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { healthRoutes } from './routes/health.js';
import { movieRoutes } from './routes/movies.js';
import { showtimeRoutes } from './routes/showtimes.js';
import { catalogRoutes } from './routes/catalog.js';
import { holdRoutes } from './routes/holds.js';
import { orderRoutes } from './routes/orders.js';
import { DomainError } from '../domain/errors.js';
import { ZodError } from 'zod';

export async function buildApp() {
  const app = fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  await app.register(cors, {
    origin: '*',
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'CineTickets API',
        description: 'API backend para la compra de tickets de cine de CineTickets',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Servidor Local',
        },
      ],
      tags: [
        { name: 'Películas', description: 'Cartelera y detalles' },
        { name: 'Funciones', description: 'Horarios, cines y salas' },
        { name: 'Holds', description: 'Bloqueo temporal de asientos' },
        { name: 'Órdenes', description: 'Creación y gestión de órdenes' },
        { name: 'Pagos', description: 'Pasarela de pagos' },
        { name: 'Catálogo', description: 'Snacks y tipos de entrada' },
        { name: 'Salud', description: 'Verificación del estado del servicio' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0]?.message || 'Error de validación en la petición',
          details: error.flatten(),
        },
      });
    }

    if (error instanceof DomainError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    app.log.error(error);
    const statusCode = error.statusCode || 500;
    const errorCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'string'
        ? (error as { code: string }).code
        : 'INTERNAL_ERROR';

    return reply.status(statusCode).send({
      error: {
        code: errorCode,
        message: error.message || 'Ha ocurrido un error interno',
      },
    });
  });

  // Health route directly
  await app.register(healthRoutes);

  // All API routes under /api/v1 prefix
  await app.register(
    async (v1) => {
      await v1.register(healthRoutes);
      await v1.register(movieRoutes);
      await v1.register(showtimeRoutes);
      await v1.register(catalogRoutes);
      await v1.register(holdRoutes);
      await v1.register(orderRoutes);
    },
    { prefix: '/api/v1' },
  );

  return app;
}
