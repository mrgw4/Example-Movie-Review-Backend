import request from 'supertest';
import express, { Express } from 'express';
import movieRouter from '../routes/movies';
import * as movieServices from '../services/movieServices';
import mongoose from 'mongoose';
import * as userServices from '../services/userServices';

jest.mock('../services/movieServices');
jest.mock('../services/userServices');

const mockedServices = movieServices as jest.Mocked<typeof movieServices>;
const mockedUserServices = userServices as jest.Mocked<typeof userServices>;

const app: Express = express();
app.use(express.json());
app.use('/api/movies', movieRouter);

const movieTestData = { _id: 1, plot: 'plot', genres: ['Drama'], runtime: 1, rated: 'PASSED', cast: ['Joe Blogs'], title: 'movie', fullplot: 'fullplot', countries: ['USA'], released: '2020-01-01', directors: ['director'], writers: ['writer'], awards: { wins: 1, nominations: 0, text: '1 win.' }, lastupdated: '2020-01-01', year: 2020, imdb: { rating: 8.5, votes: 1, id: 1 }, type: 'movie', tomatoes: { viewer: { rating: 5, numReviews: 1, meter: 90 }, dvd: '2020-01-01', lastUpdated: '2020-01-01' }, num_mflix_comments: 0 }

describe('movies route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 and movies on successful GET', async () => {

    mockedServices.getMoviesWithPagination.mockResolvedValue([movieTestData] as any);
    mockedServices.getTotalMovieCount.mockResolvedValue(5);

    const response = await request(app).get('/api/movies?page=1&limit=10');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ "data": [movieTestData], "pagination": { "page": 1, "limit": 10, "total": 5, "pages": 1, "hasNextPage": false, "hasPrevPage": false } });
  });

  it('returns 400 when min value is greater than max', async () => {

    mockedServices.getMoviesWithPagination.mockResolvedValue([movieTestData] as any);
    mockedServices.getTotalMovieCount.mockResolvedValue(5);

    const response = await request(app).get('/api/movies?page=1&limit=10&imdbRatingMin=9&imdbRatingMax=8');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid query parameters', details: ["imdbRatingMin must be less than or equal to imdbRatingMax"] });
  });

  it('returns 503 when getMoviesWithPagination throws a connect error', async () => {
    mockedServices.getMoviesWithPagination.mockRejectedValue(new Error('connect failed'));

    const response = await request(app).get('/api/movies');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 500 when getMoviesWithPagination fails unexpectedly', async () => {
    mockedServices.getMoviesWithPagination.mockRejectedValue(new Error('unexpected failure'));
    jest.spyOn(console, 'error').mockImplementation(() => { });

    const response = await request(app).get('/api/movies');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch movies' });
  });

  // GET /api/movies/:id tests
  it('returns 200 and the requested movie when it exists', async () => {
    mockedServices.getMovie.mockResolvedValue(movieTestData as any);

    const response = await request(app).get('/api/movies/507f1f77bcf86cd799439011').set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(movieTestData);
  });

  it('returns 404 when the requested movie does not exist', async () => {
    mockedServices.getMovie.mockRejectedValue(new Error('Movie not found'));

    const response = await request(app).get('/api/movies/507f1f77bcf86cd799439011');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Movie not found' });
  });

  it('returns 400 when id is in an invalid format', async () => {

    const response = await request(app).get('/api/movies/123');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid movie id format' });
  });

  it('returns 503 when getMovie throws a connect error', async () => {
    mockedServices.getMovie.mockRejectedValue(new Error('connect failed'));

    const response = await request(app).get('/api/movies/507f1f77bcf86cd799439011');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 404 when getMovie throws a not-found error', async () => {
    mockedServices.getMovie.mockRejectedValue(new Error('not found'));

    const response = await request(app).get('/api/movies/507f1f77bcf86cd799439011');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Movie not found' });
  });

  it('returns 500 when getMovie throws an unexpected error', async () => {
    mockedServices.getMovie.mockRejectedValue(new Error('unexpected failure'));

    const response = await request(app).get('/api/movies/507f1f77bcf86cd799439011');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch movie' });
  });

  it('returns 400 when GET /:id has invalid ObjectId format', async () => {
    const response = await request(app).get('/api/movies/123');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid movie id format' });
  });

  // POST /api/movies tests (create movie)
  it('returns 201 when createMovie succeeds', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    mockedServices.createMovie.mockResolvedValue({ movieTestData } as any);

    const response = await request(app)
      .post('/api/movies')
      .send(movieTestData)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Movie created successfully', movie: { movieTestData } });
  });

  it('returns 400 when required fields are missing', async () => {
    const response = await request(app)
      .post('/api/movies')
      .send({})
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Missing required fields',
      fields: ['title', "type", "year", "num_mflix_comments", "lastupdated", "awards", "imdb",],
    });
  });

  it('returns 400 when fields are invalid', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    const modifiedTestData = { ...movieTestData, title: 123 };
    const response = await request(app)
      .post('/api/movies')
      .send(modifiedTestData)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Invalid movie data',
      fields: ["title"],
    });
  });

  it('returns 400 with invalid Mongoose fields', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    const validationError = new mongoose.Error.ValidationError();

    validationError.addError(
      'title',
      new mongoose.Error.ValidatorError({
        path: 'title',
        message: 'Please provide a title',
      })
    );

    mockedServices.createMovie.mockRejectedValue(validationError);

    const response = await request(app)
      .post('/api/movies')
      .send(movieTestData)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Invalid movie data',
      fields: ['title'],
    });
  });

  it('returns 503 when createMovie throws a connect error', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    mockedServices.createMovie.mockRejectedValue(new Error('connect failed'));

    const response = await request(app)
      .post('/api/movies')
      .send(movieTestData)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 500 when createMovie throws an unexpected Error', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    mockedServices.createMovie.mockRejectedValue(new Error('Unknown'));

    const response = await request(app)
      .post('/api/movies')
      .send(movieTestData)
      .set('Authorization', 'Bearer valid-token');


    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to create movie' });
  });

  it('returns 500 when createMovie throws a non-Error', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    mockedServices.createMovie.mockRejectedValue({ foo: 'bar' });

    const response = await request(app)
      .post('/api/movies')
      .send(movieTestData)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to create movie' });
  });

  it('returns 400 when post has no authorization header', async () => {
    const response = await request(app)
      .post('/api/movies');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Authorization token is required'
    });

    expect(mockedUserServices.verifyAdmin).not.toHaveBeenCalled();
    expect(mockedServices.createMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when post authorization header is not Bearer', async () => {
    const response = await request(app)
      .post('/api/movies')
      .set('Authorization', 'Basic valid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid authorization format'
    });

    expect(mockedUserServices.verifyAdmin).not.toHaveBeenCalled();
    expect(mockedServices.createMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when post has an empty Bearer token', async () => {
    const response = await request(app)
      .post('/api/movies')
      .set('Authorization', 'Bearer ');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid token'
    });

    expect(mockedUserServices.verifyAdmin).not.toHaveBeenCalled();
    expect(mockedServices.createMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when verifyAdmin throws an invalid token error on post movie', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('Invalid token')
    );

    const response = await request(app)
      .post('/api/movies')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid or expired token'
    });

    expect(mockedUserServices.verifyAdmin)
      .toHaveBeenCalledWith('invalid-token');

    expect(mockedServices.createMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when verifyAdmin throws a token expired error on post movie', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('Token expired')
    );

    const response = await request(app)
      .post('/api/movies')
      .set('Authorization', 'Bearer expired-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid or expired token'
    });

    expect(mockedUserServices.verifyAdmin)
      .toHaveBeenCalledWith('expired-token');

    expect(mockedServices.createMovie).not.toHaveBeenCalled();
  });

  it('returns 403 when verifyAdmin throws a non-admin error on post movie', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('User is not an admin')
    );

    const response = await request(app)
      .post('/api/movies')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'User is not an admin'
    });

    expect(mockedUserServices.verifyAdmin)
      .toHaveBeenCalledWith('valid-token');

    expect(mockedServices.createMovie).not.toHaveBeenCalled();
  });

  it('returns 503 when verifyAdmin throws a connect error on post movie', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('connect failed')
    );

    const response = await request(app)
      .post('/api/movies')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'Database unavailable'
    });

    expect(mockedServices.createMovie).not.toHaveBeenCalled();
  });



  // PUT /api/movies/:id tests
  it('returns 200 when updateMovie succeeds', async () => {
    mockedServices.updateMovie.mockResolvedValue(movieTestData as any);
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');

    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(movieTestData);
    expect(mockedUserServices.verifyAdmin).toHaveBeenCalledWith('valid-token');
  });

  it('returns 400 when update has no fields to update', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');

    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('No valid fields provided for update');
  });

  it('returns 400 when update has invalid ID format', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');

    const response = await request(app)
      .put('/api/movies/invalid-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid movie id format' });
  });

  it('returns 404 when updating a movie that does not exist', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    mockedServices.updateMovie.mockRejectedValue(new Error('movie not found'));

    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Movie not found' });
  });

  it('returns 503 when updateMovie throws a connect error', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    mockedServices.updateMovie.mockRejectedValue(new Error('connect failed'));

    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 500 when updateMovie throws an unexpected error', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    mockedServices.updateMovie.mockRejectedValue(new Error('unexpected failure'));

    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to update movie' });
  });

  it('returns 400 when PUT has invalid ObjectId like 123', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');

    const response = await request(app)
      .put('/api/movies/123')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid movie id format' });
  });

  it('returns 400 when update has no authorization header', async () => {
    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Authorization token is required'
    });

    expect(mockedUserServices.verifyAdmin).not.toHaveBeenCalled();
    expect(mockedServices.updateMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when update authorization header is not Bearer', async () => {
    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Basic valid-token')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid authorization format'
    });

    expect(mockedUserServices.verifyAdmin).not.toHaveBeenCalled();
    expect(mockedServices.updateMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when update has an empty Bearer token', async () => {
    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer ')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid token'
    });

    expect(mockedUserServices.verifyAdmin).not.toHaveBeenCalled();
    expect(mockedServices.updateMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when verifyAdmin throws an invalid token error on update movie', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('Invalid token')
    );

    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer invalid-token')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid or expired token'
    });

    expect(mockedUserServices.verifyAdmin)
      .toHaveBeenCalledWith('invalid-token');

    expect(mockedServices.updateMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when verifyAdmin throws a token expired error on update movie', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('Token expired')
    );

    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer expired-token')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid or expired token'
    });

    expect(mockedUserServices.verifyAdmin)
      .toHaveBeenCalledWith('expired-token');

    expect(mockedServices.updateMovie).not.toHaveBeenCalled();
  });

  it('returns 403 when verifyAdmin throws a non-admin error on update movie', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('User is not an admin')
    );

    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'User is not an admin'
    });

    expect(mockedUserServices.verifyAdmin)
      .toHaveBeenCalledWith('valid-token');

    expect(mockedServices.updateMovie).not.toHaveBeenCalled();
  });

  it('returns 503 when verifyAdmin throws a connect error on update movie', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('connect failed')
    );

    const response = await request(app)
      .put('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'Database unavailable'
    });

    expect(mockedServices.updateMovie).not.toHaveBeenCalled();
  });


  // DELETE /api/movies/:id tests
  it('returns 200 when deleteMovie succeeds', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    mockedServices.deleteMovie.mockResolvedValue({
      _id: 'movie-1',
      name: 'Jane Doe'
    } as any);

    const response = await request(app)
      .delete('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Movie deleted successfully',
      movie: {
        _id: 'movie-1',
        name: 'Jane Doe'
      }
    });

    expect(mockedUserServices.verifyAdmin)
      .toHaveBeenCalledWith('valid-token');

    expect(mockedServices.deleteMovie)
      .toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });

  it('returns 400 when delete has no authorization header', async () => {
    const response = await request(app)
      .delete('/api/movies/507f1f77bcf86cd799439011');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Authorization token is required'
    });

    expect(mockedUserServices.verifyAdmin).not.toHaveBeenCalled();
    expect(mockedServices.deleteMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when delete authorization header is not Bearer', async () => {
    const response = await request(app)
      .delete('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Basic valid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid authorization format'
    });

    expect(mockedUserServices.verifyAdmin).not.toHaveBeenCalled();
    expect(mockedServices.deleteMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when delete has an empty Bearer token', async () => {
    const response = await request(app)
      .delete('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer ');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid token'
    });

    expect(mockedUserServices.verifyAdmin).not.toHaveBeenCalled();
    expect(mockedServices.deleteMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when verifyAdmin throws an invalid token error', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('Invalid token')
    );

    const response = await request(app)
      .delete('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid or expired token'
    });

    expect(mockedUserServices.verifyAdmin)
      .toHaveBeenCalledWith('invalid-token');

    expect(mockedServices.deleteMovie).not.toHaveBeenCalled();
  });

  it('returns 401 when verifyAdmin throws a token expired error', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('Token expired')
    );

    const response = await request(app)
      .delete('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer expired-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Invalid or expired token'
    });

    expect(mockedUserServices.verifyAdmin)
      .toHaveBeenCalledWith('expired-token');

    expect(mockedServices.deleteMovie).not.toHaveBeenCalled();
  });

  it('returns 403 when verifyAdmin throws a non-admin error', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('User is not an admin')
    );

    const response = await request(app)
      .delete('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'User is not an admin'
    });

    expect(mockedUserServices.verifyAdmin)
      .toHaveBeenCalledWith('valid-token');

    expect(mockedServices.deleteMovie).not.toHaveBeenCalled();
  });

  it('returns 503 when verifyAdmin throws a connect error', async () => {
    mockedUserServices.verifyAdmin.mockRejectedValue(
      new Error('connect failed')
    );

    const response = await request(app)
      .delete('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'Database unavailable'
    });

    expect(mockedServices.deleteMovie).not.toHaveBeenCalled();
  });

  it('returns 400 when delete has invalid ID format', async () => {
    const response = await request(app)
      .delete('/api/movies/invalid-id')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid movie id format' });
  });

  it('returns 503 when deleteMovie throws a connect error', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    mockedServices.deleteMovie.mockRejectedValue(
      new Error('connect failed')
    );

    const response = await request(app)
      .delete('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'Database unavailable'
    });
  });

  it('returns 500 when deleteMovie throws an unexpected error', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    mockedServices.deleteMovie.mockRejectedValue(
      new Error('unexpected failure')
    );

    const response = await request(app)
      .delete('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'Failed to delete movie'
    });
  });

  it('returns 400 when delete has invalid ID format', async () => {
    const response = await request(app)
      .delete('/api/movies/invalid-id')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Invalid movie id format'
    });
  });

  it('returns 404 when deleting a movie that does not exist', async () => {
    mockedUserServices.verifyAdmin.mockResolvedValue('507f1f77bcf86cd799439342');
    mockedServices.deleteMovie.mockRejectedValue(
      new Error('movie not found')
    );

    const response = await request(app)
      .delete('/api/movies/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'Movie not found'
    });
  });
});
