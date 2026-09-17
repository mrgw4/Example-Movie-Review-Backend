import { z } from 'zod';

const AwardsSchema = z.object({
    nominations: z.number(),
    text: z.string(),
    wins: z.number(),
});

const ImdbSchema = z.object({
    id: z.number(),
    rating: z.union([z.number(), z.string()]),
    votes: z.union([z.number(), z.string()]),
});

const TomatoesViewerSchema = z.object({
    meter: z.number().optional(),
    numReviews: z.number(),
    rating: z.number(),
});

const TomatoesCriticSchema = z.object({
    meter: z.number(),
    numReviews: z.number(),
    rating: z.number(),
});

const TomatoesSchema = z.object({
    boxOffice: z.string().optional(),
    consensus: z.string().optional(),
    critic: TomatoesCriticSchema.optional(),
    dvd: z.coerce.date().optional(),
    fresh: z.number().optional(),
    lastUpdated: z.coerce.date(),
    production: z.string().optional(),
    rotten: z.number().optional(),
    viewer: TomatoesViewerSchema,
    website: z.string().optional(),
});

export const MovieSchema = z.object({
    awards: AwardsSchema,
    imdb: ImdbSchema,
    lastupdated: z.string(),
    num_mflix_comments: z.number(),
    title: z.string(),
    type: z.string(),
    year: z.union([z.number(), z.string()]),
    cast: z.array(z.string()).optional(),
    countries: z.array(z.string()).optional(),
    directors: z.array(z.string()).optional(),
    fullplot: z.string().optional(),
    genres: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    metacritic: z.number().optional(),
    plot: z.string().optional(),
    poster: z.string().optional(),
    rated: z.string().optional(),
    released: z.coerce.date().optional(),
    runtime: z.number().optional(),
    tomatoes: TomatoesSchema.optional(),
    writers: z.array(z.string()).optional(),
});