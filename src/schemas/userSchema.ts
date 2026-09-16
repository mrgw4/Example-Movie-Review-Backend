import { z } from 'zod';

export const CreateUserSchema = z.object({
    name: z.string().min(4).max(25),
    email: z.email(),
    password: z.string().min(6).max(100)
});