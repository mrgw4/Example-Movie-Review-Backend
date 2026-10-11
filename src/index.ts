import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import userRouter from './routes/users';
import movieRouter from './routes/movies';
import commentRouter from './routes/comments'
import testResetHandler from './testhelper/testResetHandler';


dotenv.config();

export const app: Express = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blog';
const database = process.env.DATABASE_SELECTION || '/blog_test';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// MongoDB Connection
/**
 * Connects to MongoDB using the configured URI and database selection.
 * @returns Promise that resolves when the database connection is established.
 * @throws {Error} when MongoDB connection fails.
 */
export async function connectDB(): Promise<void> {
    try {
        await mongoose.connect(mongoUri + database);
        console.log(mongoUri);
        console.log(database);
        console.log('MongoDB connected successfully');
        console.log(`Connected database: ${mongoose.connection.db?.databaseName}`);
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        throw error;
    }
}

// Routes
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

app.use('/api/users', userRouter);
app.use('/api/movies', movieRouter);
app.use('/api/comments', commentRouter)
app.use('/api/testreset', testResetHandler);

/**
 * Express error handler that converts unexpected errors into a standard 500 response.
 * @param _err The error object captured by Express.
 * @param _req The incoming request object.
 * @param res The response object used to send the error response.
 * @param _next The next middleware function in the chain.
 */
export function errorHandler(
    _err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error(_err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
}

app.use(errorHandler);

// Start server
/**
 * Starts the Express server after establishing a MongoDB connection.
 * @returns Promise that resolves when the HTTP server starts.
 * @throws {Error} when the database connection or listening fails.
 */
export let startServerInternal = async (): Promise<void> => {
    await connectDB();
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
};

export async function startServer(): Promise<void> {
    return startServerInternal();
}

/**
 * Runs the server startup process and exits on error.
 * @returns Promise that resolves when the server starts or the process exits.
 */
export let runServerInternal = async (): Promise<void> => {
    try {
        await startServerInternal();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

export async function runServer(): Promise<void> {
    return runServerInternal();
}

/**
 * Determines whether the current module is the process entry point.
 * @param mainFilename The filename returned by require.main?.filename.
 * @param currentFilename The filename of this module.
 * @returns True when the current module is the process entry point.
 */
export function isCurrentModuleMain(
    mainFilename: string | undefined = require.main?.filename,
    currentFilename: string = __filename
): boolean {
    return mainFilename === currentFilename;
}

/**
 * Runs the server when the module is executed directly.
 * @param mainFilename The filename returned by require.main?.filename.
 * @param currentFilename The filename of this module.
 */
export function executeRunServerIfMain(
    mainFilename: string | undefined = require.main?.filename,
    currentFilename: string = __filename
): void {
    if (isCurrentModuleMain(mainFilename, currentFilename)) {
        void runServer();
    }
}

executeRunServerIfMain();
