import Comment from '../models/Comment';
import { getUser } from './userServices';
import { getMovie } from './movieServices';

/**
 * Retrieves comments from the database.
 * @param userId Optional user ID to filter comments by user.
 * @param movieId Optional movie ID to filter comments by movie.
 * @returns Promise resolving to the list of all comments matching the provided ids.
 * @throws {Error} when the user or movie does not exist.
 */
export async function getComments({ userId, movieId }: { userId?: string; movieId?: string }) {
    // Implementation for retrieving comments based on filters
    const filter: any = {};

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
        filter.movie_id = movie._id;
    }

    return Comment.find(filter);
}

/**
 * gets a comment by its ID.
 * @param commentId The ID of the comment to retrieve.
 * @returns Promise resolving to the requested comment or null if not found.
 */
export async function getCommentById(commentId: string) {
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new Error('Comment not found');
    }
    return comment;
}