import 'dotenv/config';
import { buildApp } from './http/server.js';

const port = Number(process.env.API_PORT) || 3000;
const host = '0.0.0.0';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port, host });
    console.log(`Server listening on http://${host}:${port}`);
    console.log(`OpenAPI documentation available on http://${host}:${port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
