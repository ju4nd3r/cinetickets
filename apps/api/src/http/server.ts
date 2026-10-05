import fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { healthRoutes } from './routes/health.js';

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

  // Health and API routes under /api/v1 prefix
  await app.register(
    async (v1) => {
      await v1.register(healthRoutes);
    },
    { prefix: '/api/v1' },
  );

  return app;
}
