import { PrismaClient, HallFormat } from '@prisma/client';
import { MovieRepository } from '../../application/ports/index.js';
import { Movie } from '@cinetickets/shared';

export class PrismaMovieRepository implements MovieRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Movie | null> {
    const m = await this.prisma.movie.findUnique({
      where: { id },
    });
    if (!m) return null;
    return this.mapToDomain(m);
  }

  async search(params: {
    search?: string;
    genre?: string;
    cinemaId?: string;
    format?: string;
  }): Promise<Movie[]> {
    const whereClause: Record<string, unknown> = {};

    if (params.search) {
      whereClause.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { director: { contains: params.search, mode: 'insensitive' } },
        { synopsis: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.genre) {
      whereClause.genres = {
        has: params.genre,
      };
    }

    if (params.cinemaId || params.format) {
      const showtimeFilter: Record<string, unknown> = {};
      if (params.cinemaId) {
        showtimeFilter.hall = { cinemaId: params.cinemaId };
      }
      if (params.format) {
        const formatMap: Record<string, HallFormat> = {
          '2D': HallFormat.TWO_D,
          '3D': HallFormat.THREE_D,
          IMAX: HallFormat.IMAX,
          VIP: HallFormat.VIP,
        };
        const mappedFormat = formatMap[params.format];
        if (mappedFormat) {
          showtimeFilter.format = mappedFormat;
        }
      }
      whereClause.showtimes = {
        some: showtimeFilter,
      };
    }

    const movies = await this.prisma.movie.findMany({
      where: whereClause,
      orderBy: { releaseDate: 'desc' },
    });

    return movies.map((m) => this.mapToDomain(m));
  }

  private mapToDomain(m: {
    id: string;
    title: string;
    originalTitle: string | null;
    director: string;
    cast: string[];
    synopsis: string;
    genres: string[];
    durationMin: number;
    rating: string;
    language: string;
    subtitles: string[];
    releaseDate: Date;
    posterUrl: string;
    trailerUrl: string | null;
    score: number;
    country: string;
    year: number;
  }): Movie {
    return {
      id: m.id,
      title: m.title,
      originalTitle: m.originalTitle || undefined,
      director: m.director,
      cast: m.cast,
      synopsis: m.synopsis,
      genres: m.genres,
      durationMin: m.durationMin,
      rating: m.rating,
      language: m.language,
      subtitles: m.subtitles,
      releaseDate: m.releaseDate.toISOString().slice(0, 10),
      posterUrl: m.posterUrl,
      trailerUrl: m.trailerUrl || undefined,
      score: m.score,
      country: m.country,
      year: m.year,
    };
  }
}
