# MFlix Blog Backend

An Express 5 and TypeScript API backed by MongoDB and Mongoose. The application works with MFlix movie data and provides user accounts, session-based JWT authentication, movie search and administration, and a development database reset utility.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB, local or hosted
- The `sample_mflix` database if you plan to use the reset endpoint

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root. The application loads it with `dotenv`.

```env
MONGODB_URI=mongodb://127.0.0.1:27017
DATABASE_SELECTION=/blog_test
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

The connection URI is assembled by concatenating `MONGODB_URI` and `DATABASE_SELECTION`. Keep the database name out of `MONGODB_URI`; for the example above, the resulting URI is `mongodb://127.0.0.1:27017/blog_test`. `DATABASE_SELECTION` defaults to `/blog_test`, and `PORT` defaults to `5000`.

Start the development server:

```bash
npm run dev
```

The server connects to MongoDB before it starts listening. The API is available at `http://localhost:5000` when using the default port. `GET /health` returns a status and timestamp.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the TypeScript server with Nodemon and ts-node |
| `npm test` | Run the Jest test suite, including the configured 90% global coverage thresholds |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm start` | Run the compiled server from `dist/index.js` |

## API

All request and response bodies are JSON. Protected routes use an authorization header in the form `Authorization: Bearer <token>`.

### Health

| Method and path | Behavior |
| --- | --- |
| `GET /health` | Returns `{ "status": "OK", "timestamp": "..." }` |

### Users

| Method and path | Behavior and access |
| --- | --- |
| `GET /api/users?page=1&limit=20` | Returns paginated users without email or password. Limit is capped at 100. |
| `POST /api/users` | Creates an account. Requires `name` (4-25 characters), `email`, and `password` (6-100 characters). |
| `POST /api/users/login` | Accepts `email` and `password`; returns a one-hour JWT and basic user details. |
| `POST /api/users/logout` | Deletes the session for the supplied Bearer token. |
| `GET /api/users/:id` | Returns a user without their password. Email is included when a valid session token is supplied; otherwise it is omitted. |
| `PUT /api/users/:id` | Updates the authenticated user's own `name` and/or `email`. A changed name or email is also synchronized to their comments. |
| `DELETE /api/users/:id` | Deletes the authenticated user's own account and session. |
| `POST /api/users/:id/change-password` | Changes the authenticated user's password; requires `oldPassword` and `newPassword`. |

User passwords are hashed with bcrypt. Session verification checks both the JWT and the corresponding session record in MongoDB. Admin membership is stored separately in the `admins` collection and is required for movie write operations.

### Movies

| Method and path | Behavior and access |
| --- | --- |
| `GET /api/movies` | Returns paginated movies and pagination metadata. Supports the filters below. |
| `GET /api/movies/:id` | Returns one movie by MongoDB ObjectId. |
| `POST /api/movies` | Creates a movie; requires an admin Bearer token and a valid movie document. |
| `PUT /api/movies/:id` | Updates allowed movie fields; requires an admin Bearer token. |
| `DELETE /api/movies/:id` | Deletes a movie; requires an admin Bearer token. |

Movie list query parameters include `page` (default `1`) and `limit` (default `20`, maximum `100`); case-insensitive partial text filters `title`, `plot`, and `fullplot`; exact filters `rated` and `type`; and string membership filters `cast`, `countries`, `directors`, `genres`, `languages`, and `writers`.

Numeric range filters accept minimum and maximum values for awards wins (`awardsWinsMin`, `awardsWinsMax`), award nominations (`awardsNominationsMin`, `awardsNominationsMax`), IMDb rating (`imdbRatingMin`, `imdbRatingMax`), Metacritic (`metacriticMin`, `metacriticMax`), runtime (`runtimeMin`, `runtimeMax`), year (`yearMin`, `yearMax`), Rotten Tomatoes viewer meter (`tomatoesMeterMin`, `tomatoesMeterMax`), and viewer rating (`tomatoesRatingMin`, `tomatoesRatingMax`). Release date ranges use `releasedMin` and `releasedMax`. Minimums must not exceed maximums.

Sorting uses `sort` and `order`. Supported sort values are `title`, `year`, `runtime`, `released`, `metacritic`, `imdbRating`, `tomatoesMeter`, and `tomatoesRating`. `order` is `asc` or `desc`; defaults are `title` and `asc`.

Movie creation validates the MFlix document shape, including `awards`, `imdb`, `lastupdated`, `num_mflix_comments`, `title`, `type`, and `year`. Movie updates ignore fields outside the route's allowlist.

### Comments

The comment router is mounted at `/api/comments`.

| Method and path | Behavior and access |
| --- | --- |
| `GET /api/comments?userId=<id>&movieId=<id>&page=1&limit=20` | Lists comments filtered by either or both IDs. At least one filter is required. Returns pagination metadata. |
| `GET /api/comments/:id` | Returns one comment by MongoDB ObjectId. |
| `POST /api/comments` | Creates a comment for the authenticated user. Requires a Bearer token and `movie_id` plus `text`; name and email are taken from the account. |
| `PUT /api/comments/:id` | Updates a comment's `text`. Requires the comment author or an admin. |
| `DELETE /api/comments/:id` | Deletes a comment. Requires the comment author or an admin. |

Comment creation requests use `/api/comments` with `movie_id` and `text` in the JSON body.

## Postman Collection

The importable collection is [Mflix Collection.postman_collection.json](Mflix%20Collection.postman_collection.json). In Postman, choose **Import** and select that file. It contains request folders for users, movies, and comments, with success and error scenarios. Requests target `http://localhost:5000`, so run the server on its default port or edit the collection URLs. Collection scripts use Postman environment variables to retain generated emails, IDs, and authentication tokens while requests run.

The collection's comment requests are not fully aligned with the current API: its create requests use `/api/comments/:movieId`, while the current API accepts creation at `POST /api/comments` with `movie_id` and `text` in the JSON body. The collection also includes comment update and delete requests. Review the create requests before using the collection as a complete comment API test suite.

## Test Database Reset

`POST /api/testreset/reset` is a destructive development/test utility. It clears the target `movies`, `comments`, and `users` collections, copies those collections from `sample_mflix`, then seeds an administrator account and the `admins` record.

The endpoint has no authentication. Its safeguard only refuses to run when the normalized `DATABASE_SELECTION` name does not contain `test`; this is not a substitute for access control. Do not expose this endpoint to untrusted clients or point it at production data. The seeded development account is `admin@test.local` with password `admin123`; change or remove it before using the application outside of a disposable test environment.

## Project Layout

```text
src/
   index.ts                 App setup, MongoDB connection, and mounted routes
   server.ts                Server entry-point wrapper
   models/                  Mongoose models for users, movies, comments, sessions, and admins
   routes/                  Express route handlers
   schemas/                 Zod request and query validation schemas
   services/                Database and application service functions
      queries/               Movie filter and sort construction
   testhelper/              Test database reset endpoint
   __tests__/               Jest route and service tests
```
