import { createUser, getAllUsers, loginUser, createSession, verifySessionToken, deleteSessionToken, getUser, updateUser, changePassword, deleteUser, getUsersWithPagination, getTotalUserCount, verifyAdmin } from '../services/userServices';
import User from '../models/User';
import Session from '../models/Session';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';
import mongoose from 'mongoose';

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../models/Session', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    findOneAndDelete: jest.fn(),
  },
}));

jest.mock('../models/Admin', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockedUser = User as unknown as {
  find: jest.Mock;
  findOne: jest.Mock;
  findById: jest.Mock;
  findByIdAndDelete: jest.Mock;
  create: jest.Mock;
  countDocuments: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
};

const mockedSession = Session as unknown as {
  create: jest.Mock;
  findOne: jest.Mock;
  deleteOne: jest.Mock;
  findOneAndDelete: jest.Mock;
};

const mockedBcrypt = bcrypt as unknown as {
  hash: jest.Mock;
  compare: jest.Mock;
};

const mockedAdmin = Admin as unknown as {
  findOne: jest.Mock;
};

describe('userServices', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns users without password or email fields', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([{ _id: 'user-1', name: 'Jane Doe' }]),
    };

    mockedUser.find.mockReturnValue(query);

    const result = await getAllUsers();

    expect(mockedUser.find).toHaveBeenCalled();
    expect(query.select).toHaveBeenCalledWith('-password -email');
    expect(query.sort).toHaveBeenCalledWith({ name: -1 });
    expect(result).toEqual([{ _id: 'user-1', name: 'Jane Doe' }]);
  });

  it('getUsersWithPagination returns users without password or email fields', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([{ _id: 'user-1', name: 'Jane Doe' }]),
    };

    mockedUser.find.mockReturnValue(query);

    const result = await getUsersWithPagination(1, 10);

    expect(mockedUser.find).toHaveBeenCalled();
    expect(query.select).toHaveBeenCalledWith('-password -email');
    expect(query.skip).toHaveBeenCalledWith(1);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(query.sort).toHaveBeenCalledWith({ name: -1 });
    expect(result).toEqual([{ _id: 'user-1', name: 'Jane Doe' }]);
  });

  it('getTotalUserCount returns total user count', async () => {
    mockedUser.countDocuments.mockResolvedValue(5);

    const result = await getTotalUserCount();

    expect(mockedUser.countDocuments).toHaveBeenCalled();
    expect(result).toBe(5);
  });

  it('throws when createUser is called with an existing email', async () => {
    mockedUser.findOne.mockResolvedValue({ email: 'test@example.com' });

    await expect(
      createUser({ name: 'Jane Doe', email: 'test@example.com', password: 'password' })
    ).rejects.toThrow('Email already in use');

    expect(mockedUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
  });

  it('hashes the password and creates a new user', async () => {
    mockedUser.findOne.mockResolvedValue(null);
    mockedBcrypt.hash.mockResolvedValue('hashed-password');
    mockedUser.create.mockResolvedValue({ id: '1', name: 'Jane Doe', email: 'test@example.com' });

    const result = await createUser({
      name: 'Jane Doe',
      email: 'test@example.com',
      password: 'password',
    });

    expect(mockedUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('password', 12);
    expect(mockedUser.create).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'test@example.com',
      password: 'hashed-password',
    });
    expect(result).toEqual({ id: '1', name: 'Jane Doe', email: 'test@example.com' });
  });

  it('throws when loginUser cannot find a user', async () => {
    mockedUser.findOne.mockResolvedValue(null);

    await expect(loginUser('test@example.com', 'password')).rejects.toThrow('Invalid credentials');

    expect(mockedUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
  });

  it('throws when password comparison fails', async () => {
    mockedUser.findOne.mockResolvedValue({ password: 'hashed-password' });
    mockedBcrypt.compare.mockResolvedValue(false);

    await expect(loginUser('test@example.com', 'password')).rejects.toThrow('Invalid credentials');

    expect(mockedBcrypt.compare).toHaveBeenCalledWith('password', 'hashed-password');
  });

  it('returns a user when credentials are valid', async () => {
    const userRecord = { id: '1', email: 'test@example.com', password: 'hashed-password' };
    mockedUser.findOne.mockResolvedValue(userRecord);
    mockedBcrypt.compare.mockResolvedValue(true);

    const result = await loginUser('test@example.com', 'password');

    expect(result).toBe(userRecord);
    expect(mockedBcrypt.compare).toHaveBeenCalledWith('password', 'hashed-password');
  });

  it('creates a session for a valid user and token', async () => {
    mockedSession.create.mockResolvedValue({ user_id: 'user-1', jwt: 'token' });

    const result = await createSession('user-1', 'token');

    expect(mockedSession.create).toHaveBeenCalledWith({ user_id: 'user-1', jwt: 'token' });
    expect(result).toEqual({ user_id: 'user-1', jwt: 'token' });
  });

  it('verifies a session token successfully', async () => {
    const token = jwt.sign({ id: 'user-1', email: 'test@example.com' }, 'dev-secret', { expiresIn: '1h' });
    mockedSession.findOne.mockResolvedValue({
      createdAt: new Date(Date.now() - 1000),
      _id: 'session-1',
    });

    const result = await verifySessionToken(token);

    expect(result.userId).toBe('user-1');
    expect(result.email).toBe('test@example.com');
  });

  it('verifies a session token successfully', async () => {
    const token = jwt.sign({ id: 'user-1', email: 'test@example.com' }, 'dev-secret', { expiresIn: '1h' });
    mockedSession.findOne.mockResolvedValue({
      _id: 'session-1',
    });

    const result = await verifySessionToken(token);

    expect(result.userId).toBe('user-1');
    expect(result.email).toBe('test@example.com');
  });

  it('deletes an expired session token and throws', async () => {
    const token = jwt.sign({ id: 'user-1' }, 'dev-secret', { expiresIn: '1h' });
    mockedSession.findOne.mockResolvedValue({
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      _id: 'session-1',
    });
    mockedSession.deleteOne.mockResolvedValue({});

    await expect(verifySessionToken(token)).rejects.toThrow('Token expired');
    expect(mockedSession.deleteOne).toHaveBeenCalledWith({ _id: 'session-1' });
  });

  it('throws when no session exists for the token', async () => {
    mockedSession.findOne.mockResolvedValue(null);

    await expect(verifySessionToken('missing-token')).rejects.toThrow('Invalid token');
  });

  it('deletes a session token when the decoded payload has no id', async () => {
    const token = jwt.sign({ email: 'test@example.com' }, 'dev-secret', { expiresIn: '1h' });
    mockedSession.findOne.mockResolvedValue({
      createdAt: new Date(),
      _id: 'session-1',
    });
    mockedSession.deleteOne.mockResolvedValue({});

    await expect(verifySessionToken(token)).rejects.toThrow('Invalid token');
    expect(mockedSession.deleteOne).toHaveBeenCalledWith({ _id: 'session-1' });
  });

  it('deletes an invalid session token and throws', async () => {
    const token = 'invalid-token';
    mockedSession.findOne.mockResolvedValue({
      createdAt: new Date(),
      _id: 'session-1',
    });
    mockedSession.deleteOne.mockResolvedValue({});

    await expect(verifySessionToken(token)).rejects.toThrow('jwt malformed');
    expect(mockedSession.deleteOne).not.toHaveBeenCalled();
  });

  it('deletes a session token on logout', async () => {
    mockedSession.findOneAndDelete.mockResolvedValue({ jwt: 'token' });

    const result = await deleteSessionToken('token');

    expect(mockedSession.findOneAndDelete).toHaveBeenCalledWith({ jwt: 'token' });
    expect(result).toEqual({ jwt: 'token' });
  });

  it('throws an error when deleteSessionToken cannot find the session', async () => {
    mockedSession.findOneAndDelete.mockResolvedValue(null);

    await expect(deleteSessionToken('non-existent-token')).rejects.toThrow('Invalid token');
  });

  // getUser tests
  it('returns a user by ID', async () => {
    const user = { _id: 'user-1', name: 'Jane Doe', email: 'test@example.com' };
    mockedUser.findById.mockResolvedValue(user);

    const result = await getUser('user-1');

    expect(mockedUser.findById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(user);
  });

  it('returns null when user is not found by ID', async () => {
    mockedUser.findById.mockResolvedValue(null);

    const result = await getUser('nonexistent-id');

    expect(mockedUser.findById).toHaveBeenCalledWith('nonexistent-id');
    expect(result).toBeNull();
  });

  // updateUser tests
  it('updates user name successfully', async () => {
    const user = { _id: 'user-1', name: 'Old Name', email: 'test@example.com', save: jest.fn().mockResolvedValue({ _id: 'user-1', name: 'New Name', email: 'test@example.com' }) };
    mockedUser.findById.mockResolvedValue(user);

    const result = await updateUser('user-1', { name: 'New Name' });

    expect(mockedUser.findById).toHaveBeenCalledWith('user-1');
    expect(user.save).toHaveBeenCalled();
    expect(result.name).toBe('New Name');
  });

  it('updates user email successfully', async () => {
    const user = { _id: 'user-1', name: 'Jane Doe', email: 'old@example.com', save: jest.fn().mockResolvedValue({ _id: 'user-1', name: 'Jane Doe', email: 'new@example.com' }) };
    mockedUser.findById.mockResolvedValue(user);
    mockedUser.findOne.mockResolvedValue(null);

    const result = await updateUser('user-1', { email: 'new@example.com' });

    expect(mockedUser.findById).toHaveBeenCalledWith('user-1');
    expect(mockedUser.findOne).toHaveBeenCalledWith({ email: 'new@example.com' });
    expect(user.save).toHaveBeenCalled();
    expect(result.email).toBe('new@example.com');
  });

  it('throws when updating email to one that already exists', async () => {
    const user = { _id: 'user-1', name: 'Jane Doe', email: 'old@example.com' };
    mockedUser.findById.mockResolvedValue(user);
    mockedUser.findOne.mockResolvedValue({ _id: 'user-2', email: 'existing@example.com' });

    await expect(updateUser('user-1', { email: 'existing@example.com' })).rejects.toThrow('Email already in use');

    expect(mockedUser.findOne).toHaveBeenCalledWith({ email: 'existing@example.com' });
  });

  it('throws when updating a user that does not exist', async () => {
    mockedUser.findById.mockResolvedValue(null);

    await expect(updateUser('nonexistent-id', { name: 'New Name' })).rejects.toThrow('User not found');

    expect(mockedUser.findById).toHaveBeenCalledWith('nonexistent-id');
  });

  // changePassword tests
  it('changes password successfully when old password is correct', async () => {
    const user = { _id: 'user-1', password: 'hashed-old', save: jest.fn().mockResolvedValue({ _id: 'user-1', password: 'hashed-new' }) };
    mockedUser.findById.mockResolvedValue(user);
    mockedBcrypt.compare.mockResolvedValue(true);
    mockedBcrypt.hash.mockResolvedValue('hashed-new');

    const result = await changePassword('user-1', 'old-password', 'new-password');

    expect(mockedUser.findById).toHaveBeenCalledWith('user-1');
    expect(mockedBcrypt.compare).toHaveBeenCalledWith('old-password', 'hashed-old');
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('new-password', 12);
    expect(user.save).toHaveBeenCalled();
    expect(result.password).toBe('hashed-new');
  });

  it('throws when old password is incorrect', async () => {
    const user = { _id: 'user-1', password: 'hashed-old' };
    mockedUser.findById.mockResolvedValue(user);
    mockedBcrypt.compare.mockResolvedValue(false);

    await expect(changePassword('user-1', 'wrong-password', 'new-password')).rejects.toThrow('Invalid password');

    expect(mockedBcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed-old');
  });

  it('throws when changing password for a user that does not exist', async () => {
    mockedUser.findById.mockResolvedValue(null);

    await expect(changePassword('nonexistent-id', 'old-password', 'new-password')).rejects.toThrow('User not found');

    expect(mockedUser.findById).toHaveBeenCalledWith('nonexistent-id');
  });

  // deleteUser tests
  it('deletes a user and removes their session', async () => {
    const user = { _id: 'user-1', name: 'Jane Doe' };
    mockedUser.findByIdAndDelete.mockResolvedValue(user);
    mockedSession.findOneAndDelete.mockResolvedValue({ jwt: 'token' });

    const result = await deleteUser('user-1', 'token');

    expect(mockedUser.findByIdAndDelete).toHaveBeenCalledWith('user-1');
    expect(mockedSession.findOneAndDelete).toHaveBeenCalledWith({ jwt: 'token' });
    expect(result).toEqual(user);
  });

  it('throws when deleting a user that does not exist', async () => {
    mockedUser.findByIdAndDelete.mockResolvedValue(null);

    await expect(deleteUser('nonexistent-id', 'token')).rejects.toThrow('User not found');

    expect(mockedUser.findByIdAndDelete).toHaveBeenCalledWith('nonexistent-id');
  });

  it('throws when deleting a session token that does not exist', async () => {
    const user = { _id: 'user-1', name: 'Jane Doe' };
    mockedUser.findByIdAndDelete.mockResolvedValue(user);
    mockedSession.findOneAndDelete.mockRejectedValue(new Error('Invalid token'));

    await expect(deleteUser('user-1', 'invalid-token')).rejects.toThrow('Invalid token');

    expect(mockedUser.findByIdAndDelete).toHaveBeenCalledWith('user-1');
  });

  // verifyAdmin tests
  it('verifies an admin session token successfully', async () => {
    const userId = new mongoose.Types.ObjectId();

    const token = jwt.sign(
      { id: userId.toString(), email: 'admin@example.com' },
      'dev-secret',
      { expiresIn: '1h' }
    );

    mockedSession.findOne.mockResolvedValue({
      createdAt: new Date(),
      _id: 'session-1',
    });

    mockedAdmin.findOne.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      userId,
    });

    const result = await verifyAdmin(token);

    expect(mockedAdmin.findOne).toHaveBeenCalledWith({ userId });
    expect(result).toBe(userId.toString());
  });

  it('throws when the session user is not an admin', async () => {
    const userId = new mongoose.Types.ObjectId();

    const token = jwt.sign(
      { id: userId.toString(), email: 'user@example.com' },
      'dev-secret',
      { expiresIn: '1h' }
    );

    mockedSession.findOne.mockResolvedValue({
      createdAt: new Date(),
      _id: 'session-1',
    });

    mockedAdmin.findOne.mockResolvedValue(null);

    await expect(verifyAdmin(token))
      .rejects
      .toThrow('User is not an admin');

    expect(mockedAdmin.findOne).toHaveBeenCalledWith({ userId });
  });

  it('throws when the session token is invalid', async () => {
    mockedSession.findOne.mockResolvedValue(null);

    await expect(verifyAdmin('invalid-token'))
      .rejects
      .toThrow('Invalid token');

    expect(mockedAdmin.findOne).not.toHaveBeenCalled();
  });

  it('propagates an error when the admin lookup fails', async () => {
    const userId = new mongoose.Types.ObjectId();

    const token = jwt.sign(
      { id: userId.toString(), email: 'admin@example.com' },
      'dev-secret',
      { expiresIn: '1h' }
    );

    mockedSession.findOne.mockResolvedValue({
      createdAt: new Date(),
      _id: 'session-1',
    });

    mockedAdmin.findOne.mockRejectedValue(
      new Error('Database connection failed')
    );

    await expect(verifyAdmin(token))
      .rejects
      .toThrow('Database connection failed');

    expect(mockedAdmin.findOne).toHaveBeenCalledWith({ userId });
  });
});
