import { MovieQuery } from '../../schemas/movieQuerySchema';
import { SortOrder } from 'mongoose';

type MovieFilter = Record<string, any>;

/**
 * Builds a MongoDB filter from the validated movie query parameters.
 * @param query Validated movie query parameters.
 * @returns MongoDB filter object.
 */
export function buildMovieFilter(query: MovieQuery): MovieFilter {
    const filter: MovieFilter = {};

    // Text searches
    if (query.title) {
        filter.title = {
            $regex: query.title,
            $options: 'i'
        };
    }

    if (query.plot) {
        filter.plot = {
            $regex: query.plot,
            $options: 'i'
        };
    }

    if (query.fullplot) {
        filter.fullplot = {
            $regex: query.fullplot,
            $options: 'i'
        };
    }

    // Array fields
    if (query.cast) {
        filter.cast = query.cast;
    }

    if (query.countries) {
        filter.countries = query.countries;
    }

    if (query.directors) {
        filter.directors = query.directors;
    }

    if (query.genres) {
        filter.genres = query.genres;
    }

    if (query.languages) {
        filter.languages = query.languages;
    }

    if (query.writers) {
        filter.writers = query.writers;
    }

    // Exact matches
    if (query.rated) {
        filter.rated = query.rated;
    }

    if (query.type) {
        filter.type = query.type;
    }

    // Awards
    if (
        query.awardsWinsMin !== undefined ||
        query.awardsWinsMax !== undefined
    ) {
        filter['awards.wins'] = {};

        if (query.awardsWinsMin !== undefined) {
            filter['awards.wins'].$gte = query.awardsWinsMin;
        }

        if (query.awardsWinsMax !== undefined) {
            filter['awards.wins'].$lte = query.awardsWinsMax;
        }
    }

    if (
        query.awardsNominationsMin !== undefined ||
        query.awardsNominationsMax !== undefined
    ) {
        filter['awards.nominations'] = {};

        if (query.awardsNominationsMin !== undefined) {
            filter['awards.nominations'].$gte = query.awardsNominationsMin;
        }

        if (query.awardsNominationsMax !== undefined) {
            filter['awards.nominations'].$lte = query.awardsNominationsMax;
        }
    }

    // IMDb rating
    if (
        query.imdbRatingMin !== undefined ||
        query.imdbRatingMax !== undefined
    ) {
        filter['imdb.rating'] = {};

        if (query.imdbRatingMin !== undefined) {
            filter['imdb.rating'].$gte = query.imdbRatingMin;
        }

        if (query.imdbRatingMax !== undefined) {
            filter['imdb.rating'].$lte = query.imdbRatingMax;
        }
    }

    // Metacritic
    if (
        query.metacriticMin !== undefined ||
        query.metacriticMax !== undefined
    ) {
        filter.metacritic = {};

        if (query.metacriticMin !== undefined) {
            filter.metacritic.$gte = query.metacriticMin;
        }

        if (query.metacriticMax !== undefined) {
            filter.metacritic.$lte = query.metacriticMax;
        }
    }

    // Runtime
    if (
        query.runtimeMin !== undefined ||
        query.runtimeMax !== undefined
    ) {
        filter.runtime = {};

        if (query.runtimeMin !== undefined) {
            filter.runtime.$gte = query.runtimeMin;
        }

        if (query.runtimeMax !== undefined) {
            filter.runtime.$lte = query.runtimeMax;
        }
    }

    // Year
    if (
        query.yearMin !== undefined ||
        query.yearMax !== undefined
    ) {
        filter.year = {};

        if (query.yearMin !== undefined) {
            filter.year.$gte = query.yearMin;
        }

        if (query.yearMax !== undefined) {
            filter.year.$lte = query.yearMax;
        }
    }

    // Released date
    if (
        query.releasedMin !== undefined ||
        query.releasedMax !== undefined
    ) {
        filter.released = {};

        if (query.releasedMin !== undefined) {
            filter.released.$gte = query.releasedMin;
        }

        if (query.releasedMax !== undefined) {
            filter.released.$lte = query.releasedMax;
        }
    }

    // Rotten Tomatoes viewer meter
    if (
        query.tomatoesMeterMin !== undefined ||
        query.tomatoesMeterMax !== undefined
    ) {
        filter['tomatoes.viewer.meter'] = {};

        if (query.tomatoesMeterMin !== undefined) {
            filter['tomatoes.viewer.meter'].$gte = query.tomatoesMeterMin;
        }

        if (query.tomatoesMeterMax !== undefined) {
            filter['tomatoes.viewer.meter'].$lte = query.tomatoesMeterMax;
        }
    }

    // Rotten Tomatoes viewer rating
    if (
        query.tomatoesRatingMin !== undefined ||
        query.tomatoesRatingMax !== undefined
    ) {
        filter['tomatoes.viewer.rating'] = {};

        if (query.tomatoesRatingMin !== undefined) {
            filter['tomatoes.viewer.rating'].$gte = query.tomatoesRatingMin;
        }

        if (query.tomatoesRatingMax !== undefined) {
            filter['tomatoes.viewer.rating'].$lte = query.tomatoesRatingMax;
        }
    }

    return filter;
}

/**
 * Builds the MongoDB sort object from the validated query parameters.
 * @param query Validated movie query parameters.
 * @returns MongoDB sort object.
 */
export function buildMovieSort(query: MovieQuery) {
    const direction: SortOrder = query.order === 'desc' ? -1 : 1;

    const sortFields = {
        title: 'title',
        year: 'year',
        runtime: 'runtime',
        released: 'released',
        metacritic: 'metacritic',
        imdbRating: 'imdb.rating',
        tomatoesMeter: 'tomatoes.viewer.meter',
        tomatoesRating: 'tomatoes.viewer.rating'
    } as const;

    return {
        [sortFields[query.sort]]: direction
    };
}