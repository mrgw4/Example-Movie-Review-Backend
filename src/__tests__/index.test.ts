jest.mock('dotenv', () => ({
  __esModule: true,
  default: {
    config: jest.fn(),
  },
}));

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn(),
    connection: {
      ...actualMongoose.connection,
      db: {},
      useDb: jest.fn(),
    },
  };
});

import request from 'supertest';
import mongoose from 'mongoose';
import * as indexModule from '../index';

describe('index module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    delete process.env.PORT;
    delete process.env.MONGODB_URI;
    delete process.env.DATABASE_SELECTION;
  });

  it('exports the Express app', () => {
    expect(indexModule.app).toBeDefined();
    expect(typeof indexModule.app.use).toBe('function');
  });

  it('responds to health checks', async () => {
    const response = await request(indexModule.app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.timestamp).toBeDefined();
  });

  it('errorHandler returns a standard 500 response', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;
    const next = jest.fn();

    indexModule.errorHandler(new Error('boom'), {} as any, res, next as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    expect(next).not.toHaveBeenCalled();
  });

  it('connectDB calls mongoose.connect', async () => {
    const connectSpy = (mongoose.connect as jest.Mock).mockResolvedValue({} as any);

    await indexModule.connectDB();

    expect(connectSpy).toHaveBeenCalled();
  });

  it('connectDB throws when connection fails', async () => {
    const connectMock = (mongoose.connect as jest.Mock).mockRejectedValue(new Error('fail'));

    await expect(indexModule.connectDB()).rejects.toThrow('fail');
    expect(connectMock).toHaveBeenCalled();
  });

  it('connectDB uses the default database values when env vars are unset', async () => {
    delete process.env.MONGODB_URI;
    delete process.env.DATABASE_SELECTION;
    jest.resetModules();

    await jest.isolateModulesAsync(async () => {
      const freshIndexModule = await import('../index');
      const freshMongoose = await import('mongoose');
      const connectMock = (freshMongoose.default?.connect ?? freshMongoose.connect) as jest.Mock;
      connectMock.mockResolvedValue({} as any);

      await freshIndexModule.connectDB();

      expect(connectMock).toHaveBeenCalledWith('mongodb://localhost:27017/mflix_test');
    });
  });

  it('connectDB uses module-level database values from the environment when provided', async () => {
    process.env.MONGODB_URI = 'mongodb://example:27017/';
    process.env.DATABASE_SELECTION = '/custom_db';
    jest.resetModules();

    await jest.isolateModulesAsync(async () => {
      const freshIndexModule = await import('../index');
      const freshMongoose = await import('mongoose');
      const connectMock = (freshMongoose.default?.connect ?? freshMongoose.connect) as jest.Mock;
      connectMock.mockResolvedValue({} as any);

      await freshIndexModule.connectDB();

      expect(connectMock).toHaveBeenCalledWith('mongodb://example:27017/custom_db');
    });
  });

  it('startServer calls listen after connecting and executes callback', async () => {
    const connectMock = (mongoose.connect as jest.Mock).mockResolvedValue(undefined);
    const listenSpy = jest.spyOn(indexModule.app, 'listen').mockImplementation((...args: any[]) => {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        callback();
      }
      return { close: jest.fn() } as any;
    });

    await indexModule.startServer();

    expect(connectMock).toHaveBeenCalled();
    expect(listenSpy).toHaveBeenCalled();
  });

  it('startServer uses the default port when env is unset', async () => {
    delete process.env.PORT;
    jest.resetModules();

    await jest.isolateModulesAsync(async () => {
      const freshIndexModule = await import('../index');
      const freshMongoose = await import('mongoose');
      const connectMock = (freshMongoose.default?.connect ?? freshMongoose.connect) as jest.Mock;
      connectMock.mockResolvedValue(undefined);
      const listenSpy = jest.spyOn(freshIndexModule.app, 'listen').mockImplementation((...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback();
        }
        return { close: jest.fn() } as any;
      });

      await freshIndexModule.startServer();

      expect(connectMock).toHaveBeenCalled();
      expect(listenSpy).toHaveBeenCalledWith(5000, expect.any(Function));
    });
  });

  it('startServer uses the module-level port from the environment when provided', async () => {
    process.env.PORT = '4001';
    jest.resetModules();

    await jest.isolateModulesAsync(async () => {
      const freshIndexModule = await import('../index');
      const freshMongoose = await import('mongoose');
      const connectMock = (freshMongoose.default?.connect ?? freshMongoose.connect) as jest.Mock;
      connectMock.mockResolvedValue(undefined);
      const listenSpy = jest.spyOn(freshIndexModule.app, 'listen').mockImplementation((...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          callback();
        }
        return { close: jest.fn() } as any;
      });

      await freshIndexModule.startServer();

      expect(connectMock).toHaveBeenCalled();
      expect(listenSpy).toHaveBeenCalledWith('4001', expect.any(Function));
    });
  });

  it('executeRunServerIfMain calls runServer when the module is main', () => {
    const runServerSpy = jest.spyOn(indexModule, 'runServerInternal').mockResolvedValue(undefined);

    indexModule.executeRunServerIfMain('test-file', 'test-file');

    expect(runServerSpy).toHaveBeenCalled();

    runServerSpy.mockRestore();
  });

  it('executeRunServerIfMain does nothing when the module is not main', () => {
    const runServerSpy = jest.spyOn(indexModule, 'runServerInternal').mockResolvedValue(undefined);

    indexModule.executeRunServerIfMain('main-file', 'other-file');

    expect(runServerSpy).not.toHaveBeenCalled();

    runServerSpy.mockRestore();
  });

  it('startServer catches errors when connectDB fails', async () => {
    const connectSpy = (mongoose.connect as jest.Mock).mockRejectedValue(new Error('boom'));
    const listenSpy = jest.spyOn(indexModule.app, 'listen');

    await expect(indexModule.startServer()).rejects.toThrow('boom');

    expect(connectSpy).toHaveBeenCalled();
    expect(listenSpy).not.toHaveBeenCalled();
  });

  it('runServer exits when startServer fails', async () => {
    const runServerSpy = jest.spyOn(indexModule, 'runServerInternal');
    const startServerSpy = jest.spyOn(indexModule, 'startServerInternal').mockRejectedValue(new Error('boom'));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await indexModule.runServer();

    expect(startServerSpy).toHaveBeenCalled();
    expect(runServerSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    startServerSpy.mockRestore();
    runServerSpy.mockRestore();
  });

  it('isCurrentModuleMain returns true when the module is main', () => {
    const result = indexModule.isCurrentModuleMain('test-file', 'test-file');
    expect(result).toBe(true);
  });

  it('isCurrentModuleMain returns false when the module is not main', () => {
    const result = indexModule.isCurrentModuleMain(undefined, 'other-file');
    expect(result).toBe(false);
  });

  it('isCurrentModuleMain returns false when the module is not main', () => {
    const result = indexModule.isCurrentModuleMain('other-file');
    expect(result).toBe(false);
  });
});
