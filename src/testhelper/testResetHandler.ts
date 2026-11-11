import { Router, Request, Response } from 'express';

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const router = Router();

const SOURCE_DB_NAME = 'sample_mflix';

const COLLECTIONS_TO_COPY = ['movies', 'comments', 'users'];

const SALT_ROUNDS = 12;

// Test account used after a database reset.
// These credentials are for development/testing only.
const TEST_ADMIN_NAME = 'Test Admin';
const TEST_ADMIN_EMAIL = 'admin@test.local';
const TEST_ADMIN_PASSWORD = 'admin123';

/**
 * Normalises a database selection string by removing any leading slashes.
 *
 * @param dbSelection The raw database selection string from environment config.
 * @returns The normalized database name.
 */
export function normaliseDbName(dbSelection: string): string {
  return dbSelection.replace(/^\/+/, '').trim();
}

/**
 * Copies documents from a source database collection into a target database collection.
 *
 * @param sourceDb The source database instance.
 * @param targetDb The target database instance.
 * @param collectionName The collection name to copy.
 * @returns The number of documents copied.
 */
export async function copyCollection(
  sourceDb: mongoose.mongo.Db,
  targetDb: mongoose.mongo.Db,
  collectionName: string
): Promise<number> {
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);

  const docs = await sourceCollection.find({}).toArray();

  await targetCollection.deleteMany({});

  if (docs.length > 0) {
    await targetCollection.insertMany(docs);
  }

  return docs.length;
}

/**
 * Creates the known test administrator account and configures
 * the admins collection to reference that account.
 *
 * The password is hashed using bcrypt so that the account can
 * authenticate through the normal login process.
 *
 * @param targetDb The target test database.
 * @returns The ID of the created test administrator.
 */
export async function createTestAdmin(
  targetDb: mongoose.mongo.Db
): Promise<mongoose.Types.ObjectId> {
  const usersCollection = targetDb.collection('users');
  const adminsCollection = targetDb.collection('admins');

  const hashedPassword = await bcrypt.hash(
    TEST_ADMIN_PASSWORD,
    SALT_ROUNDS
  );

  const userResult = await usersCollection.insertOne({
    name: TEST_ADMIN_NAME,
    email: TEST_ADMIN_EMAIL,
    password: hashedPassword,
  });

  const userId = userResult.insertedId;

  await adminsCollection.deleteMany({});

  await adminsCollection.insertOne({
    userId,
  });


  await adminsCollection.createIndex(
    { userId: 1 },
    { unique: true }
  );

  return userId;
}

/**
 * Resets the configured test database by copying documents from
 * the source dataset and creating a known test administrator.
 *
 * @returns An object mapping collection names to the number of
 *          documents copied, plus the number of admins created.
 * @throws {Error} When configuration is invalid, connection is
 *                 unavailable, or the source/target databases
 *                 cannot be accessed.
 */
export async function resetTestDatabase(): Promise<Record<string, number>> {
  const dbSelection = process.env.DATABASE_SELECTION || '/mflix_test';
  const targetDbName = normaliseDbName(dbSelection);

  if (!targetDbName) {
    throw new Error('DATABASE_SELECTION is missing or invalid');
  }

  // Safety guard: refuse to run unless the selected DB looks like a test DB.
  if (!targetDbName.toLowerCase().includes('test')) {
    throw new Error(
      `Refusing to reset database "${targetDbName}" because it does not appear to be a test database`
    );
  }

  const baseConnection = mongoose.connection;

  if (!baseConnection.db) {
    throw new Error('MongoDB is not connected');
  }

  const sourceConn = baseConnection.useDb(SOURCE_DB_NAME, {
    useCache: true,
  });

  const targetConn = baseConnection.useDb(targetDbName, {
    useCache: true,
  });

  const sourceDb = sourceConn.db;
  const targetDb = targetConn.db;

  if (!sourceDb) {
    throw new Error(
      `Could not access source database "${SOURCE_DB_NAME}"`
    );
  }

  if (!targetDb) {
    throw new Error(
      `Could not access target database "${targetDbName}"`
    );
  }

  const results: Record<string, number> = {};

  // Restore the standard MFlix collections.
  for (const collectionName of COLLECTIONS_TO_COPY) {
    const copiedCount = await copyCollection(
      sourceDb,
      targetDb,
      collectionName
    );

    results[collectionName] = copiedCount;
  }

  // Create the application's administrator configuration.
  await createTestAdmin(targetDb);

  results.admin = 1;

  return results;
}

/**
 * Express route handler for POST /reset.
 *
 * @param _req The incoming request object (unused).
 * @param res The Express response object.
 * @returns The response after attempting a database reset.
 */
export async function handleResetRouteInternal(
  _req: Request,
  res: Response,
  resetFn: () => Promise<Record<string, number>> = resetTestDatabase
): Promise<Response> {
  try {
    const copiedCollections = await resetFn();

    return res.status(200).json({
      message: 'Test database reset successfully',
      sourceDatabase: SOURCE_DB_NAME,
      targetDatabase: normaliseDbName(
        process.env.DATABASE_SELECTION || '/mflix_test'
      ),
      copiedCollections,
    });
  } catch (error) {
    console.error('Test database reset failed:', error);

    if (error instanceof Error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: 'Failed to reset test database',
    });
  }
}

export async function handleResetRoute(
  req: Request,
  res: Response
): Promise<Response> {
  return handleResetRouteInternal(req, res);
}

router.post('/reset', handleResetRoute);

export default router;