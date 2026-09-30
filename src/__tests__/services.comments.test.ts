import Comment from '../models/Comment';
import * as commentServices from '../services/commentServices';
import * as movieServices from '../services/movieServices';
import * as userServices from '../services/userServices';

jest.mock('../models/Comment', () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        countDocuments: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        findByIdAndDelete: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    }
}));

const mockedComment = Comment as unknown as {
    find: jest.Mock;
    countDocuments: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    findByIdAndDelete: jest.Mock;
    findByIdAndUpdate: jest.Mock;
}

jest.mock('../services/userServices', () => ({
    __esModule: true,
    canModifyComment: jest.fn(),
    getUser: jest.fn(),
}));

const mockedUserServices = userServices as unknown as {
    canModifyComment: jest.Mock;
    getUser: jest.Mock;
};

jest.mock('../services/movieServices', () => ({
    __esModule: true,
    getMovie: jest.fn(),
}));


const mockedMovieServices = movieServices as unknown as {
    getMovie: jest.Mock;
};

const mockCommentQuery = (comments: unknown[]) => ({
    skip: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(comments),
    }),
});

const commentTestData = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Jane Doe',
    email: 'jane@example.com',
    movie_id: '507f1f77bcf86cd799439012',
    text: 'This is a great movie!',
};

const newCommentData = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    movie_id: '507f1f77bcf86cd799439012',
    text: 'This is a great movie!',
};

const userTestData = {
    _id: '507f1f77bcf86cd799439056',
    name: 'Jane Doe',
    email: 'jane@example.com',
};

const movieTestData = {
    _id: '507f1f77bcf86cd799439012',
    title: 'Test Movie',
};


