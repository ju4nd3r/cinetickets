import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../infrastructure/db.js';
import { PrismaMovieRepository } from '../../infrastructure/repositories/prisma-movie.repository.js';
import { SearchMoviesUseCase, GetMovieDetailUseCase } from '../../application/use-cases/movies.js';

export const movieRoutes: FastifyPluginAsync = async (fastify) => {
  const movieRepo = new PrismaMovieRepository(prisma);
  const searchMoviesUseCase = new SearchMoviesUseCase(movieRepo);
  const getMovieDetailUseCase = new GetMovieDetailUseCase(movieRepo);

  fastify.get<{
    Querystring: {
      search?: string;
      genre?: string;
      cinemaId?: string;
      format?: string;
    };
  }>(
    '/movies',
    {
      schema: {
        description: 'Obtener cartelera de películas con filtros opcionales',
        tags: ['Películas'],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Búsqueda por título, director o sinopsis' },
            genre: { type: 'string', description: 'Filtrar por género' },
            cinemaId: { type: 'string', description: 'Filtrar por cine' },
            format: {
              type: 'string',
              enum: ['2D', '3D', 'IMAX', 'VIP'],
              description: 'Filtrar por formato',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const movies = await searchMoviesUseCase.execute(request.query);
      return reply.send(movies);
    },
  );

  fastify.get<{
    Params: { id: string };
  }>(
    '/movies/:id',
    {
      schema: {
        description: 'Obtener detalle completo de una película',
        tags: ['Películas'],
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
      const movie = await getMovieDetailUseCase.execute(request.params.id);
      return reply.send(movie);
    },
  );
};
