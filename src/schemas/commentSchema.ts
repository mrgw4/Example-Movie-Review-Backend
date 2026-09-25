import { z } from 'zod';
import mongoose from 'mongoose';

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