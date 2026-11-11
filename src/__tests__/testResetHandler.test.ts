import mongoose from 'mongoose';
import {
  copyCollection,
  normaliseDbName,
  resetTestDatabase,
  handleResetRouteInternal,
} from '../testhelper/testResetHandler';

jest.mock('mongoose', () => ({
  connection: {
    db: {},
    useDb: jest.fn(),
  },
}));

describe('testResetHandler', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('normalises database names with leading slash', () => {
    expect(normaliseDbName('/mflix_test')).toBe('mflix_test');
  });

  it('normalises database names without leading slash', () => {
    expect(normaliseDbName('mflix_test')).toBe('mflix_test');
  });

  it('copies documents from source to target collection', async () => {
    const sourceCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ a: 1 }]),
      }),
    };

    const targetCollection = {
      deleteMany: jest.fn().mockResolvedValue(undefined),
      insertMany: jest.fn().mockResolvedValue(undefined),
    };

    const sourceDb = {
      collection: jest.fn().mockReturnValue(sourceCollection),
    };

    const targetDb = {
      collection: jest.fn().mockReturnValue(targetCollection),
    };

    const result = await copyCollection(
      sourceDb as any,
      targetDb as any,
      'movies'
    );

    expect(sourceDb.collection).toHaveBeenCalledWith('movies');
    expect(targetDb.collection).toHaveBeenCalledWith('movies');
    expect(sourceCollection.find).toHaveBeenCalledWith({});
    expect(targetCollection.deleteMany).toHaveBeenCalledWith({});
    expect(targetCollection.insertMany).toHaveBeenCalledWith([{ a: 1 }]);
    expect(result).toBe(1);
  });

  it('does not insert when source collection is empty', async () => {
    const sourceCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
    };

    const targetCollection = {
      deleteMany: jest.fn().mockResolvedValue(undefined),
      insertMany: jest.fn(),
    };

    const sourceDb = {
      collection: jest.fn().mockReturnValue(sourceCollection),
    };

    const targetDb = {
      collection: jest.fn().mockReturnValue(targetCollection),
    };

    const result = await copyCollection(
      sourceDb as any,
      targetDb as any,
      'comments'
    );

    expect(targetCollection.deleteMany).toHaveBeenCalledWith({});
    expect(targetCollection.insertMany).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it('throws when DATABASE_SELECTION is invalid', async () => {
    process.env.DATABASE_SELECTION = '/';

    await expect(resetTestDatabase()).rejects.toThrow(
      'DATABASE_SELECTION is missing or invalid'
    );
  });

  it('throws when target database is not a test DB', async () => {
    process.env.DATABASE_SELECTION = '/production';

    await expect(resetTestDatabase()).rejects.toThrow(
      'Refusing to reset database "production" because it does not appear to be a test database'
    );
  });

  it('throws when MongoDB is not connected', async () => {
    process.env.DATABASE_SELECTION = '/mflix_test';
    (mongoose.connection as any).db = undefined;

    await expect(resetTestDatabase()).rejects.toThrow(
      'MongoDB is not connected'
    );
  });

  it('throws when the source database cannot be accessed', async () => {
    process.env.DATABASE_SELECTION = '/mflix_test';
    (mongoose.connection as any).db = {};

    const useDbMock = mongoose.connection.useDb as jest.Mock;

    useDbMock
      .mockReturnValueOnce({ db: undefined })
      .mockReturnValueOnce({ db: {} });

    await expect(resetTestDatabase()).rejects.toThrow(
      'Could not access source database "sample_mflix"'
    );
  });

  it('throws when the target database cannot be accessed', async () => {
    process.env.DATABASE_SELECTION = '/mflix_test';
    (mongoose.connection as any).db = {};

    const useDbMock = mongoose.connection.useDb as jest.Mock;

    useDbMock
      .mockReturnValueOnce({ db: {} })
      .mockReturnValueOnce({ db: undefined });

    await expect(resetTestDatabase()).rejects.toThrow(
      'Could not access target database "mflix_test"'
    );
  });

  it('resets the test database successfully when source data exists', async () => {
    process.env.DATABASE_SELECTION = '/mflix_test';

    const sourceCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ a: 1 }]),
      }),
    };

    const targetCollections = {
      movies: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        insertMany: jest.fn().mockResolvedValue(undefined),
      },

      comments: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        insertMany: jest.fn().mockResolvedValue(undefined),
      },

      users: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        insertMany: jest.fn().mockResolvedValue(undefined),
        insertOne: jest.fn().mockResolvedValue({
          insertedId: 'test-admin-id',
        }),
      },

      admins: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        insertOne: jest.fn().mockResolvedValue(undefined),
        createIndex: jest.fn().mockResolvedValue('userId_1'),
      },
    };

    const sourceDb = {
      collection: jest.fn().mockReturnValue(sourceCollection),
    };

    const targetDb = {
      collection: jest.fn((name: string) => {
        return targetCollections[name as keyof typeof targetCollections];
      }),
    };

    const useDbMock = mongoose.connection.useDb as jest.Mock;

    useDbMock
      .mockReturnValueOnce({ db: sourceDb })
      .mockReturnValueOnce({ db: targetDb });

    const result = await resetTestDatabase();

    expect(result).toEqual({
      movies: 1,
      comments: 1,
      users: 1,
      admin: 1,
    });

    // The three MFlix collections are reset.
    expect(targetCollections.movies.deleteMany).toHaveBeenCalledWith({});
    expect(targetCollections.comments.deleteMany).toHaveBeenCalledWith({});
    expect(targetCollections.users.deleteMany).toHaveBeenCalledWith({});

    expect(targetCollections.movies.insertMany).toHaveBeenCalledWith([
      { a: 1 },
    ]);

    expect(targetCollections.comments.insertMany).toHaveBeenCalledWith([
      { a: 1 },
    ]);

    expect(targetCollections.users.insertMany).toHaveBeenCalledWith([
      { a: 1 },
    ]);

    // A known test administrator is created.
    expect(targetCollections.users.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Admin',
        email: 'admin@test.local',
        password: expect.any(String),
      })
    );

    // The admin collection is configured with the new user's ID.
    expect(targetCollections.admins.deleteMany).toHaveBeenCalledWith({});

    expect(targetCollections.admins.insertOne).toHaveBeenCalledWith({
      userId: 'test-admin-id',
    });

    expect(targetCollections.admins.createIndex).toHaveBeenCalledWith(
      { userId: 1 },
      { unique: true }
    );
  });

  it('returns 200 when the test database reset succeeds', async () => {
    process.env.DATABASE_SELECTION = '/mflix_test';

    const resetFn = jest.fn().mockResolvedValue({
      movies: 10,
      comments: 20,
      users: 5,
      admin: 1,
    });

    const json = jest.fn();

    const res = {
      status: jest.fn().mockReturnValue({ json }),
    } as any;

    await handleResetRouteInternal({} as any, res, resetFn);

    expect(resetFn).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);

    expect(json).toHaveBeenCalledWith({
      message: 'Test database reset successfully',
      sourceDatabase: 'sample_mflix',
      targetDatabase: 'mflix_test',
      copiedCollections: {
        movies: 10,
        comments: 20,
        users: 5,
        admin: 1,
      },
    });
  });

  it('returns 400 when the reset fails with an Error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
    const resetFn = jest
      .fn()
      .mockRejectedValue(new Error('Reset failed'));

    const json = jest.fn();

    const res = {
      status: jest.fn().mockReturnValue({ json }),
    } as any;

    await handleResetRouteInternal({} as any, res, resetFn);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(json).toHaveBeenCalledWith({
      error: 'Reset failed',
    });
  });

  it('returns 500 when the reset fails with a non-Error value', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
    const resetFn = jest
      .fn()
      .mockRejectedValue('Unexpected failure');

    const json = jest.fn();

    const res = {
      status: jest.fn().mockReturnValue({ json }),
    } as any;

    await handleResetRouteInternal({} as any, res, resetFn);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(json).toHaveBeenCalledWith({
      error: 'Failed to reset test database',
    });
  });

  it('uses the default test database when DATABASE_SELECTION is not set', async () => {
    delete process.env.DATABASE_SELECTION;

    const sourceDb = {
      collection: jest.fn(() => ({
        find: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue([]),
        })),
      })),
    };

    const targetDb = {
      collection: jest.fn(() => ({
        deleteMany: jest.fn().mockResolvedValue(undefined),
        insertMany: jest.fn().mockResolvedValue(undefined),
        insertOne: jest.fn().mockResolvedValue({
          insertedId: 'test-admin-id',
        }),
        createIndex: jest.fn().mockResolvedValue('userId_1'),
      })),
    };

    (mongoose.connection.useDb as jest.Mock)
      .mockReturnValueOnce({ db: sourceDb })
      .mockReturnValueOnce({ db: targetDb });

    await resetTestDatabase();

    expect(mongoose.connection.useDb).toHaveBeenNthCalledWith(
      2,
      'mflix_test',
      { useCache: true }
    );
  });

  it('uses mflix_test as the route response target when DATABASE_SELECTION is not set', async () => {
    delete process.env.DATABASE_SELECTION;

    const resetFn = jest.fn().mockResolvedValue({
      movies: 10,
      comments: 20,
      users: 5,
      admin: 1,
    });

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;

    await handleResetRouteInternal({} as any, res, resetFn);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Test database reset successfully',
      sourceDatabase: 'sample_mflix',
      targetDatabase: 'mflix_test',
      copiedCollections: {
        movies: 10,
        comments: 20,
        users: 5,
        admin: 1,
      },
    });
  });
});