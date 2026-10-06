import { Movie } from '@cinetickets/shared';
import { MovieRepository } from '../ports/index.js';
import { NotFoundError } from '../../domain/errors.js';

export class SearchMoviesUseCase {
  constructor(private readonly movieRepo: MovieRepository) {}

  async execute(params: {
    search?: string;
    genre?: string;
    cinemaId?: string;
    format?: string;
  }): Promise<Movie[]> {
    return this.movieRepo.search(params);
  }
}

export class GetMovieDetailUseCase {
  constructor(private readonly movieRepo: MovieRepository) {}

  async execute(id: string): Promise<Movie> {
    const movie = await this.movieRepo.findById(id);
    if (!movie) {
      throw new NotFoundError('Película', id);
    }
    return movie;
  }
}
