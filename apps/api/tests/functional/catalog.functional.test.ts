import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/http/server.js';
import { prisma } from '../../src/infrastructure/db.js';
import { redis } from '../../src/infrastructure/redis.js';
import { runSeed } from '../../prisma/seed.js';
import type { FastifyInstance } from 'fastify';

describe('Functional: Catalog & Movies API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Asegurar que la base de datos contenga los datos del seed
    await runSeed();
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    if (redis.status === 'ready') {
      await redis.quit();
    }
  });

  // Prueba Funcional 1: GET /movies devuelve >=12 películas completas y los filtros funcionan
  it('Prueba 1: GET /api/v1/movies devuelve al menos 12 películas completas y los filtros funcionan', async () => {
    const resAll = await app.inject({
      method: 'GET',
      url: '/api/v1/movies',
    });

    expect(resAll.statusCode).toBe(200);
    const movies = JSON.parse(resAll.payload);
    expect(movies.length).toBeGreaterThanOrEqual(12);

    // Verificar estructura completa de una película
    const firstMovie = movies[0];
    expect(firstMovie).toHaveProperty('id');
    expect(firstMovie).toHaveProperty('title');
    expect(firstMovie).toHaveProperty('director');
    expect(firstMovie).toHaveProperty('cast');
    expect(firstMovie).toHaveProperty('synopsis');
    expect(firstMovie).toHaveProperty('genres');
    expect(firstMovie).toHaveProperty('durationMin');
    expect(firstMovie).toHaveProperty('rating');
    expect(firstMovie).toHaveProperty('language');
    expect(firstMovie).toHaveProperty('subtitles');
    expect(firstMovie).toHaveProperty('releaseDate');
    expect(firstMovie).toHaveProperty('posterUrl');
    expect(firstMovie).toHaveProperty('score');
    expect(firstMovie).toHaveProperty('country');
    expect(firstMovie).toHaveProperty('year');

    // Probar filtro por búsqueda
    const resSearch = await app.inject({
      method: 'GET',
      url: '/api/v1/movies?search=Sombras',
    });
    expect(resSearch.statusCode).toBe(200);
    const searchResults = JSON.parse(resSearch.payload);
    expect(searchResults.length).toBeGreaterThanOrEqual(1);
    expect(searchResults[0].title).toContain('Sombras');

    // Probar filtro por género
    const resGenre = await app.inject({
      method: 'GET',
      url: '/api/v1/movies?genre=Animación',
    });
    expect(resGenre.statusCode).toBe(200);
    const genreResults = JSON.parse(resGenre.payload);
    expect(genreResults.length).toBeGreaterThanOrEqual(1);
    expect(genreResults[0].genres).toContain('Animación');
  });

  it('GET /api/v1/movies/:id devuelve el detalle de la película', async () => {
    const resAll = await app.inject({ method: 'GET', url: '/api/v1/movies' });
    const movies = JSON.parse(resAll.payload);
    const target = movies[0];

    const resDetail = await app.inject({
      method: 'GET',
      url: `/api/v1/movies/${target.id}`,
    });
    expect(resDetail.statusCode).toBe(200);
    const detail = JSON.parse(resDetail.payload);
    expect(detail.id).toBe(target.id);
    expect(detail.title).toBe(target.title);
  });

  // Prueba Funcional 2: GET /movies/:id/showtimes devuelve funciones agrupadas por cine con precios
  it('Prueba 2: GET /api/v1/movies/:id/showtimes devuelve funciones agrupadas por cine con precios', async () => {
    const resAll = await app.inject({ method: 'GET', url: '/api/v1/movies' });
    const movies = JSON.parse(resAll.payload);
    const targetMovie = movies[0];

    const resShowtimes = await app.inject({
      method: 'GET',
      url: `/api/v1/movies/${targetMovie.id}/showtimes?date=2026-10-06`,
    });

    expect(resShowtimes.statusCode).toBe(200);
    const cinemaGroups = JSON.parse(resShowtimes.payload);
    expect(cinemaGroups.length).toBeGreaterThanOrEqual(1);

    const firstGroup = cinemaGroups[0];
    expect(firstGroup).toHaveProperty('cinema');
    expect(firstGroup.cinema).toHaveProperty('name');
    expect(firstGroup.cinema).toHaveProperty('city');
    expect(firstGroup).toHaveProperty('showtimes');
    expect(firstGroup.showtimes.length).toBeGreaterThanOrEqual(1);

    const showtime = firstGroup.showtimes[0];
    expect(showtime).toHaveProperty('priceStandardCents');
    expect(showtime).toHaveProperty('priceVipCents');
    expect(showtime).toHaveProperty('priceAccessibleCents');
    expect(typeof showtime.priceStandardCents).toBe('number');
    expect(showtime.priceStandardCents).toBeGreaterThan(0);
  });

  // Prueba Funcional 3: GET /showtimes/:id/seats refleja la ocupación del seed
  it('Prueba 3: GET /api/v1/showtimes/:id/seats refleja el mapa de sala y la ocupación del seed', async () => {
    // Buscar una función que tenga asientos ocupados
    const showtimeWithOccupancy = await prisma.orderSeat.findFirst({
      select: { showtimeId: true },
    });
    expect(showtimeWithOccupancy).not.toBeNull();
    const showtimeId = showtimeWithOccupancy!.showtimeId;

    const resSeats = await app.inject({
      method: 'GET',
      url: `/api/v1/showtimes/${showtimeId}/seats`,
    });

    expect(resSeats.statusCode).toBe(200);
    const seatMap = JSON.parse(resSeats.payload);
    expect(seatMap).toHaveProperty('hall');
    expect(seatMap).toHaveProperty('showtime');
    expect(seatMap).toHaveProperty('seats');
    expect(seatMap.seats.length).toBeGreaterThan(0);

    // Debe contener asientos disponibles y asientos ocupados
    const occupiedSeats = seatMap.seats.filter((s: { status: string }) => s.status === 'occupied');
    const availableSeats = seatMap.seats.filter(
      (s: { status: string }) => s.status === 'available',
    );

    expect(occupiedSeats.length).toBeGreaterThan(0);
    expect(availableSeats.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/food y GET /api/v1/ticket-types devuelven catálogos completos', async () => {
    const resFood = await app.inject({ method: 'GET', url: '/api/v1/food' });
    expect(resFood.statusCode).toBe(200);
    const food = JSON.parse(resFood.payload);
    expect(food.length).toBeGreaterThanOrEqual(15);

    const resTickets = await app.inject({ method: 'GET', url: '/api/v1/ticket-types' });
    expect(resTickets.statusCode).toBe(200);
    const tickets = JSON.parse(resTickets.payload);
    expect(tickets.length).toBe(4);
  });
});
