import { z } from 'zod';

export const movieQuerySchema = z.object({
    // Pagination
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),

    // Text search
    title: z.string().optional(),
    plot: z.string().optional(),
    fullplot: z.string().optional(),

    // Array/string fields
    cast: z.string().optional(),
    countries: z.string().optional(),
    directors: z.string().optional(),
    genres: z.string().optional(),
    languages: z.string().optional(),
    writers: z.string().optional(),

    // Exact-value fields
    rated: z.string().optional(),
    type: z.string().optional(),

    // Awards
    awardsWinsMin: z.coerce.number().int().min(0).optional(),
    awardsWinsMax: z.coerce.number().int().min(0).optional(),

    awardsNominationsMin: z.coerce.number().int().min(0).optional(),
    awardsNominationsMax: z.coerce.number().int().min(0).optional(),

    // IMDb
    imdbRatingMin: z.coerce.number().min(0).max(10).optional(),

    imdbRatingMax: z.coerce.number().min(0).max(10).optional(),

    // Metacritic
    metacriticMin: z.coerce.number().int().min(0).max(100).optional(),
    metacriticMax: z.coerce.number().int().min(0).max(100).optional(),

    // Runtime
    runtimeMin: z.coerce.number().int().min(0).optional(),
    runtimeMax: z.coerce.number().int().min(0).optional(),

    // Year
    yearMin: z.coerce.number().int().min(0).optional(),
    yearMax: z.coerce.number().int().min(0).optional(),

    // Rotten Tomatoes
    tomatoesMeterMin: z.coerce.number().min(0).max(100).optional(),
    tomatoesMeterMax: z.coerce.number().min(0).max(100).optional(),

    tomatoesRatingMin: z.coerce.number().min(0).optional(),
    tomatoesRatingMax: z.coerce.number().min(0).optional(),

    // Dates
    releasedMin: z.coerce.date().optional(),
    releasedMax: z.coerce.date().optional(),

    lastupdatedMin: z.coerce.date().optional(),
    lastupdatedMax: z.coerce.date().optional(),

    // Sorting
    sort: z.enum([
        'title',
        'year',
        'runtime',
        'released',
        'lastupdated',
        'metacritic',
        'imdbRating',
        'tomatoesMeter',
        'tomatoesRating'
    ]).default('title'),

    order: z.enum(['asc', 'desc']).default('asc')
}).superRefine((data, ctx) => {
    const ranges = [
        ['awardsWinsMin', 'awardsWinsMax'],
        ['awardsNominationsMin', 'awardsNominationsMax'],
        ['imdbRatingMin', 'imdbRatingMax'],
        ['metacriticMin', 'metacriticMax'],
        ['runtimeMin', 'runtimeMax'],
        ['yearMin', 'yearMax'],
        ['tomatoesMeterMin', 'tomatoesMeterMax'],
        ['tomatoesRatingMin', 'tomatoesRatingMax'],
        ['releasedMin', 'releasedMax'],
        ['lastupdatedMin', 'lastupdatedMax']
    ] as const;

    for (const [minField, maxField] of ranges) {
        const min = data[minField];
        const max = data[maxField];

        if (min !== undefined && max !== undefined && min > max) {
            ctx.addIssue({
                code: 'custom',
                message: `${minField} must be less than or equal to ${maxField}`,
                path: [minField]
            });
        }
    }
});

export type MovieQuery = z.infer<typeof movieQuerySchema>;