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

const commentTestData = {
    _id: '507f1f77bcf86cd799439011',
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
            mockedComment.find.mockResolvedValue([
                commentTestData,
            ]);

            const result = await commentServices.getComments({});

            expect(mockedComment.find).toHaveBeenCalledWith({});
            expect(result).toEqual([commentTestData]);
        });

        it('returns comments by user ID', async () => {
            mockedUserServices.getUser.mockResolvedValue(
                userTestData
            );

            mockedComment.find.mockResolvedValue([
                commentTestData,
            ]);

            const result = await commentServices.getComments({
                userId: userTestData._id,
            });

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
                })
            ).rejects.toThrow('User not found');

            expect(mockedComment.find).not.toHaveBeenCalled();
        });

        it('returns comments by movie ID', async () => {
            mockedMovieServices.getMovie.mockResolvedValue(
                movieTestData
            );

            mockedComment.find.mockResolvedValue([
                commentTestData,
            ]);

            const result = await commentServices.getComments({
                movieId: movieTestData._id,
            });

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
                })
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

            mockedComment.find.mockResolvedValue([
                commentTestData,
            ]);

            const result = await commentServices.getComments({
                userId: userTestData._id,
                movieId: movieTestData._id,
            });

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

            mockedComment.find.mockResolvedValue([]);

            const result = await commentServices.getComments({
                movieId: movieTestData._id,
            });

            expect(result).toEqual([]);
        });

        it('propagates database errors', async () => {
            mockedComment.find.mockRejectedValue(
                new Error('Database unavailable')
            );

            await expect(
                commentServices.getComments({})
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

});