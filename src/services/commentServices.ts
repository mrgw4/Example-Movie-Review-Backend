import Comment from '../models/Comment';
import { getUser } from './userServices';
import { getMovie } from './movieServices';

/**
 * Builds a MongoDB filter for comments based on optional user and movie IDs.
 * @param userId Optional user ID to filter comments by user.
 * @param movieId Optional movie ID to filter comments by movie.
 * @returns Promise resolving to a MongoDB comment filter.
 * @throws {Error} when the specified user or movie does not exist.
 */
async function buildCommentFilter(
    { userId, movieId, }: { userId?: string; movieId?: string; }) {
    const filter: Record<string, unknown> = {};

    if (userId) {
        const user = await getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }
        filter.email = user.email;
    }

    if (movieId) {
        const movie = await getMovie(movieId);
        if (!movie) {
            throw new Error('Movie not found');
        }
        filter.movie_id = movieId;
    }

    return filter;
}

/**
 * Retrieves comments from the database.
 * @param userId Optional user ID to filter comments by user.
 * @param movieId Optional movie ID to filter comments by movie.
 * @param skip Number of documents to skip.
 * @param limit Number of documents to return.
 * @returns Promise resolving to the list of all comments matching the provided ids.
 * @throws {Error} when the user or movie does not exist.
 */
export async function getComments(
    { userId, movieId }: { userId?: string; movieId?: string },
    skip: number,
    limit: number
) {
    const filter = await buildCommentFilter({ userId, movieId });

    return Comment.find(filter).skip(skip).limit(limit);
}


/**
 * Retrieves comments from the database matching the provided filters.
 * @param userId Optional user ID to filter comments by user.
 * @param movieId Optional movie ID to filter comments by movie.
 * @param skip Number of documents to skip.
 * @param limit Number of documents to return.
 * @returns Promise resolving to the comments matching the provided filters.
 * @throws {Error} when the specified user or movie does not exist.
 */
export async function getTotalComments(
    { userId, movieId, }: { userId?: string; movieId?: string; }) {
    const filter = await buildCommentFilter({ userId, movieId });

    return Comment.countDocuments(filter);
}

/**
 * Gets a comment by its ID.
 * @param commentId The ID of the comment to retrieve.
 * @returns Promise resolving to the requested comment.
 * @throws {Error} when the comment does not exist.
 */
export async function getCommentById(commentId: string) {
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new Error('Comment not found');
    }
    return comment;
}