describe('commentServices', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('getComments', () => {
        it('returns all comments when no filters are provided', async () => {
            mockedComment.find.mockReturnValue(
                mockCommentQuery([commentTestData])
            );

            const result = await commentServices.getComments({}, 0, 1);

            expect(mockedComment.find).toHaveBeenCalledWith({});
            expect(result).toEqual([commentTestData]);
        });

        it('returns comments by user ID', async () => {
            mockedUserServices.getUser.mockResolvedValue(
                userTestData
            );

            mockedComment.find.mockReturnValue(
                mockCommentQuery([commentTestData])
            );

            const result = await commentServices.getComments({
                userId: userTestData._id,
            }, 0, 1);

            expect(mockedUserServices.getUser).toHaveBeenCalledWith(userTestData._id);

            expect(mockedComment.find).toHaveBeenCalledWith({
                email: userTestData.email,
            });

            expect(result).toEqual([commentTestData]);
        });

        it('throws when the requested user does not exist', async () => {
            mockedUserServices.getUser.mockResolvedValue(null);

            await expect(
                commentServices.getComments({
                    userId: userTestData._id,
                }, 0, 1)
            ).rejects.toThrow('User not found');

            expect(mockedComment.find).not.toHaveBeenCalled();
        });

        it('returns comments by movie ID', async () => {
            mockedMovieServices.getMovie.mockResolvedValue(
                movieTestData
            );

            mockedComment.find.mockReturnValue(
                mockCommentQuery([commentTestData])
            );

            const result = await commentServices.getComments({
                movieId: movieTestData._id,
            }, 0, 1);

            expect(
                mockedMovieServices.getMovie
            ).toHaveBeenCalledWith(movieTestData._id);

            expect(mockedComment.find).toHaveBeenCalledWith({
                movie_id: movieTestData._id,
            });

            expect(result).toEqual([commentTestData]);
        });

        it('throws when the requested movie does not exist', async () => {
            mockedMovieServices.getMovie.mockResolvedValue(null);

            await expect(
                commentServices.getComments({
                    movieId: movieTestData._id,
                }, 0, 1)
            ).rejects.toThrow('Movie not found');

            expect(mockedComment.find).not.toHaveBeenCalled();
        });

        it('returns comments by both user and movie', async () => {
            mockedUserServices.getUser.mockResolvedValue(
                userTestData
            );

            mockedMovieServices.getMovie.mockResolvedValue(
                movieTestData
            );

            mockedComment.find.mockReturnValue(
                mockCommentQuery([commentTestData])
            );

            const result = await commentServices.getComments({
                userId: userTestData._id,
                movieId: movieTestData._id,
            }, 0, 1);

            expect(mockedComment.find).toHaveBeenCalledWith({
                email: userTestData.email,
                movie_id: movieTestData._id,
            });

            expect(result).toEqual([commentTestData]);
        });

        it('returns an empty array when the filters match no comments', async () => {
            mockedMovieServices.getMovie.mockResolvedValue(
                movieTestData
            );

            mockedComment.find.mockReturnValue(mockCommentQuery([]));

            const result = await commentServices.getComments({
                movieId: movieTestData._id,
            }, 0, 1);

            expect(result).toEqual([]);
        });

        it('propagates database errors', async () => {
            mockedComment.find.mockReturnValue({
                skip: jest.fn().mockReturnValue({
                    limit: jest.fn().mockRejectedValue(
                        new Error('Database unavailable')
                    ),
                }),
            });

            await expect(
                commentServices.getComments({}, 0, 1)
            ).rejects.toThrow('Database unavailable');
        });
    });

    describe('getCommentById', () => {
        it('returns the comment when it exists', async () => {
            mockedComment.findById.mockResolvedValue(commentTestData);

            const result = await commentServices.getCommentById(
                commentTestData._id
            );

            expect(mockedComment.findById).toHaveBeenCalledWith(
                commentTestData._id
            );

            expect(result).toEqual(commentTestData);
        });

        it('throws when the requested comment does not exist', async () => {
            mockedComment.findById.mockResolvedValue(null);

            await expect(
                commentServices.getCommentById(commentTestData._id)
            ).rejects.toThrow('Comment not found');


            expect(mockedComment.findById).toHaveBeenCalledWith(
                commentTestData._id
            );
        });

        it('propagates database errors', async () => {
            mockedComment.findById.mockRejectedValue(
                new Error('Database unavailable')
            );

            await expect(
                commentServices.getCommentById(commentTestData._id)
            ).rejects.toThrow('Database unavailable');
        });
    });

    describe('createComment', () => {
        it('creates and returns a comment', async () => {
            mockedComment.create.mockResolvedValue(commentTestData);

            const result = await commentServices.createComment(newCommentData);

            expect(mockedComment.create).toHaveBeenCalledWith(newCommentData);
            expect(result).toEqual(commentTestData);
        });

        it('propagates database errors', async () => {
            mockedComment.create.mockRejectedValue(
                new Error('Database unavailable')
            );

            await expect(
                commentServices.createComment(newCommentData)
            ).rejects.toThrow('Database unavailable');
        });
    });

    describe('updateComment', () => {
        const updateData = { text: 'Updated comment text' };

        it('updates and returns the comment', async () => {
            const updatedComment = { ...commentTestData, ...updateData };
            mockedComment.findByIdAndUpdate.mockResolvedValue(updatedComment);

            const result = await commentServices.updateComment(
                commentTestData._id,
                updateData
            );

            expect(mockedComment.findByIdAndUpdate).toHaveBeenCalledWith(
                commentTestData._id,
                updateData,
                { new: true, runValidators: true }
            );
            expect(result).toEqual(updatedComment);
        });

        it('throws when the comment does not exist', async () => {
            mockedComment.findByIdAndUpdate.mockResolvedValue(null);

            await expect(
                commentServices.updateComment(commentTestData._id, updateData)
            ).rejects.toThrow('Comment not found');
        });

        it('propagates database errors', async () => {
            mockedComment.findByIdAndUpdate.mockRejectedValue(
                new Error('Database unavailable')
            );

            await expect(
                commentServices.updateComment(commentTestData._id, updateData)
            ).rejects.toThrow('Database unavailable');
        });
    });

    describe('getTotalComments', () => {
        it('returns the total number of comments when no filters are provided', async () => {
            mockedComment.countDocuments.mockResolvedValue(10);

            const result = await commentServices.getTotalComments({});

            expect(mockedComment.countDocuments).toHaveBeenCalledWith({});
            expect(result).toBe(10);
        });

        it('returns the total number of comments by user ID', async () => {
            mockedUserServices.getUser.mockResolvedValue(
                userTestData
            );

            mockedComment.countDocuments.mockResolvedValue(5);

            const result = await commentServices.getTotalComments({
                userId: userTestData._id,
            });

            expect(mockedUserServices.getUser).toHaveBeenCalledWith(
                userTestData._id
            );

            expect(mockedComment.countDocuments).toHaveBeenCalledWith({
                email: userTestData.email,
            });

            expect(result).toBe(5);
        });

        it('throws when the requested user does not exist', async () => {
            mockedUserServices.getUser.mockResolvedValue(null);

            await expect(
                commentServices.getTotalComments({
                    userId: userTestData._id,
                })
            ).rejects.toThrow('User not found');

            expect(mockedComment.countDocuments).not.toHaveBeenCalled();
        });

        it('returns the total number of comments by movie ID', async () => {
            mockedMovieServices.getMovie.mockResolvedValue(
                movieTestData
            );

            mockedComment.countDocuments.mockResolvedValue(7);

            const result = await commentServices.getTotalComments({
                movieId: movieTestData._id,
            });

            expect(
                mockedMovieServices.getMovie
            ).toHaveBeenCalledWith(movieTestData._id);

            expect(mockedComment.countDocuments).toHaveBeenCalledWith({
                movie_id: movieTestData._id,
            });

            expect(result).toBe(7);
        });

        it('throws when the requested movie does not exist', async () => {
            mockedMovieServices.getMovie.mockResolvedValue(null);

            await expect(
                commentServices.getTotalComments({
                    movieId: movieTestData._id,
                })
            ).rejects.toThrow('Movie not found');

            expect(mockedComment.countDocuments).not.toHaveBeenCalled();
        });

        it('returns the total number of comments by both user and movie', async () => {
            mockedUserServices.getUser.mockResolvedValue(
                userTestData
            );

            mockedMovieServices.getMovie.mockResolvedValue(
                movieTestData
            );

            mockedComment.countDocuments.mockResolvedValue(3);

            const result = await commentServices.getTotalComments({
                userId: userTestData._id,
                movieId: movieTestData._id,
            });

            expect(mockedComment.countDocuments).toHaveBeenCalledWith({
                email: userTestData.email,
                movie_id: movieTestData._id,
            });

            expect(result).toBe(3);
        });

        it('returns zero when the filters match no comments', async () => {
            mockedMovieServices.getMovie.mockResolvedValue(
                movieTestData
            );

            mockedComment.countDocuments.mockResolvedValue(0);

            const result = await commentServices.getTotalComments({
                movieId: movieTestData._id,
            });

            expect(result).toBe(0);
        });

        it('propagates database errors', async () => {
            mockedComment.countDocuments.mockRejectedValue(
                new Error('Database unavailable')
            );

            await expect(
                commentServices.getTotalComments({})
            ).rejects.toThrow('Database unavailable');
        });
    });



});