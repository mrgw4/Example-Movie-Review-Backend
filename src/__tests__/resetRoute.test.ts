import * as resetModule from '../testhelper/testResetHandler';
import { Request, Response } from 'express';

describe('reset route handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_SELECTION = '/mflix_test';
  });

  function createMockResponse() {
    const res: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    return res as Response;
  }

  it('returns 200 when reset route succeeds', async () => {
    const resetFn = jest.fn().mockResolvedValue({
      movies: 10,
      comments: 20,
      users: 5,
      admin: 1,
    });

    const res = createMockResponse();

    await resetModule.handleResetRouteInternal(
      {} as Request,
      res,
      resetFn
    );

    expect(resetFn).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
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

  it('returns 400 when reset route throws a standard Error', async () => {
    const error = new Error('boom');
    const resetFn = jest.fn().mockRejectedValue(error);
    const res = createMockResponse();

    jest.spyOn(console, 'error').mockImplementation(() => { });

    await resetModule.handleResetRouteInternal(
      {} as Request,
      res,
      resetFn
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'boom',
    });
  });

  it('returns 500 when reset route throws a non-Error', async () => {
    const resetFn = jest.fn().mockRejectedValue({
      foo: 'bar',
    });
    const res = createMockResponse();

    jest.spyOn(console, 'error').mockImplementation(() => { });

    await resetModule.handleResetRouteInternal(
      {} as Request,
      res,
      resetFn
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to reset test database',
    });
  });

  it('returns the response from the internal handler', async () => {
    const req = {} as Request;
    const res = createMockResponse();

    const result = await resetModule.handleResetRoute(req, res);

    expect(result).toBe(res);
  });
});