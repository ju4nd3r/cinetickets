import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/http/server.js';

describe('API Server Initialization & Health Routes', () => {
  it('should initialize fastify app and register health route', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBeDefined();
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('services');
  });

  it('should respond on /api/v1/health', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBeDefined();
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('status');
  });
});
