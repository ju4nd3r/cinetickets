import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/http/server.js';
import { prisma } from '../../src/infrastructure/db.js';
import { redis } from '../../src/infrastructure/redis.js';
import type { FastifyInstance } from 'fastify';

describe('Functional Health Check', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    if (redis.status === 'ready') {
      await redis.quit();
    }
  });

  it('GET /api/v1/health should respond with status ok when db and redis are up', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.services.database).toBe('up');
    expect(body.services.redis).toBe('up');
  });
});
