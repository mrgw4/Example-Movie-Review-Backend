import { Router, Request, Response } from 'express';
import * as movieService from '../services/movieServices';
import mongoose from 'mongoose';
import { verifyAdmin } from '../services/userServices';
import { MovieSchema } from '../schemas/movieSchema';
import { movieQuerySchema } from '../schemas/movieQuerySchema';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/movies?page=1&limit=20
 * Returns paginated movies from the database.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = movieQuerySchema.parse(req.query);

    const skip = (query.page - 1) * query.limit;

    const [movies, total] = await Promise.all([
      movieService.getMoviesWithPagination(
        skip,
        query.limit,
        query
      ),
      movieService.getTotalMovieCount(query)
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return res.status(200).json({
      data: movies,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: totalPages,
        hasNextPage: query.page < totalPages,
        hasPrevPage: query.page > 1
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.issues
      });
    }

    if (error instanceof Error && error.message.includes('connect')) {
      return res.status(503).json({
        error: 'Database unavailable'
      });
    }

    console.error('Error fetching movies:', error);

    return res.status(500).json({
      error: 'Failed to fetch movies'
    });
  }
});

/**
 * GET /api/movies/:id
 * Returns a single movie by ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid movie id format' });
      return;
    }

    const movie = await movieService.getMovie(id);

    return res.status(200).json(movie);
  } catch (error) {
    if (error instanceof Error && error.message.includes('connect')) {
      return res.status(503).json({ error: 'Database unavailable' });
    } if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Movie not found' });
    } else {
      return res.status(500).json({ error: 'Failed to fetch movie' });
    }
  }
});

/**
 * POST /api/movies
 * Creates a new movie with validation for required fields.
 * Returns error message listing missing fields if validation fails.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const rawAuth = req.headers.authorization;

    if (rawAuth === undefined) {
      return res.status(400).json({
        error: 'Authorization token is required'
      });
    }

    const authHeader = String(rawAuth).trim();

    if (!/^Bearer\b/i.test(authHeader)) {
      return res.status(401).json({
        error: 'Invalid authorization format'
      });
    }

    const token = authHeader.replace(/^Bearer\b/i, '').trim();

    if (token.length === 0) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    await verifyAdmin(token);

    const result = MovieSchema.safeParse(req.body);

    if (!result.success) {
      const requiredFields = [
        'title',
        'type',
        'year',
        'num_mflix_comments',
        'lastupdated',
        'awards',
        'imdb',
      ];

      const missingFields = requiredFields.filter(
        (field) => req.body[field] === undefined || req.body[field] === null
      );

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required fields`,
          fields: missingFields,
        });
      }

      const invalidFields = result.error.issues.map(
        (issue) => issue.path.join('.')
      );

      return res.status(400).json({
        error: 'Invalid movie data',
        fields: invalidFields,
      });
    }

    await movieService.createMovie(req.body);
    return res.status(201).json({ message: 'Movie created successfully' });
  } catch (error) {
    if (error instanceof Error) {
      if (error instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({
          error: 'Invalid movie data',
          fields: Object.keys(error.errors),
        });
      } else if (error instanceof Error && (error.message === 'Invalid token' || error.message === 'Token expired')) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      } else if (error instanceof Error && error.message.includes('User is not an admin')) {
        return res.status(403).json({ error: 'User is not an admin' });
      } else if (error.message.includes('connect')) {
        return res.status(503).json({ error: 'Database unavailable' });
      }
    }
    return res.status(500).json({ error: 'Failed to create movie' });
  }
});

/**
 * DELETE /api/movies/:id
 * Deletes a movie by ID.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid movie id format' });
    }

    const rawAuth = req.headers.authorization;

    if (rawAuth === undefined) {
      return res.status(400).json({
        error: 'Authorization token is required'
      });
    }

    const authHeader = String(rawAuth).trim();

    if (!/^Bearer\b/i.test(authHeader)) {
      return res.status(401).json({
        error: 'Invalid authorization format'
      });
    }

    const token = authHeader.replace(/^Bearer\b/i, '').trim();

    if (token.length === 0) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    await verifyAdmin(token);

    const movie = await movieService.deleteMovie(id);

    return res.status(200).json({ message: 'Movie deleted successfully', movie });
  } catch (error) {
    if (error instanceof Error && error.message.includes('connect')) {
      return res.status(503).json({ error: 'Database unavailable' });
    } else if (error instanceof Error && (error.message === 'Invalid token' || error.message === 'Token expired')) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    } else if (error instanceof Error && error.message.includes('User is not an admin')) {
      return res.status(403).json({ error: 'User is not an admin' });
    } else if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Movie not found' });
    } else {
      return res.status(500).json({ error: 'Failed to delete movie' });
    }
  }
});

/**
 * PUT /api/movies/:id
 * Updates a movie by ID.
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const rawAuth = req.headers.authorization;

    if (rawAuth === undefined) {
      return res.status(400).json({
        error: 'Authorization token is required'
      });
    }

    const authHeader = String(rawAuth).trim();

    if (!/^Bearer\b/i.test(authHeader)) {
      return res.status(401).json({
        error: 'Invalid authorization format'
      });
    }

    const token = authHeader.replace(/^Bearer\b/i, '').trim();

    if (token.length === 0) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    await verifyAdmin(token);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid movie id format' });
    }

    const allowedFields = [
      'awards',
      'cast',
      'countries',
      'directors',
      'fullplot',
      'genres',
      'imdb',
      'languages',
      'lastupdated',
      'metacritic',
      'num_mflix_comments',
      'plot',
      'poster',
      'rated',
      'released',
      'runtime',
      'title',
      'tomatoes',
      'type',
      'writers',
      'year',
    ];

    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields provided for update',
      });
    }

    const movie = await movieService.updateMovie(id, updates);

    return res.status(200).json(movie);
  } catch (error) {
    if (error instanceof Error && error.message.includes('connect')) {
      return res.status(503).json({ error: 'Database unavailable' });
    } else if (error instanceof Error && (error.message === 'Invalid token' || error.message === 'Token expired')) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    } else if (error instanceof Error && error.message.includes('User is not an admin')) {
      return res.status(403).json({ error: 'User is not an admin' });
    } else if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Movie not found' });
    } else {
      return res.status(500).json({ error: 'Failed to update movie' });
    }
  }
});

export default router;
