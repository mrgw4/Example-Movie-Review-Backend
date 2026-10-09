import { Router, Request, Response } from 'express';
import * as comment from '../services/commentServices';
import { commentInputSchema, commentQuerySchema, commentSchema, commentUpdateSchema } from '../schemas/commentSchema';
import * as user from '../services/userServices';
import { z } from 'zod';
import mongoose from 'mongoose';

const router = Router();

/**
 * Converts a comment document to a public format by removing sensitive information.
 * @param commentDocument A comment document from the database.
 * @returns A public representation of the comment.
 */
function toPublicComment(commentDocument: unknown): Record<string, unknown> {
  const comment = commentDocument as Record<string, unknown> & {
    toObject?: () => Record<string, unknown>;
  };
  const result = typeof comment.toObject === 'function'
    ? comment.toObject()
    : { ...comment };

  delete result.email;
  return result;
}

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
      data: comments.map(toPublicComment),
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

/**
 * GET /api/comments/:id
 * Returns a single comment by ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    const requestedComment = await comment.getCommentById(id);

    return res.status(200).json(toPublicComment(requestedComment));
  } catch (error) {
    if (error instanceof Error && error.message.includes('connect')) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    return res.status(500).json({ error: 'Failed to fetch comment' });
  }
});

/**
 * POST /api/comments
 * Creates a comment for the authenticated user.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const rawAuth = req.headers.authorization;

    if (rawAuth === undefined) {
      return res.status(401).json({ error: 'Authorization token is required' });
    }

    const authHeader = String(rawAuth).trim();

    if (!/^Bearer\b/i.test(authHeader)) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }

    const token = authHeader.replace(/^Bearer\b/i, '').trim();

    if (token.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { userId } = await user.verifySessionToken(token);
    const result = commentInputSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid comment data',
        details: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const authenticatedUser = await user.getUser(userId);

    if (!authenticatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validatedComment = commentSchema.safeParse({
      name: authenticatedUser.name,
      email: authenticatedUser.email,
      movie_id: result.data.movie_id,
      text: result.data.text
    });

    if (!validatedComment.success) {
      return res.status(500).json({
        error: 'Failed to create comment',
        details: validatedComment.error.issues.map(issue => issue.message)
      });
    }

    const createdComment = await comment.createComment(validatedComment.data);

    return res.status(201).json({
      message: 'Comment created successfully',
      comment: createdComment
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Token expired' || error.message === 'jwt expired')) {
      return res.status(401).json({ error: 'Token expired' });
    }

    if (error instanceof Error && (error.message === 'Invalid token' || error.message.includes('jwt'))) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (error instanceof Error && error.message === 'Movie not found') {
      return res.status(404).json({ error: 'Movie not found' });
    }

    if (error instanceof Error && error.message.includes('connect')) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    return res.status(500).json({ error: 'Failed to create comment' });
  }
});

/**
 * PUT /api/comments/:id
 * Updates a comment when the requester is its author or an admin.
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    const rawAuth = req.headers.authorization;

    if (rawAuth === undefined) {
      return res.status(401).json({ error: 'Authorization token is required' });
    }

    const authHeader = String(rawAuth).trim();

    if (!/^Bearer\b/i.test(authHeader)) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }

    const token = authHeader.replace(/^Bearer\b/i, '').trim();

    if (token.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const result = commentUpdateSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid comment data',
        details: result.error.issues.map(issue => issue.message)
      });
    }

    const existingComment = await comment.getCommentById(id);
    const canEdit = await user.canEditComment(token, existingComment.email);

    if (!canEdit) {
      return res.status(403).json({ error: 'User is not authorized to edit this comment' });
    }

    const updatedComment = await comment.updateComment(id, result.data);

    return res.status(200).json(updatedComment);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Token expired' || error.message === 'jwt expired')) {
      return res.status(401).json({ error: 'Token expired' });
    }

    if (error instanceof Error && (error.message === 'Invalid token' || error.message.includes('jwt'))) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (error instanceof Error && error.message.includes('connect')) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    return res.status(500).json({ error: 'Failed to update comment' });
  }
});

/**
 * DELETE /api/comments/:id
 * Deletes a comment when the requester is its author or an admin.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    const rawAuth = req.headers.authorization;

    if (rawAuth === undefined) {
      return res.status(401).json({ error: 'Authorization token is required' });
    }

    const authHeader = String(rawAuth).trim();

    if (!/^Bearer\b/i.test(authHeader)) {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }

    const token = authHeader.replace(/^Bearer\b/i, '').trim();

    if (token.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const existingComment = await comment.getCommentById(id);
    const canEdit = await user.canEditComment(token, existingComment.email);

    if (!canEdit) {
      return res.status(403).json({ error: 'User is not authorized to delete this comment' });
    }

    const deletedComment = await comment.deleteComment(id);

    return res.status(200).json({
      message: 'Comment deleted successfully',
      comment: deletedComment
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Token expired' || error.message === 'jwt expired')) {
      return res.status(401).json({ error: 'Token expired' });
    }

    if (error instanceof Error && (error.message === 'Invalid token' || error.message.includes('jwt'))) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (error instanceof Error && error.message.includes('connect')) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    return res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
