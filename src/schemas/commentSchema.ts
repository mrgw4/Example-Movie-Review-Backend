import { z } from 'zod';
import mongoose from 'mongoose';

export const commentQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    userId: z.string()
        .refine(
            (val) => mongoose.Types.ObjectId.isValid(val),
            {
                message: 'Invalid user ID',
            }
        ).optional(),
    movieId: z.string()
        .refine(
            (val) => mongoose.Types.ObjectId.isValid(val),
            {
                message: 'Invalid movie ID',
            }
        ).optional(),
})

export const commentSchema = z.object({
    text: z.string().min(1).max(500),
    name: z.string().min(1).max(50),
    email: z.string().email(),
    movie_id: z.string().refine(
        (val) => mongoose.Types.ObjectId.isValid(val),
        {
            message: 'Invalid movie ID',
        }
    ),
});

export const commentInputSchema = commentSchema
    .pick({ text: true, movie_id: true })
    .strict();

export const commentUpdateSchema = commentSchema
    .pick({ text: true })
    .strict();