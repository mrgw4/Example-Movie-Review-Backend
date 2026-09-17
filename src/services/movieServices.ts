import Movie from '../models/Movie';
import { MovieQuery } from '../schemas/movieQuerySchema';
import { buildMovieFilter, buildMovieSort } from './queries/movieQuery';

/**
 * Retrieves all movies from the database.
 * @returns Promise resolving to the list of all movies.
 */
export async function getAllMovies() {
  return Movie.find().sort({ title: 1 });
}

/**
 * Retrieves paginated movies from the database with essential fields.
 * @param skip Number of documents to skip.
 * @param limit Number of documents to return.
 * @returns Promise resolving to the list of paginated movies.
 */
export async function getMoviesWithPagination(
  skip: number,
  limit: number,
  query: MovieQuery
) {
  const filter = buildMovieFilter(query);
  const sort = buildMovieSort(query);

  return Movie.find(filter)
    .select('title year type poster imdb.rating num_mflix_comments')
    .skip(skip)
    .limit(limit)
    .sort(sort);
}

/**
 * Retrieves the total count of movies matching the query filters.
 * @param query Validated movie query parameters.
 * @returns Promise resolving to the number of matching movies.
 */
export async function getTotalMovieCount(query: MovieQuery) {
  const filter = buildMovieFilter(query);

  return Movie.countDocuments(filter);
}

/**
 * Retrieves a single movie by its ID.
 * @param id The movie's ID.
 * @returns Promise resolving to the movie document or null if not found.
 */
export async function getMovie(id: string) {
  const movie = await Movie.findById(id);
  if (!movie) {
    throw new Error(`Movie not found`);
  }
  return movie;
}

/**
 * Creates a new movie.
 * @param movieData The validated movie data.
 * @returns Promise resolving to the created movie document.
 */
export async function createMovie(movieData: any) {
  return Movie.create(movieData);
}

/**
 * Deletes a movie by its ID.
 * @param id The movie's ID.
 * @returns Promise resolving to the deleted movie document or null if not found.
 */
export async function deleteMovie(id: string) {
  const movie = await Movie.findByIdAndDelete(id);
  if (!movie) {
    throw new Error(`Movie not found`);
  }
  return movie;
}

/**
 * Updates a movie by its ID.
 * @param id The movie's ID.
 * @param updateData The fields to update.
 * @returns Promise resolving to the updated movie document or null if not found.
 */
export async function updateMovie(id: string, updateData: any) {
  const movie = await Movie.findByIdAndUpdate(id, updateData, { new: true });
  if (!movie) {
    throw new Error(`Movie not found`);
  }
  return movie;
}