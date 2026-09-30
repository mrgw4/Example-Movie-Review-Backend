import express, { Express } from 'express';
import request from 'supertest';

import commentRouter from '../routes/comments';
import * as commentServices from '../services/commentServices';
import * as userServices from '../services/userServices';


jest.mock('../services/commentServices');
jest.mock('../services/userServices');

const mockedCommentServices =
    commentServices as jest.Mocked<typeof commentServices>;
const mockedUserServices =
    userServices as jest.Mocked<typeof userServices>;

const app: Express = express();

app.use(express.json());
app.use('/api/comments', commentRouter);

const commentTestData = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Jane Doe',
    email: 'jane@example.com',
    movie_id: '507f1f77bcf86cd799439012',
    text: 'This is a great movie!',
};

const validId = '507f1f77bcf86cd799439011';
const authenticatedUser = {
    _id: '507f1f77bcf86cd799439013',
    name: 'Jane Doe',
    email: 'jane@example.com',
};

describe('Comment routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Get api/comments/', () => {
        it('returns 200 with paginated comments filtered by movie', async () => {
            mockedCommentServices.getComments.mockResolvedValue([commentTestData] as any);

            mockedCommentServices.getTotalComments.mockResolvedValue(1);

            const response = await request(app)
                .get('/api/comments')
                .query({
                    movieId: commentTestData.movie_id,
                });

            expect(response.status).toBe(200);

            expect(response.body).toEqual({
                data: [commentTestData],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    pages: 1,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            });

            expect(
                mockedCommentServices.getComments
            ).toHaveBeenCalledWith(
                {
                    userId: undefined,
                    movieId: commentTestData.movie_id,
                },
                20,
                0
            );

            expect(
                mockedCommentServices.getTotalComments
            ).toHaveBeenCalledWith({
                userId: undefined,
                movieId: commentTestData.movie_id,
            });
        });

        it('returns 200 with comments filtered by user', async () => {
            mockedCommentServices.getComments.mockResolvedValue(
                [commentTestData] as any
            );

            mockedCommentServices.getTotalComments.mockResolvedValue(1);

            const response = await request(app)
                .get('/api/comments')
                .query({
                    userId: validId,
                });

            expect(response.status).toBe(200);

            expect(
                mockedCommentServices.getComments
            ).toHaveBeenCalledWith(
                {
                    userId: validId,
                    movieId: undefined,
                },
                20,
                0
            );

            expect(
                mockedCommentServices.getTotalComments
            ).toHaveBeenCalledWith({
                userId: validId,
                movieId: undefined,
            });
        });

        it('passes both user and movie filters to the services', async () => {
            mockedCommentServices.getComments.mockResolvedValue([commentTestData] as any);

            mockedCommentServices.getTotalComments.mockResolvedValue(1);

            const response = await request(app)
                .get('/api/comments')
                .query({
                    userId: validId,
                    movieId: commentTestData.movie_id,
                });

            expect(response.status).toBe(200);

            expect(
                mockedCommentServices.getComments
            ).toHaveBeenCalledWith(
                {
                    userId: validId,
                    movieId: commentTestData.movie_id,
                },
                20,
                0
            );

            expect(
                mockedCommentServices.getTotalComments
            ).toHaveBeenCalledWith({
                userId: validId,
                movieId: commentTestData.movie_id,
            });
        });

        it('passes pagination values to the services', async () => {
            mockedCommentServices.getComments.mockResolvedValue([commentTestData] as any);

            mockedCommentServices.getTotalComments.mockResolvedValue(45);

            const response = await request(app)
                .get('/api/comments')
                .query({
                    movieId: commentTestData.movie_id,
                    page: 2,
                    limit: 20,
                });

            expect(response.status).toBe(200);

            expect(
                mockedCommentServices.getComments
            ).toHaveBeenCalledWith(
                {
                    userId: undefined,
                    movieId: commentTestData.movie_id,
                },
                20,
                20
            );

            expect(response.body.pagination).toEqual({
                page: 2,
                limit: 20,
                total: 45,
                pages: 3,
                hasNextPage: true,
                hasPrevPage: true,
            });
        });

        it('returns 400 when no filter is provided', async () => {
            const response = await request(app)
                .get('/api/comments');

            expect(response.status).toBe(400);

            expect(response.body).toEqual({
                error: 'UserId and/or MovieId filter is required.',
            });

            expect(
                mockedCommentServices.getComments
            ).not.toHaveBeenCalled();

            expect(
                mockedCommentServices.getTotalComments
            ).not.toHaveBeenCalled();
        });

        it('returns 400 for an invalid limit', async () => {
            const response = await request(app)
                .get('/api/comments')
                .query({
                    movieId: validId,
                    limit: 0,
                });

            expect(response.status).toBe(400);
            expect(
                mockedCommentServices.getComments
            ).not.toHaveBeenCalled();
        });

        it('returns 400 for an invalid user ID', async () => {
            const response = await request(app)
                .get('/api/comments')
                .query({
                    userId: 'not-an-object-id',
                });

            expect(response.status).toBe(400);

            expect(
                mockedCommentServices.getComments
            ).not.toHaveBeenCalled();
        });

        it('returns 400 for an invalid user ID', async () => {
            const response = await request(app)
                .get('/api/comments')
                .query({
                    movieId: 'not-an-object-id',
                });

            expect(response.status).toBe(400);

            expect(
                mockedCommentServices.getComments
            ).not.toHaveBeenCalled();
        });

        it('returns 400 when the requested user does not exist', async () => {
            mockedCommentServices.getComments.mockRejectedValue(
                new Error('User not found')
            );

            const response = await request(app)
                .get('/api/comments')
                .query({
                    userId: validId,
                });

            expect(response.status).toBe(400);

            expect(response.body).toEqual({
                error: 'User not found',
            });
        });

        it('returns 400 when the requested movie does not exist', async () => {
            mockedCommentServices.getComments.mockRejectedValue(
                new Error('Movie not found')
            );

            const response = await request(app)
                .get('/api/comments')
                .query({
                    movieId: validId,
                });

            expect(response.status).toBe(400);

            expect(response.body).toEqual({
                error: 'Movie not found',
            });
        });

        it('returns 503 when getComments throws a connect error', async () => {
            mockedCommentServices.getComments.mockRejectedValue(
                new Error('connect ECONNREFUSED')
            );

            const response = await request(app)
                .get('/api/comments')
                .query({
                    movieId: validId,
                });

            expect(response.status).toBe(503);
        });

        it('returns 503 when getTotalComments throws a connect error', async () => {
            mockedCommentServices.getComments.mockResolvedValue([commentTestData] as any);

            mockedCommentServices.getTotalComments.mockRejectedValue(
                new Error('connect ECONNREFUSED')
            );

            const response = await request(app)
                .get('/api/comments')
                .query({
                    movieId: validId,
                });

            expect(response.status).toBe(503);
        });

        it('returns 500 when the service throws an unexpected error', async () => {
            mockedCommentServices.getComments.mockRejectedValue(
                new Error('Something unexpected happened')
            );

            const response = await request(app)
                .get('/api/comments')
                .query({
                    movieId: validId,
                });

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/comments/:id', () => {
        it('returns 200 with the requested comment', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(commentTestData as any);

            const response = await request(app)
                .get(`/api/comments/${commentTestData._id}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(commentTestData);

            expect(
                mockedCommentServices.getCommentById
            ).toHaveBeenCalledWith(commentTestData._id);
        });

        it('returns 400 for an invalid comment ID', async () => {
            const response = await request(app)
                .get('/api/comments/not-an-object-id');

            expect(response.status).toBe(400);

            expect(response.body).toEqual({
                error: 'Invalid comment ID',
            });

            expect(
                mockedCommentServices.getCommentById
            ).not.toHaveBeenCalled();
        });

        it('returns 404 when the comment does not exist', async () => {
            mockedCommentServices.getCommentById.mockRejectedValue(
                new Error('Comment not found')
            );

            const response = await request(app)
                .get(`/api/comments/${commentTestData._id}`);

            expect(response.status).toBe(404);

            expect(response.body).toEqual({
                error: 'Comment not found',
            });

            expect(
                mockedCommentServices.getCommentById
            ).toHaveBeenCalledWith(commentTestData._id);
        });

        it('returns 503 when the service throws a connect error', async () => {
            mockedCommentServices.getCommentById.mockRejectedValue(
                new Error('connect ECONNREFUSED')
            );

            const response = await request(app)
                .get(`/api/comments/${commentTestData._id}`);

            expect(response.status).toBe(503);

            expect(response.body).toEqual({
                error: 'Database unavailable',
            });
        });

        it('returns 500 when the service throws an unexpected error', async () => {
            mockedCommentServices.getCommentById.mockRejectedValue(
                new Error('Something unexpected happened')
            );

            const response = await request(app)
                .get(`/api/comments/${commentTestData._id}`);

            expect(response.status).toBe(500);

            expect(response.body).toEqual({
                error: 'Failed to fetch comment',
            });
        });
    });
    describe('POST /api/comments', () => {
        beforeEach(() => {
            mockedUserServices.verifySessionToken.mockResolvedValue({
                userId: authenticatedUser._id,
                email: authenticatedUser.email,
                session: {} as any,
            });
            mockedUserServices.getUser.mockResolvedValue(authenticatedUser as any);
        });

        it('creates a comment using identity from the authenticated user', async () => {
            mockedCommentServices.createComment.mockResolvedValue(commentTestData as any);

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                message: 'Comment created successfully',
                comment: commentTestData,
            });
            expect(mockedUserServices.verifySessionToken).toHaveBeenCalledWith('valid-token');
            expect(mockedUserServices.getUser).toHaveBeenCalledWith(authenticatedUser._id);
            expect(mockedCommentServices.createComment).toHaveBeenCalledWith({
                name: authenticatedUser.name,
                email: authenticatedUser.email,
                movie_id: commentTestData.movie_id,
                text: commentTestData.text,
            });
        });

        it('returns 400 when required comment fields are missing', async () => {
            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer valid-token')
                .send({ text: commentTestData.text });

            expect(response.status).toBe(400);
            expect(mockedCommentServices.createComment).not.toHaveBeenCalled();
            expect(mockedUserServices.getUser).not.toHaveBeenCalled();
        });

        it('returns 400 when the movie ID is invalid', async () => {
            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    movie_id: 'not-an-object-id',
                    text: commentTestData.text,
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                error: 'Invalid comment data',
                details: ['Invalid movie ID'],
            });
            expect(mockedUserServices.getUser).not.toHaveBeenCalled();
            expect(mockedCommentServices.createComment).not.toHaveBeenCalled();
        });

        it('returns 400 when the request includes client-provided identity fields', async () => {
            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    name: 'Other Person',
                    email: 'other@example.com',
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(400);
            expect(mockedCommentServices.createComment).not.toHaveBeenCalled();
        });

        it('returns 400 when the authorization header is missing', async () => {
            const response = await request(app)
                .post('/api/comments')
                .send({
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(400);
            expect(mockedUserServices.verifySessionToken).not.toHaveBeenCalled();
        });

        it('returns 401 when the authorization format is invalid', async () => {
            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Basic something')
                .send({
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(401);
            expect(mockedUserServices.verifySessionToken).not.toHaveBeenCalled();
        });

        it('returns 401 when the Bearer authorization header has no token', async () => {
            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer ')
                .send({
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Invalid token' });
            expect(mockedUserServices.verifySessionToken).not.toHaveBeenCalled();
        });

        it('returns 401 when the session token is invalid', async () => {
            mockedUserServices.verifySessionToken.mockRejectedValue(new Error('Invalid token'));

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer invalid-token')
                .send({
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Invalid token' });
            expect(mockedCommentServices.createComment).not.toHaveBeenCalled();
        });

        it('returns 401 when the session has expired', async () => {
            mockedUserServices.verifySessionToken.mockRejectedValue(new Error('Token expired'));

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer expired-token')
                .send({
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Token expired' });
            expect(mockedCommentServices.createComment).not.toHaveBeenCalled();
        });

        it('returns 401 when JWT verification reports an expired token', async () => {
            mockedUserServices.verifySessionToken.mockRejectedValue(new Error('jwt expired'));

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer expired-token')
                .send({
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Token expired' });
            expect(mockedCommentServices.createComment).not.toHaveBeenCalled();
        });

        it('returns 404 when the authenticated user no longer exists', async () => {
            mockedUserServices.getUser.mockResolvedValue(null as any);

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: 'User not found' });
            expect(mockedCommentServices.createComment).not.toHaveBeenCalled();
        });

        it('returns the full comment schema validation messages when authenticated user data is invalid', async () => {
            mockedUserServices.getUser.mockResolvedValue({
                ...authenticatedUser,
                email: 'invalid-email',
            } as any);

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                error: 'Failed to create comment',
                details: ['Invalid email address'],
            });
            expect(mockedCommentServices.createComment).not.toHaveBeenCalled();
        });

        it('returns 503 when the database is unavailable', async () => {
            mockedUserServices.getUser.mockRejectedValue(new Error('connect ECONNREFUSED'));

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(503);
            expect(response.body).toEqual({ error: 'Database unavailable' });
        });

        it('returns 500 when comment creation fails unexpectedly', async () => {
            mockedCommentServices.createComment.mockRejectedValue(
                new Error('Unexpected create failure')
            );

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Failed to create comment' });
        });
    });

    describe('PUT /api/comments/:id', () => {
        it('returns 200 when the comment owner updates their comment', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(commentTestData as any);
            mockedUserServices.canEditComment.mockResolvedValue(true);

            const updatedComment = {
                ...commentTestData,
                text: 'Updated comment!',
            };

            mockedCommentServices.updateComment.mockResolvedValue(updatedComment as any);

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer owner-token')
                .send({
                    text: 'Updated comment!',
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedComment);
            expect(mockedUserServices.canEditComment).toHaveBeenCalledWith(
                'owner-token',
                commentTestData.email
            );
            expect(mockedCommentServices.updateComment).toHaveBeenCalledWith(
                commentTestData._id,
                { text: 'Updated comment!' }
            );
        });

        it('returns 200 when an admin updates another users comment', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(commentTestData as any);
            mockedUserServices.canEditComment.mockResolvedValue(true);

            const updatedComment = {
                ...commentTestData,
                text: 'Updated by admin!',
            };

            mockedCommentServices.updateComment.mockResolvedValue(updatedComment as any);

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer admin-token')
                .send({
                    text: 'Updated by admin!',
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedComment);

            expect(mockedUserServices.canEditComment).toHaveBeenCalledWith(
                'admin-token',
                commentTestData.email
            );
        });

        it('returns 403 when the user is neither the owner nor an admin', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(commentTestData as any);
            mockedUserServices.canEditComment.mockResolvedValue(false);

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer other-user-token')
                .send({
                    text: 'I should not be able to do this',
                });

            expect(response.status).toBe(403);

            expect(mockedCommentServices.updateComment).not.toHaveBeenCalled();
        });

        it('returns 400 for an invalid comment ID', async () => {
            const response = await request(app)
                .put('/api/comments/not-an-object-id')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    text: 'Updated comment',
                });

            expect(response.status).toBe(400);

            expect(mockedCommentServices.getCommentById).not.toHaveBeenCalled();
            expect(mockedUserServices.canEditComment).not.toHaveBeenCalled();
        });

        it('returns 400 when authorization is missing', async () => {
            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .send({ text: 'Updated comment' });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Authorization token is required' });
            expect(mockedCommentServices.getCommentById).not.toHaveBeenCalled();
        });

        it('returns 401 when the authorization format is invalid', async () => {
            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Basic token')
                .send({ text: 'Updated comment' });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Invalid authorization format' });
        });

        it('returns 401 when the Bearer token is empty', async () => {
            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer ')
                .send({ text: 'Updated comment' });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Invalid token' });
        });

        it('returns 400 when the update body has no valid fields', async () => {
            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer valid-token')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid comment data');
            expect(mockedCommentServices.getCommentById).not.toHaveBeenCalled();
        });

        it('returns 400 when the update text is invalid', async () => {
            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer valid-token')
                .send({ text: 12345 });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                error: 'Invalid comment data',
                details: ['Invalid input: expected string, received number'],
            });
            expect(mockedCommentServices.getCommentById).not.toHaveBeenCalled();
        });

        it('returns 404 when the requested comment does not exist', async () => {
            mockedCommentServices.getCommentById.mockRejectedValue(new Error('Comment not found'));

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer valid-token')
                .send({
                    text: 'Updated comment',
                });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: 'Comment not found' });
            expect(mockedUserServices.canEditComment).not.toHaveBeenCalled();
        });

        it('returns 401 when the session token is invalid', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(commentTestData as any);
            mockedUserServices.canEditComment.mockRejectedValue(new Error('Invalid token'));

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer invalid-token')
                .send({ text: 'Updated comment' });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Invalid token' });
            expect(mockedCommentServices.updateComment).not.toHaveBeenCalled();
        });

        it('returns 401 when the session has expired', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(commentTestData as any);
            mockedUserServices.canEditComment.mockRejectedValue(new Error('Token expired'));

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer expired-token')
                .send({ text: 'Updated comment' });

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Token expired' });
            expect(mockedCommentServices.updateComment).not.toHaveBeenCalled();
        });

        it('returns 503 when the database is unavailable', async () => {
            mockedCommentServices.getCommentById.mockRejectedValue(new Error('connect failed'));

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer valid-token')
                .send({ text: 'Updated comment' });

            expect(response.status).toBe(503);
            expect(response.body).toEqual({ error: 'Database unavailable' });
        });

        it('returns 404 if the comment is deleted before the update completes', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(commentTestData as any);
            mockedUserServices.canEditComment.mockResolvedValue(true);
            mockedCommentServices.updateComment.mockRejectedValue(new Error('Comment not found'));

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer owner-token')
                .send({ text: 'Updated comment' });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: 'Comment not found' });
        });

        it('returns 500 when updating the comment fails unexpectedly', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(commentTestData as any);
            mockedUserServices.canEditComment.mockResolvedValue(true);
            mockedCommentServices.updateComment.mockRejectedValue(new Error('Unexpected failure'));

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer owner-token')
                .send({ text: 'Updated comment' });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Failed to update comment' });
        });
    });

    //         describe('DELETE /api/comments/:id', () => {
    //             it('returns 200 when the comment owner deletes their comment', async () => {
    //                 mockedCommentServices.getCommentById.mockResolvedValue(
    //                     commentTestData
    //                 );

    //                 mockedUserServices.canModifyComment.mockResolvedValue(true);

    //                 mockedCommentServices.deleteComment.mockResolvedValue(
    //                     commentTestData
    //                 );

    //                 const response = await request(app)
    //                     .delete(`/api/comments/${commentTestData._id}`)
    //                     .set('Authorization', 'Bearer owner-token');

    //                 expect(response.status).toBe(200);

    //                 expect(
    //                     mockedUserServices.canModifyComment
    //                 ).toHaveBeenCalledWith(
    //                     'owner-token',
    //                     commentTestData
    //                 );

    //                 expect(
    //                     mockedCommentServices.deleteComment
    //                 ).toHaveBeenCalledWith(commentTestData._id);
    //             });

    //             it('returns 200 when an admin deletes another users comment', async () => {
    //                 mockedCommentServices.getCommentById.mockResolvedValue(
    //                     commentTestData
    //                 );

    //                 mockedUserServices.canModifyComment.mockResolvedValue(true);

    //                 mockedCommentServices.deleteComment.mockResolvedValue(
    //                     commentTestData
    //                 );

    //                 const response = await request(app)
    //                     .delete(`/api/comments/${commentTestData._id}`)
    //                     .set('Authorization', 'Bearer admin-token');

    //                 expect(response.status).toBe(200);

    //                 expect(
    //                     mockedUserServices.canModifyComment
    //                 ).toHaveBeenCalledWith(
    //                     'admin-token',
    //                     commentTestData
    //                 );
    //             });

    //             it('returns 403 when the user is neither the owner nor an admin', async () => {
    //                 mockedCommentServices.getCommentById.mockResolvedValue(
    //                     commentTestData
    //                 );

    //                 mockedUserServices.canModifyComment.mockRejectedValue(
    //                     new Error('User is not authorized to modify this comment')
    //                 );

    //                 const response = await request(app)
    //                     .delete(`/api/comments/${commentTestData._id}`)
    //                     .set('Authorization', 'Bearer other-user-token');

    //                 expect(response.status).toBe(403);

    //                 expect(
    //                     mockedCommentServices.deleteComment
    //                 ).not.toHaveBeenCalled();
    //             });

    //             it('returns 404 when the comment does not exist', async () => {
    //                 mockedCommentServices.getCommentById.mockResolvedValue(null);

    //                 const response = await request(app)
    //                     .delete(`/api/comments/${commentTestData._id}`)
    //                     .set('Authorization', 'Bearer valid-token');

    //                 expect(response.status).toBe(404);

    //                 expect(
    //                     mockedUserServices.canModifyComment
    //                 ).not.toHaveBeenCalled();
    //             });
    //         });
});