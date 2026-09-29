import { Router, Request, Response } from 'express';
import * as comment from '../services/commentServices';
import { commentQuerySchema } from '../schemas/commentSchema';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/comments?userId&movieId&page=1&limit=20
 * Returns paginated comments from the database.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = commentQuerySchema.parse(req.query);

    if (!query.movieId && !query.userId) {
      return res.status(400).json({
        error: 'UserId and/or MovieId filter is required.'
      });
    }

    const skip = (query.page - 1) * query.limit;

    const comments = await comment.getComments({ userId: query.userId, movieId: query.movieId }, query.limit, skip);

    const total = await comment.getTotalComments({ userId: query.userId, movieId: query.movieId });

    const totalPages = Math.ceil(total / query.limit);

    return res.status(200).json({
      data: comments,
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
        details: error.issues.map(issue => issue.message)
      });
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(400).json({
        error: error.message
      })
    }

    if (error instanceof Error && error.message.includes('connect')) {
      return res.status(503).json({
        error: 'Database unavailable'
      });
    }

    return res.status(500).json({
      error: 'Failed to fetch comments'
    });
  }
});

export default router;
