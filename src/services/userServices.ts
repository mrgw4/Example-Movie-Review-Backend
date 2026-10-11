import User from '../models/User';
import Session from '../models/Session';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';
import mongoose from 'mongoose';
import Comment from '../models/Comment';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Retrieves all users from the database, omitting password and email fields.
 * @returns Promise resolving to the list of users.
 */
export async function getAllUsers() {
    return User.find().select('-password -email').sort({ name: -1 });
}

/**
 * Retrieves paginated users from the database, omitting password and email fields.
 * @param skip Number of documents to skip.
 * @param limit Number of documents to return.
 * @returns Promise resolving to the list of paginated users.
 */
export async function getUsersWithPagination(skip: number, limit: number) {
    return User.find()
        .select('-password -email')
        .skip(skip)
        .limit(limit)
        .sort({ name: -1 });
}

/**
 * Retrieves the total count of users in the database.
 * @returns Promise resolving to the total number of users.
 */
export async function getTotalUserCount() {
    return User.countDocuments();
}

/**
 * Retrieves a user by their ID from the database, omitting password and email fields.
 * @param id The user's ID.
 * @returns Promise resolving to the user document or null if not found.
 */
export async function getUser(id: string) {
    return User.findById(id);
}

/**
 * Creates a new user after validating that the email is not already in use.
 * The password is hashed before being saved.
 * @param userData The raw user payload containing name, email, and password.
 * @returns Promise resolving to the created user document.
 * @throws {Error} when the email is already in use.
 */
export async function createUser(userData: { name: string; email: string; password: string }) {

    const user = await User.findOne({ email: userData.email });

    if (user) {
        throw new Error('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

    return User.create({ name: userData.name, email: userData.email, password: hashedPassword, });
}

/**
 * Validates credentials and returns the authenticated user if successful.
 * @param email The user's email address.
 * @param password The user's plaintext password.
 * @returns Promise resolving to the authenticated user document.
 * @throws {Error} when authentication fails.
 */
export async function loginUser(email: string, password: string) {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
        throw new Error('Invalid credentials');
    }

    return user;
}

/**
 * Creates a new session for the authenticated user and returns the session document.
 * @param userId The authenticated user's ID.
 * @param token The JWT token for the session.
 * @returns Promise resolving to the created session document.
 */
export async function createSession(userId: string, token: string) {
    return Session.create({ user_id: userId, jwt: token });
}

/**
 * Verifies a session token and returns the session information if valid.
 * @param token The JWT token for the session.
 * @returns Promise resolving to the session information.
 * @throws {Error} when the token is invalid or expired.
 */
export async function verifySessionToken(token: string) {
    const session = await Session.findOne({ jwt: token });

    if (!session) {
        throw new Error('Invalid token');
    }

    const createdAt = session.createdAt instanceof Date ? session.createdAt : new Date(session.createdAt);
    const ageMs = Date.now() - createdAt.getTime();

    if (ageMs > TOKEN_MAX_AGE_MS) {
        await Session.deleteOne({ _id: session._id });
        throw new Error('Token expired');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string; email?: string };

    if (!decoded || !decoded.id) {
        await Session.deleteOne({ _id: session._id });
        throw new Error('Invalid token');
    }

    return { userId: decoded.id, email: decoded.email, session };
}

export async function verifyAdmin(token: string) {
    const { userId } = await verifySessionToken(token);

    const admin = await Admin.findOne({
        userId: new mongoose.Types.ObjectId(userId),
    });

    if (!admin) {
        throw new Error('User is not an admin');
    }

    return userId;
}

/**
 * Checks whether a valid session belongs to the comment author or an admin.
 * @param token The session token to verify.
 * @param commentEmail The email stored on the comment.
 * @returns Whether the session is authorized to edit the comment.
 * @throws {Error} when the session is invalid or an admin lookup fails.
 */
export async function canEditComment(token: string, commentEmail: string) {
    const { userId } = await verifySessionToken(token);
    const currentUser = await User.findById(userId);

    if (currentUser?.email === commentEmail) {
        return true;
    }

    const admin = await Admin.findOne({
        userId: new mongoose.Types.ObjectId(userId),
    });

    return Boolean(admin);
}

/**
 * Deletes a session token from the database, logging the user out.
 * @param token The JWT token for the session.
 * @returns Promise resolving to the deleted session document.
 */
export async function deleteSessionToken(token: string) {
    const deletedSession = await Session.findOneAndDelete({ jwt: token });

    if (!deletedSession) {
        throw new Error('Invalid token');
    }

    return deletedSession;
}

/**
 * Deletes a user and logs the user out.
 * @param userId The ID of the user to delete.
 * @param token The JWT token for the session for the deleted user.
 * @returns Promise resolving to the deleted user document.
 */
export async function deleteUser(userId: string, token: string) {
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
        throw new Error('User not found');
    }

    await deleteSessionToken(token);

    return deletedUser;
}

/**
 * Updates a user's profile information (name and/or email).
 * @param userId The ID of the user to update.
 * @param updateData Object containing optional name and/or email to update.
 * @returns Promise resolving to the updated user document.
 * @throws {Error} when the new email is already in use or user not found.
 */
export async function updateUser(userId: string, updateData: { name?: string; email?: string }) {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    // If email is being updated, check if it's already in use by another user
    if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findOne({ email: updateData.email });
        if (existingUser) {
            throw new Error('Email already in use');
        }
    }

    const previousName = user.name;
    const previousEmail = user.email;
    const commentUpdates: { name?: string; email?: string } = {};

    if (updateData.name) {
        user.name = updateData.name;
        if (updateData.name !== previousName) {
            commentUpdates.name = updateData.name;
        }
    }
    if (updateData.email) {
        user.email = updateData.email;
        if (updateData.email !== previousEmail) {
            commentUpdates.email = updateData.email;
        }
    }

    if (Object.keys(commentUpdates).length > 0) {
        await Comment.updateMany(
            { email: previousEmail },
            { $set: commentUpdates }
        );
    }

    try {
        return await user.save();
    } catch (error) {
        if (Object.keys(commentUpdates).length > 0) {
            user.name = previousName;
            user.email = previousEmail;
            const commentRollback: { name?: string; email?: string } = {};
            if (commentUpdates.name) {
                commentRollback.name = previousName;
            }
            if (commentUpdates.email) {
                commentRollback.email = previousEmail;
            }
            await Comment.updateMany(
                { email: commentUpdates.email ?? previousEmail },
                { $set: commentRollback }
            );
        }

        throw error;
    }
}

/**
 * Changes a user's password after verifying the old password.
 * @param userId The ID of the user.
 * @param oldPassword The user's current password.
 * @param newPassword The new password to set.
 * @returns Promise resolving to the updated user document.
 * @throws {Error} when old password is incorrect or user not found.
 */
export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    const passwordMatches = await bcrypt.compare(oldPassword, user.password);

    if (!passwordMatches) {
        throw new Error('Invalid password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.password = hashedPassword;

    return user.save();
}