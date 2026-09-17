import { buildMovieFilter, buildMovieSort } from '../../src/services/queries/movieQuery';
import { movieQuerySchema } from '../../src/schemas/movieQuerySchema';

type RangeTest = [
    field: string,
    caseName: string,
    input: Record<string, number>,
    expected: Record<string, number | Record<string, number>>
];

const numericRanges = [
    ['awardsWins', 'awards.wins'],
    ['awardsNominations', 'awards.nominations'],
    ['imdbRating', 'imdb.rating'],
    ['metacritic', 'metacritic'],
    ['runtime', 'runtime'],
    ['year', 'year'],
    ['tomatoesMeter', 'tomatoes.viewer.meter'],
    ['tomatoesRating', 'tomatoes.viewer.rating'],
] as const;

const rangeTests: RangeTest[] = numericRanges.flatMap(([field, mongoField]) => [
    [
        field,
        'min only',
        { [`${field}Min`]: 5 },
        { [mongoField]: { $gte: 5 } }
    ],
    [
        field,
        'max only',
        { [`${field}Max`]: 10 },
        { [mongoField]: { $lte: 10 } }
    ],
    [
        field,
        'min and max',
        {
            [`${field}Min`]: 5,
            [`${field}Max`]: 10
        },
        {
            [mongoField]: {
                $gte: 5,
                $lte: 10
            }
        }
    ]
]);

describe('buildMovieFilter', () => {

    it('returns an empty filter when no filters are supplied', () => {
        const query = movieQuerySchema.parse({});

        const filter = buildMovieFilter(query);

        expect(filter).toEqual({});
    });

    it.each([
        ['title', 'star'],
        ['plot', 'space'],
        ['fullplot', 'adventure'],
    ])('%s creates a case-insensitive contains filter', (field, value) => {
        const query = movieQuerySchema.parse({
            [field]: value
        });

        expect(buildMovieFilter(query)).toEqual({
            [field]: {
                $regex: value,
                $options: 'i'
            }
        });
    });

    it.each([
        ['cast', 'Tom Hanks'],
        ['countries', 'USA'],
        ['directors', 'Christopher Nolan'],
        ['genres', 'Sci-Fi'],
        ['languages', 'English'],
        ['writers', 'Stephen King'],
    ])('%s creates an array membership filter', (field, value) => {
        const query = movieQuerySchema.parse({
            [field]: value
        });

        expect(buildMovieFilter(query)).toEqual({
            [field]: value
        });
    });

    it.each([
        ['rated', 'PG-13'],
        ['type', 'movie'],
    ])('%s creates an exact-value filter', (field, value) => {
        const query = movieQuerySchema.parse({
            [field]: value
        });

        expect(buildMovieFilter(query)).toEqual({
            [field]: value
        });
    });

    it.each(rangeTests)(
        '%s builds the %s range correctly',
        (_field, _caseName, input, expected) => {
            const query = movieQuerySchema.parse(input);

            expect(buildMovieFilter(query)).toEqual(expected);
        }
    );

    it.each([
        [
            'minimum',
            { releasedMin: new Date('2000-01-01') },
            {
                released: {
                    $gte: new Date('2000-01-01')
                }
            }
        ],
        [
            'maximum',
            { releasedMax: new Date('2020-12-31') },
            {
                released: {
                    $lte: new Date('2020-12-31')
                }
            }
        ],
        [
            'range',
            {
                releasedMin: new Date('2000-01-01'),
                releasedMax: new Date('2020-12-31')
            },
            {
                released: {
                    $gte: new Date('2000-01-01'),
                    $lte: new Date('2020-12-31')
                }
            }
        ]
    ])('builds released date filter for %s', (_description, input, expected) => {
        const query = movieQuerySchema.parse(input);

        expect(buildMovieFilter(query)).toEqual(expected);
    });
});

describe('buildMovieSort', () => {

    it('returns an title sort when no sort parameters are supplied', () => {
        const query = movieQuerySchema.parse({});

        const sort = buildMovieSort(query);

        expect(sort).toEqual({ title: 1, });
    });

    it.each([
        ['title', 'asc', { title: 1 }],
        ['title', 'desc', { title: -1 }],
        ['year', 'asc', { year: 1 }],
        ['year', 'desc', { year: -1 }],
        ['runtime', 'asc', { runtime: 1 }],
        ['runtime', 'desc', { runtime: -1 }],
        ['released', 'asc', { released: 1 }],
        ['released', 'desc', { released: -1 }],
        ['metacritic', 'asc', { metacritic: 1 }],
        ['metacritic', 'desc', { metacritic: -1 }],
        ['imdbRating', 'asc', { 'imdb.rating': 1 }],
        ['imdbRating', 'desc', { 'imdb.rating': -1 }],
        ['tomatoesMeter', 'asc', { 'tomatoes.viewer.meter': 1 }],
        ['tomatoesMeter', 'desc', { 'tomatoes.viewer.meter': -1 }],
        ['tomatoesRating', 'asc', { 'tomatoes.viewer.rating': 1 }],
        ['tomatoesRating', 'desc', { 'tomatoes.viewer.rating': -1 }]
    ])('%s %s', (sort, order, expected) => {
        const query = movieQuerySchema.parse({
            sort,
            order
        });

        expect(buildMovieSort(query)).toEqual(expected);
    });

});