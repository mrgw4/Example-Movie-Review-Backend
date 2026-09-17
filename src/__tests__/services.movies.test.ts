import {
    getAllMovies,
    getMoviesWithPagination,
    getTotalMovieCount,
    getMovie,
    createMovie,
    deleteMovie,
    updateMovie,
} from '../services/movieServices';
import Movie from '../models/Movie';
import { MovieQuery } from '../schemas/movieQuerySchema';
import { buildMovieFilter, buildMovieSort } from '../services/queries/movieQuery';

jest.mock('../models/Movie', () => ({
    __esModule: true,
    default: {
        find: jest.fn(),
        countDocuments: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        findByIdAndDelete: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    },
}));

const mockedMovie = Movie as unknown as {
    find: jest.Mock;
    countDocuments: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    findByIdAndDelete: jest.Mock;
    findByIdAndUpdate: jest.Mock;
};

jest.mock('../services/queries/movieQuery', () => ({
    __esModule: true,
    buildMovieFilter: jest.fn(),
    buildMovieSort: jest.fn(),
}));

const mockedBuildMovieFilter = jest.mocked(buildMovieFilter);
const mockedBuildMovieSort = jest.mocked(buildMovieSort);

const mockQuery: MovieQuery = {
    page: 1,
    limit: 20,

    title: 'star',

    sort: 'title',
    order: 'asc'
};



describe('movieServices', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    // getAllMovies tests
    it('returns all movies sorted by title', async () => {
        const movies = [
            { _id: 'movie-1', title: 'A Movie' },
            { _id: 'movie-2', title: 'B Movie' },
        ];

        const query = {
            sort: jest.fn().mockResolvedValue(movies),
        };

        mockedMovie.find.mockReturnValue(query);

        const result = await getAllMovies();

        expect(mockedMovie.find).toHaveBeenCalled();
        expect(query.sort).toHaveBeenCalledWith({ title: 1 });
        expect(result).toEqual(movies);
    });

    it('returns paginated movies with essential fields using the query filter and sort', async () => {
        const movies = [
            {
                _id: 'movie-1',
                title: 'A Movie',
                year: 2000,
                type: 'movie',
            },
        ];

        mockedBuildMovieFilter.mockReturnValue({
            title: {
                $regex: 'movie',
                $options: 'i',
            },
        });

        mockedBuildMovieSort.mockReturnValue({
            'imdb.rating': -1,
        });

        const query = {
            select: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(movies),
        };

        mockedMovie.find.mockReturnValue(query);

        const result = await getMoviesWithPagination(10, 5, mockQuery);

        expect(mockedBuildMovieFilter).toHaveBeenCalledWith(mockQuery);
        expect(mockedBuildMovieSort).toHaveBeenCalledWith(mockQuery);

        expect(mockedMovie.find).toHaveBeenCalledWith({ title: { $regex: 'movie', $options: 'i' } });
        expect(query.select).toHaveBeenCalledWith(
            'title year type poster imdb.rating num_mflix_comments'
        );
        expect(query.skip).toHaveBeenCalledWith(10);
        expect(query.limit).toHaveBeenCalledWith(5);
        expect(query.sort).toHaveBeenCalledWith({ 'imdb.rating': -1 });

        expect(result).toEqual(movies);
    });

    // getTotalMovieCount tests
    it('returns the total movie count', async () => {
        mockedMovie.countDocuments.mockResolvedValue(42);

        const result = await getTotalMovieCount(mockQuery);

        expect(mockedMovie.countDocuments).toHaveBeenCalled();
        expect(result).toBe(42);
    });

    // getMovie tests
    it('returns a movie by ID', async () => {
        const movie = {
            _id: 'movie-1',
            title: 'A Movie',
        };

        mockedMovie.findById.mockResolvedValue(movie);

        const result = await getMovie('movie-1');

        expect(mockedMovie.findById).toHaveBeenCalledWith('movie-1');
        expect(result).toEqual(movie);
    });

    it('returns null when a movie is not found by ID', async () => {
        mockedMovie.findById.mockResolvedValue(null);

        await expect(getMovie('nonexistent-id')).rejects.toThrow('Movie not found');

        expect(mockedMovie.findById).toHaveBeenCalledWith('nonexistent-id');
    });

    // createMovie tests
    it('creates a new movie', async () => {
        const movieData = {
            title: 'New Movie',
            type: 'movie',
            year: 2026,
        };

        const createdMovie = {
            _id: 'movie-1',
            ...movieData,
        };

        mockedMovie.create.mockResolvedValue(createdMovie);

        const result = await createMovie(movieData);

        expect(mockedMovie.create).toHaveBeenCalledWith(movieData);
        expect(result).toEqual(createdMovie);
    });

    // deleteMovie tests
    it('deletes a movie by ID', async () => {
        const movie = {
            _id: 'movie-1',
            title: 'A Movie',
        };

        mockedMovie.findByIdAndDelete.mockResolvedValue(movie);

        const result = await deleteMovie('movie-1');

        expect(mockedMovie.findByIdAndDelete).toHaveBeenCalledWith('movie-1');
        expect(result).toEqual(movie);
    });

    it('returns null when deleting a movie that does not exist', async () => {
        mockedMovie.findByIdAndDelete.mockResolvedValue(null);

        await expect(deleteMovie('nonexistent-id')).rejects.toThrow('Movie not found');

        expect(mockedMovie.findByIdAndDelete).toHaveBeenCalledWith('nonexistent-id');
    });

    // updateMovie tests
    it('updates a movie by ID and returns the updated movie', async () => {
        const updateData = {
            title: 'Updated Movie',
        };

        const updatedMovie = {
            _id: 'movie-1',
            title: 'Updated Movie',
        };

        mockedMovie.findByIdAndUpdate.mockResolvedValue(updatedMovie);

        const result = await updateMovie('movie-1', updateData);

        expect(mockedMovie.findByIdAndUpdate).toHaveBeenCalledWith(
            'movie-1',
            updateData,
            { new: true }
        );
        expect(result).toEqual(updatedMovie);
    });

    it('returns null when updating a movie that does not exist', async () => {
        mockedMovie.findByIdAndUpdate.mockResolvedValue(null);

        await expect(updateMovie('nonexistent-id', { title: 'Updated Movie' })).rejects.toThrow('Movie not found');

        expect(mockedMovie.findByIdAndUpdate).toHaveBeenCalledWith(
            'nonexistent-id',
            { title: 'Updated Movie' },
            { new: true }
        );
    });
});
