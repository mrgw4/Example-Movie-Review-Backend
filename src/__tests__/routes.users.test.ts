import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import userRouter from '../routes/users';
import * as userServices from '../services/userServices';

jest.mock('../services/userServices');

const mockedServices = userServices as jest.Mocked<typeof userServices>;

const app: Express = express();
app.use(express.json());
app.use('/api/users', userRouter);

describe('users route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedServices.createSession.mockResolvedValue({} as any);
    mockedServices.verifySessionToken.mockResolvedValue({ userId: '507f1f77bcf86cd799439011' } as any);
  });

  it('returns 400 when required fields are missing', async () => {
    const response = await request(app).post('/api/users').send({ email: 'test@example.com' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Name, email, and password are required' });
  });

  it('returns 200 and users on successful GET', async () => {
    mockedServices.getUsersWithPagination.mockResolvedValue([{ id: '1', name: 'Jane Doe' }] as any);

    const response = await request(app).get('/api/users?page=1&limit=10');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ "data": [{ "id": "1", "name": "Jane Doe" }], "pagination": { "hasNextPage": false, "hasPrevPage": false, "limit": 10, "page": 1, "pages": null } });
  });

  it('returns 503 when getUsersWithPagination throws a connect error', async () => {
    mockedServices.getUsersWithPagination.mockRejectedValue(new Error('connect failed'));

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 500 when getUsersWithPagination fails unexpectedly', async () => {
    mockedServices.getUsersWithPagination.mockRejectedValue(new Error('unexpected failure'));

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch users' });
  });

  it('returns a token and user payload when login succeeds', async () => {
    mockedServices.loginUser.mockResolvedValue({ _id: 'user-1', name: 'Jane Doe', email: 'test@example.com' } as any);

    const response = await request(app).post('/api/users/login').send({
      email: 'test@example.com',
      password: 'password',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toEqual({ id: 'user-1', name: 'Jane Doe', email: 'test@example.com' });
  });

  it('returns 400 when login credentials are missing', async () => {
    const response = await request(app).post('/api/users/login').send({ email: 'test@example.com' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email and password are required' });
  });

  it('returns 401 when loginUser rejects with invalid credentials', async () => {
    mockedServices.loginUser.mockRejectedValue(new Error('Invalid credentials'));

    const response = await request(app).post('/api/users/login').send({
      email: 'test@example.com',
      password: 'password',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns 503 when loginUser throws a connect error', async () => {
    mockedServices.loginUser.mockRejectedValue(new Error('connect failed'));

    const response = await request(app).post('/api/users/login').send({
      email: 'test@example.com',
      password: 'password',
    });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 200 and logs out a valid token', async () => {
    mockedServices.deleteSessionToken.mockResolvedValue({} as any);

    const response = await request(app).post('/api/users/logout').set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Logged out successfully' });
  });

  it('returns 401 when logout receives an invalid token', async () => {
    mockedServices.deleteSessionToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app).post('/api/users/logout').set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid token' });
  });

  it('returns 400 when logout has no token', async () => {
    const response = await request(app).post('/api/users/logout');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Authorization token is required' });
  });

  it('returns 401 when logout has only Bearer without token', async () => {
    const response = await request(app).post('/api/users/logout').set('Authorization', 'Bearer ');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid token' });
  });

  it('returns 401 when logout is given an invalid token format', async () => {
    const response = await request(app).post('/api/users/logout').set('Authorization', 'wrong format');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid authorization format' });
  });

  it('returns 503 when logout encounters a database connection error', async () => {
    mockedServices.deleteSessionToken.mockRejectedValue(new Error('connect failed during logout'));

    const response = await request(app).post('/api/users/logout').set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 401 when a single-user request uses an expired token', async () => {
    mockedServices.verifySessionToken.mockRejectedValue(new Error('Token expired'));

    const response = await request(app).get('/api/users/507f1f77bcf86cd799439011').set('Authorization', 'Bearer expired-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Token expired' });
  });

  it('hides email when verifySessionToken throws an error other than token expired', async () => {
    mockedServices.verifySessionToken.mockRejectedValue(new Error('Invalid token'));
    mockedServices.getUser.mockResolvedValue({ _id: 'user-1', name: 'Jane Doe', email: 'test@example.com' } as any);

    const response = await request(app).get('/api/users/507f1f77bcf86cd799439011').set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ _id: 'user-1', name: 'Jane Doe' });
  });

  it('returns 404 when the requested user does not exist', async () => {
    mockedServices.getUser.mockResolvedValue(null);

    const response = await request(app).get('/api/users/507f1f77bcf86cd799439011');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('returns 503 when getUser throws a connect error', async () => {
    mockedServices.getUser.mockRejectedValue(new Error('connect failed'));

    const response = await request(app).get('/api/users/507f1f77bcf86cd799439011');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 404 when getUser throws a not-found error', async () => {
    mockedServices.getUser.mockRejectedValue(new Error('not found'));

    const response = await request(app).get('/api/users/507f1f77bcf86cd799439011');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('returns 500 when getUser throws an unexpected error', async () => {
    mockedServices.getUser.mockRejectedValue(new Error('unexpected failure'));

    const response = await request(app).get('/api/users/507f1f77bcf86cd799439011');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch user' });
  });

  it('hides email for a single-user response without a verified token', async () => {
    mockedServices.getUser.mockResolvedValue({ _id: 'user-1', name: 'Jane Doe', email: 'test@example.com' } as any);

    const response = await request(app).get('/api/users/507f1f77bcf86cd799439011');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ _id: 'user-1', name: 'Jane Doe' });
  });

  it('returns email for a single-user response with a valid token', async () => {
    mockedServices.getUser.mockResolvedValue({ _id: 'user-1', name: 'Jane Doe', email: 'test@example.com' } as any);
    const token = jwt.sign({ id: 'user-1' }, 'dev-secret', { expiresIn: '1h' });

    const response = await request(app).get('/api/users/507f1f77bcf86cd799439011').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe('test@example.com');
  });

  it('returns 400 when GET /:id has invalid ObjectId format', async () => {
    const response = await request(app).get('/api/users/123');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid user id format' });
  });

  it('hides email when verification fails for a token payload that is not accepted', async () => {
    mockedServices.getUser.mockResolvedValue({ _id: 'user-1', name: 'Jane Doe', email: 'test@example.com' } as any);
    mockedServices.verifySessionToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app).get('/api/users/507f1f77bcf86cd799439011').set('Authorization', 'Bearer malformed-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ _id: 'user-1', name: 'Jane Doe' });
  });

  it('returns 201 when createUser succeeds', async () => {
    mockedServices.createUser.mockResolvedValue({ _id: '1', name: 'Jane Doe' } as any);

    const response = await request(app).post('/api/users').send({
      name: 'Jane Doe',
      email: 'test@example.com',
      password: 'password',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'User created successfully', user: { _id: '1', name: 'Jane Doe' } });
  });

  it('returns 503 when the request body fails schema validation', async () => {
    const response = await request(app).post('/api/users').send({
      name: 'Jo',
      email: 'invalid-email',
      password: 'password',
    });

    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 503 when createUser throws', async () => {
    mockedServices.createUser.mockRejectedValue(new Error('Email already in use'));

    const response = await request(app).post('/api/users').send({
      name: 'Jane Doe',
      email: 'test@example.com',
      password: 'password',
    });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Email already in use' });
  });

  it('returns 503 when createUser throws a connect error', async () => {
    mockedServices.createUser.mockRejectedValue(new Error('connect failed'));

    const response = await request(app).post('/api/users').send({
      name: 'Jane Doe',
      email: 'test@example.com',
      password: 'password',
    });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 500 when createUser throws a non-Error', async () => {
    mockedServices.createUser.mockRejectedValue({ foo: 'bar' });

    const response = await request(app).post('/api/users').send({
      name: 'Jane Doe',
      email: 'test@example.com',
      password: 'password',
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to create user' });
  });

  // PUT /api/users/:id - Update user tests
  it('returns 200 when updateUser succeeds', async () => {
    mockedServices.updateUser.mockResolvedValue({ _id: 'user-1', name: 'Updated Name', email: 'test@example.com' } as any);

    const response = await request(app)
      .put('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User updated successfully');
    expect(response.body.user.name).toBe('Updated Name');
  });

  it('returns 400 when update has no authorization header', async () => {
    const response = await request(app)
      .put('/api/users/507f1f77bcf86cd799439011')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Authorization token is required' });
  });

  it('returns 401 when update receives an invalid token', async () => {
    mockedServices.verifySessionToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .put('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer invalid-token')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid or expired token' });
  });

  it('returns 401 when update receives an invalid token format', async () => {
    mockedServices.verifySessionToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .put('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'invalid-token')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid authorization format' });
  });

  it('returns 401 when update token does not match user ID', async () => {
    mockedServices.verifySessionToken.mockResolvedValue({ userId: 'user-2' } as any);

    const response = await request(app)
      .put('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when update has no fields to update', async () => {
    const response = await request(app)
      .put('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('required');
  });

  it('returns 400 when update email already in use', async () => {
    mockedServices.updateUser.mockRejectedValue(new Error('Email already in use'));

    const response = await request(app)
      .put('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ email: 'taken@example.com' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email already in use' });
  });

  it('returns 400 when update has invalid ID format', async () => {
    const response = await request(app)
      .put('/api/users/invalid-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid user id format' });
  });

  it('returns 404 when updating a user that does not exist', async () => {
    mockedServices.updateUser.mockRejectedValue(new Error('User not found'));

    const response = await request(app)
      .put('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('returns 503 when updateUser throws a connect error', async () => {
    mockedServices.updateUser.mockRejectedValue(new Error('connect failed'));

    const response = await request(app)
      .put('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 500 when updateUser throws an unexpected error', async () => {
    mockedServices.updateUser.mockRejectedValue(new Error('unexpected failure'));

    const response = await request(app)
      .put('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to update user' });
  });

  it('returns 401 when PUT has only Bearer without token', async () => {
    mockedServices.verifySessionToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .put('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer ')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });

  it('returns 400 when PUT has invalid ObjectId like 123', async () => {
    const response = await request(app)
      .put('/api/users/123')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid user id format' });
  });

  // POST /api/users/:id/change-password tests
  it('returns 200 when changePassword succeeds', async () => {
    mockedServices.changePassword.mockResolvedValue({ _id: 'user-1' } as any);

    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'old-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Password changed successfully');
  });

  it('returns 400 when change-password has no authorization header', async () => {
    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .send({ oldPassword: 'old-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Authorization token is required' });
  });

  it('returns 401 when change-password receives an invalid token', async () => {
    mockedServices.verifySessionToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .set('Authorization', 'Bearer invalid-token')
      .send({ oldPassword: 'old-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid or expired token' });
  });

  it('returns 401 when change-password receives an invalid token format', async () => {
    mockedServices.verifySessionToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .set('Authorization', 'invalid-token')
      .send({ oldPassword: 'old-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid authorization format' });
  });

  it('returns 401 when change-password token does not match user ID', async () => {
    mockedServices.verifySessionToken.mockResolvedValue({ userId: 'user-2' } as any);

    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'old-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when change-password is missing fields', async () => {
    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'old-pass' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('required');
  });

  it('returns 400 when change-password new password is same as old', async () => {
    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'same-pass', newPassword: 'same-pass' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('different');
  });

  it('returns 400 when change-password has invalid ID format', async () => {
    const response = await request(app)
      .post('/api/users/invalid-id/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'old-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid user id format' });
  });

  it('returns 401 when change-password old password is incorrect', async () => {
    mockedServices.changePassword.mockRejectedValue(new Error('Invalid password'));

    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'wrong-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Current password is incorrect' });
  });

  it('returns 404 when changing password for a user that does not exist', async () => {
    mockedServices.changePassword.mockRejectedValue(new Error('User not found'));

    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'old-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('returns 503 when changePassword throws a connect error', async () => {
    mockedServices.changePassword.mockRejectedValue(new Error('connect failed'));

    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'old-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 500 when changePassword throws an unexpected error', async () => {
    mockedServices.changePassword.mockRejectedValue(new Error('unexpected failure'));

    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'old-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to change password' });
  });

  it('returns 401 when POST change-password has only Bearer without token', async () => {
    mockedServices.verifySessionToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .post('/api/users/507f1f77bcf86cd799439011/change-password')
      .set('Authorization', 'Bearer ')
      .send({ oldPassword: 'old-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });

  it('returns 400 when POST change-password has invalid ObjectId like 123', async () => {
    const response = await request(app)
      .post('/api/users/123/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ oldPassword: 'old-pass', newPassword: 'new-pass' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid user id format' });
  });

  // DELETE /api/users/:id tests
  it('returns 200 when deleteUser succeeds', async () => {
    mockedServices.deleteUser.mockResolvedValue({ _id: 'user-1', name: 'Jane Doe' } as any);

    const response = await request(app)
      .delete('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User deleted successfully');
  });

  it('returns 400 when delete has no authorization header', async () => {
    const response = await request(app)
      .delete('/api/users/507f1f77bcf86cd799439011');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Authorization token is required' });
  });

  it('returns 401 when delete receives an invalid token', async () => {
    mockedServices.verifySessionToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .delete('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid or expired token' });
  });

  it('returns 401 when delete token does not match user ID', async () => {
    mockedServices.verifySessionToken.mockResolvedValue({ userId: 'user-2' } as any);

    const response = await request(app)
      .delete('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when delete token is the wrong format', async () => {
    mockedServices.verifySessionToken.mockResolvedValue({ userId: 'user-2' } as any);

    const response = await request(app)
      .delete('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'invalid token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid authorization format' });
  });

  it('returns 400 when delete has invalid ID format', async () => {
    const response = await request(app)
      .delete('/api/users/invalid-id')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid user id format' });
  });

  it('returns 503 when deleteUser throws a connect error', async () => {
    mockedServices.deleteUser.mockRejectedValue(new Error('connect failed'));

    const response = await request(app)
      .delete('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });

  it('returns 500 when deleteUser throws an unexpected error', async () => {
    mockedServices.deleteUser.mockRejectedValue(new Error('unexpected failure'));

    const response = await request(app)
      .delete('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to delete user' });
  });

  it('returns 401 when delete has only Bearer without token', async () => {
    mockedServices.verifySessionToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .delete('/api/users/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer ');

    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });

  it('returns 400 when delete has invalid ObjectId like 123', async () => {
    const response = await request(app)
      .delete('/api/users/123')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid user id format' });
  });
});
