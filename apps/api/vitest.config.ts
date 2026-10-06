import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/domain/**/*.ts', 'src/application/use-cases/**/*.ts'],
      exclude: ['src/application/ports/**', '**/*.d.ts'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ||
        'postgresql://test_user:test_password@localhost:5433/test_cinetickets_db?schema=public',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6380',
    },
  },
});
