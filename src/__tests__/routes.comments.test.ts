import express, { Express } from 'express';
import request from 'supertest';

import commentRouter from '../routes/commentRoutes';
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

describe('Comment routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/comments', () => {
        it('returns 200 with paginated comments', async () => {
            mockedCommentServices.getComments.mockResolvedValue({
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

            const response = await request(app)
                .get('/api/comments');

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
            ).toHaveBeenCalledWith({
                page: 1,
                limit: 20,
                movie_id: undefined,
                email: undefined,
            });
        });

        it('passes the movie filter to the service', async () => {
            mockedCommentServices.getComments.mockResolvedValue({
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

            const response = await request(app)
                .get('/api/comments')
                .query({
                    movie_id: commentTestData.movie_id,
                });

            expect(response.status).toBe(200);

            expect(
                mockedCommentServices.getComments
            ).toHaveBeenCalledWith({
                page: 1,
                limit: 20,
                movie_id: commentTestData.movie_id,
                email: undefined,
            });
        });

        it('passes the user filter to the service', async () => {
            mockedUserServices.getUserEmail.mockedResolvedValue(commentTestData.email);
            mockedCommentServices.getComments.mockResolvedValue({
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

            const response = await request(app)
                .get('/api/comments')
                .query({
                    userId: validId,
                });

            expect(response.status).toBe(200);

            expect(
                mockedCommentServices.getComments
            ).toHaveBeenCalledWith({
                page: 1,
                limit: 20,
                movie_id: undefined,
                email: commentTestData.email,
            });
        });

        it('returns 400 for an invalid query', async () => {
            const response = await request(app)
                .get('/api/comments')
                .query({
                    limit: 0,
                });

            expect(response.status).toBe(400);
            expect(
                mockedCommentServices.getComments
            ).not.toHaveBeenCalled();
        });

        it('returns 503 when the service throws a connect error', async () => {
            mockedCommentServices.getComments.mockRejectedValue(
                new Error('connect ECONNREFUSED')
            );

            const response = await request(app)
                .get('/api/comments');

            expect(response.status).toBe(503);
        });

        it('returns 500 when the service throws an unexpected error', async () => {
            mockedCommentServices.getComments.mockRejectedValue(
                new Error('Something unexpected happened')
            );

            const response = await request(app)
                .get('/api/comments');

            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/comments/:id', () => {
        it('returns 200 with the requested comment', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(
                commentTestData
            );

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

            expect(
                mockedCommentServices.getCommentById
            ).not.toHaveBeenCalled();
        });

        it('returns 404 when the comment does not exist', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(null);

            const response = await request(app)
                .get(`/api/comments/${commentTestData._id}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/comments', () => {
        it('returns 201 when a comment is created', async () => {
            mockedUserServices.verifySessionToken.mockResolvedValue({
                userId: '507f1f77bcf86cd799439013',
                email: commentTestData.email,
                session: {} as any,
            });

            mockedCommentServices.createComment.mockResolvedValue(
                commentTestData
            );

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    name: commentTestData.name,
                    email: commentTestData.email,
                    movie_id: commentTestData.movie_id,
                    text: commentTestData.text,
                });

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                message: 'Comment created successfully',
                comment: commentTestData,
            });

            expect(
                mockedCommentServices.createComment
            ).toHaveBeenCalled();
        });

        it('returns 400 when required fields are missing', async () => {
            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    text: commentTestData.text,
                });

            expect(response.status).toBe(400);

            expect(
                mockedCommentServices.createComment
            ).not.toHaveBeenCalled();
        });

        it('returns 400 when the authorization header is missing', async () => {
            const response = await request(app)
                .post('/api/comments')
                .send(commentTestData);

            expect(response.status).toBe(400);

            expect(
                mockedUserServices.verifySessionToken
            ).not.toHaveBeenCalled();
        });

        it('returns 401 when the authorization format is invalid', async () => {
            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Basic something')
                .send(commentTestData);

            expect(response.status).toBe(401);

            expect(
                mockedUserServices.verifySessionToken
            ).not.toHaveBeenCalled();
        });

        it('returns 401 when the token is invalid', async () => {
            mockedUserServices.verifySessionToken.mockRejectedValue(
                new Error('Invalid token')
            );

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', 'Bearer invalid-token')
                .send(commentTestData);

            expect(response.status).toBe(401);

            expect(
                mockedCommentServices.createComment
            ).not.toHaveBeenCalled();
        });
    });

    describe('PUT /api/comments/:id', () => {
        it('returns 200 when the comment owner updates their comment', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(
                commentTestData
            );

            mockedUserServices.canModifyComment.mockResolvedValue(true);

            const updatedComment = {
                ...commentTestData,
                text: 'Updated comment!',
            };

            mockedCommentServices.updateComment.mockResolvedValue(
                updatedComment
            );

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer owner-token')
                .send({
                    text: 'Updated comment!',
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedComment);

            expect(
                mockedUserServices.canModifyComment
            ).toHaveBeenCalledWith(
                'owner-token',
                commentTestData
            );

            expect(
                mockedCommentServices.updateComment
            ).toHaveBeenCalledWith(
                commentTestData._id,
                {
                    text: 'Updated comment!',
                }
            );
        });

        it('returns 200 when an admin updates another users comment', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(
                commentTestData
            );

            mockedUserServices.canModifyComment.mockResolvedValue(true);

            const updatedComment = {
                ...commentTestData,
                text: 'Updated by admin!',
            };

            mockedCommentServices.updateComment.mockResolvedValue(
                updatedComment
            );

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer admin-token')
                .send({
                    text: 'Updated by admin!',
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(updatedComment);

            expect(
                mockedUserServices.canModifyComment
            ).toHaveBeenCalledWith(
                'admin-token',
                commentTestData
            );
        });

        it('returns 403 when the user is neither the owner nor an admin', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(
                commentTestData
            );

            mockedUserServices.canModifyComment.mockRejectedValue(
                new Error('User is not authorized to modify this comment')
            );

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer other-user-token')
                .send({
                    text: 'I should not be able to do this',
                });

            expect(response.status).toBe(403);

            expect(
                mockedCommentServices.updateComment
            ).not.toHaveBeenCalled();
        });

        it('returns 400 for an invalid comment ID', async () => {
            const response = await request(app)
                .put('/api/comments/not-an-object-id')
                .set('Authorization', 'Bearer valid-token')
                .send({
                    text: 'Updated comment',
                });

            expect(response.status).toBe(400);

            expect(
                mockedCommentServices.getCommentById
            ).not.toHaveBeenCalled();

            expect(
                mockedUserServices.canModifyComment
            ).not.toHaveBeenCalled();
        });

        it('returns 404 when the comment does not exist', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(null);

            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer valid-token')
                .send({
                    text: 'Updated comment',
                });

            expect(response.status).toBe(404);

            expect(
                mockedUserServices.canModifyComment
            ).not.toHaveBeenCalled();
        });

        it('returns 400 when no valid fields are supplied', async () => {
            const response = await request(app)
                .put(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer valid-token')
                .send({});

            expect(response.status).toBe(400);

            expect(
                mockedCommentServices.updateComment
            ).not.toHaveBeenCalled();
        });
    });

    describe('DELETE /api/comments/:id', () => {
        it('returns 200 when the comment owner deletes their comment', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(
                commentTestData
            );

            mockedUserServices.canModifyComment.mockResolvedValue(true);

            mockedCommentServices.deleteComment.mockResolvedValue(
                commentTestData
            );

            const response = await request(app)
                .delete(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer owner-token');

            expect(response.status).toBe(200);

            expect(
                mockedUserServices.canModifyComment
            ).toHaveBeenCalledWith(
                'owner-token',
                commentTestData
            );

            expect(
                mockedCommentServices.deleteComment
            ).toHaveBeenCalledWith(commentTestData._id);
        });

        it('returns 200 when an admin deletes another users comment', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(
                commentTestData
            );

            mockedUserServices.canModifyComment.mockResolvedValue(true);

            mockedCommentServices.deleteComment.mockResolvedValue(
                commentTestData
            );

            const response = await request(app)
                .delete(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);

            expect(
                mockedUserServices.canModifyComment
            ).toHaveBeenCalledWith(
                'admin-token',
                commentTestData
            );
        });

        it('returns 403 when the user is neither the owner nor an admin', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(
                commentTestData
            );

            mockedUserServices.canModifyComment.mockRejectedValue(
                new Error('User is not authorized to modify this comment')
            );

            const response = await request(app)
                .delete(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer other-user-token');

            expect(response.status).toBe(403);

            expect(
                mockedCommentServices.deleteComment
            ).not.toHaveBeenCalled();
        });

        it('returns 404 when the comment does not exist', async () => {
            mockedCommentServices.getCommentById.mockResolvedValue(null);

            const response = await request(app)
                .delete(`/api/comments/${commentTestData._id}`)
                .set('Authorization', 'Bearer valid-token');

            expect(response.status).toBe(404);

            expect(
                mockedUserServices.canModifyComment
            ).not.toHaveBeenCalled();
        });
    });
});