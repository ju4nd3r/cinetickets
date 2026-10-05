import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../infrastructure/db.js';
import { redis } from '../../infrastructure/redis.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const checkHealth = async () => {
    let dbStatus: 'up' | 'down' = 'down';
    let redisStatus: 'up' | 'down' = 'down';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    try {
      if (redis.status !== 'ready' && redis.status !== 'connecting') {
        await redis.connect();
      }
      const ping = await redis.ping();
      if (ping === 'PONG') {
        redisStatus = 'up';
      }
    } catch {
      redisStatus = 'down';
    }

    const isOk = dbStatus === 'up' && redisStatus === 'up';
    const isDegraded = !isOk && (dbStatus === 'up' || redisStatus === 'up');
    const status = isOk ? 'ok' : isDegraded ? 'degraded' : 'error';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  };

  fastify.get('/health', async (_request, reply) => {
    const health = await checkHealth();
    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;
    return reply.status(statusCode).send(health);
  });
};
