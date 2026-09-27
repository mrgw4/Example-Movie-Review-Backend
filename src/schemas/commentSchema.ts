import { z } from 'zod';
import mongoose from 'mongoose';

export const commentQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
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