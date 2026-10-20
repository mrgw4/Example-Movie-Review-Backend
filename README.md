# Example-Movie-Review-Backend

A REST API built with **Express 5, TypeScript, MongoDB, and Mongoose**, providing user account management, JWT-based authentication with server-side session validation, movie search and administration, and comment management over the MFlix dataset.

The project includes request validation with Zod, password hashing with bcrypt, admin-only movie write operations, automated Jest and Supertest tests, and a development database reset utility.

## Features

- **User accounts:** Registration, login, logout, profile updates, password changes, and account deletion.
- **Authentication and authorization:** JWT bearer tokens validated against MongoDB session records, with separate admin membership checks for movie administration.
- **Movie API:** Paginated retrieval, text and array filters, numeric and date ranges, sorting, and admin-protected create, update, and delete operations.
- **Comment API:** Comment creation, retrieval, updates, and deletion, with author and admin permissions.
- **Request validation:** Zod schemas validate user input, movie documents, and movie query parameters.
- **Password security:** User passwords are hashed with bcrypt.
- **Automated testing:** Jest and Supertest cover routes, services, validation, authentication, authorization, and error handling.
- **Postman collection:** An importable collection containing user, movie, and comment requests, including success and error scenarios.
- **Development database reset:** A utility for restoring MFlix data into a disposable development or test database and creating a test administrator.

## Technology Stack

- TypeScript and Node.js
- Express 5
- MongoDB and Mongoose
- JSON Web Tokens (JWT) and bcrypt
- Zod
- Jest and Supertest
- Postman

## Requirements

- Node.js 20 or newer
- npm
- MongoDB, local or hosted
- The `sample_mflix` database if you plan to use the reset endpoint

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@name-of-your-cluster.mongodb.net
DATABASE_SELECTION=/blog_test
JWT_SECRET=your_jwt_secret_key_here_change_in_production
PORT=5000
NODE_ENV=development
```

Replace the URI placeholders with your MongoDB Atlas credentials and cluster host. Percent-encode reserved characters in the username or password, and ensure your MongoDB deployment is accessible from your development environment.

The application appends `DATABASE_SELECTION` to `MONGODB_URI`, so keep the database name out of the URI. With the example settings, the resulting connection string is:

```text
mongodb+srv://<username>:<password>@name-of-your-cluster.mongodb.net/blog_test
```

`DATABASE_SELECTION` defaults to `/blog_test`, and `PORT` defaults to `5000`. The MongoDB account must have the permissions required by the operations you intend to run.

### 3. Start the development server

```bash
npm run dev
```

The server connects to MongoDB before it starts listening. With the default port, the API is available at `http://localhost:5000`.

`GET /health` returns a status and timestamp.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the TypeScript server with Nodemon and ts-node |
| `npm test` | Run the Jest test suite with configured global coverage thresholds |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm start` | Run the compiled server from `dist/index.js` |

## Testing and Coverage

The backend uses Jest and Supertest to test route handlers, services, database interactions, authentication, authorization, validation, and error handling.

The latest reported Jest coverage run passed all **363 tests across 11 test suites**.

| Coverage metric | Result |
| --- | ---: |
| Statements | 100% |
| Branches | 98.34% |
| Functions | 98.78% |
| Lines | 100% |
| Test suites passed | 11 / 11 |
| Tests passed | 363 / 363 |

All statements and lines are covered. The remaining uncovered branches are concentrated in route handlers, with some function coverage remaining in the server entry-point wrapper.

Run the complete test suite with:

```bash
npm test
```

## API Reference

All request and response bodies use JSON. Protected routes use an authorization header in the form:

```http
Authorization: Bearer <token>
```

### Health

| Method and path | Behaviour |
| --- | --- |
| `GET /health` | Returns `{ "status": "OK", "timestamp": "..." }` |

### Users

| Method and path | Behaviour and access |
| --- | --- |
| `GET /api/users?page=1&limit=20` | Returns paginated users without email addresses or passwords. Limit is capped at 100. |
| `POST /api/users` | Creates an account. Requires `name` (4–25 characters), `email`, and `password` (6–100 characters). |
| `POST /api/users/login` | Accepts `email` and `password`; returns a one-hour JWT and basic user details. |
| `POST /api/users/logout` | Deletes the session associated with the supplied Bearer token. |
| `GET /api/users/:id` | Returns a user without their password. Email is included when a valid session token is supplied; otherwise, it is omitted. |
| `PUT /api/users/:id` | Updates the authenticated user's own `name` and/or `email`. Changes are synchronized to their comments. |
| `DELETE /api/users/:id` | Deletes the authenticated user's own account and session. |
| `POST /api/users/:id/change-password` | Changes the authenticated user's password using `oldPassword` and `newPassword`. |

User passwords are hashed with bcrypt. Session verification checks both the JWT and its corresponding MongoDB session record. Admin membership is stored separately in the `admins` collection and is required for movie write operations.

### Movies

| Method and path | Behaviour and access |
| --- | --- |
| `GET /api/movies` | Returns paginated movies and pagination metadata. Supports the filters below. |
| `GET /api/movies/:id` | Returns one movie by MongoDB ObjectId. |
| `POST /api/movies` | Creates a movie; requires an admin Bearer token and a valid movie document. |
| `PUT /api/movies/:id` | Updates allowed movie fields; requires an admin Bearer token. |
| `DELETE /api/movies/:id` | Deletes a movie; requires an admin Bearer token. |

Movie list query parameters include:

- **Pagination:** `page` (default `1`) and `limit` (default `20`, maximum `100`).
- **Text filters:** `title`, `plot`, and `fullplot` use case-insensitive partial matching.
- **Exact filters:** `rated` and `type`.
- **Array membership filters:** `cast`, `countries`, `directors`, `genres`, `languages`, and `writers`.
- **Numeric ranges:** Minimum and maximum values for awards wins (`awardsWinsMin`, `awardsWinsMax`), award nominations (`awardsNominationsMin`, `awardsNominationsMax`), IMDb rating (`imdbRatingMin`, `imdbRatingMax`), Metacritic (`metacriticMin`, `metacriticMax`), runtime (`runtimeMin`, `runtimeMax`), year (`yearMin`, `yearMax`), Rotten Tomatoes viewer meter (`tomatoesMeterMin`, `tomatoesMeterMax`), and viewer rating (`tomatoesRatingMin`, `tomatoesRatingMax`).
- **Release dates:** `releasedMin` and `releasedMax`.
- **Sorting:** `sort` supports `title`, `year`, `runtime`, `released`, `metacritic`, `imdbRating`, `tomatoesMeter`, and `tomatoesRating`. `order` is `asc` or `desc`; the defaults are `title` and `asc`.

Minimum range values must not exceed their corresponding maximum values.

Movie creation validates the MFlix document shape, including `awards`, `imdb`, `lastupdated`, `num_mflix_comments`, `title`, `type`, and `year`. Movie updates ignore fields outside the route's allowlist.

Example request:

```bash
curl "http://localhost:5000/api/movies?page=1&limit=10"
```

### Comments

The comment router is mounted at `/api/comments`.

| Method and path | Behaviour and access |
| --- | --- |
| `GET /api/comments?userId=<id>&movieId=<id>&page=1&limit=20` | Lists comments filtered by either or both IDs. At least one filter is required. Returns pagination metadata without author email addresses. |
| `GET /api/comments/:id` | Returns one comment by MongoDB ObjectId without the author's email address. |
| `POST /api/comments` | Creates a comment for the authenticated user. Requires a Bearer token, `movie_id` referencing an existing movie, and `text`. Author details come from the account. |
| `PUT /api/comments/:id` | Updates a comment's `text`. Requires the comment author or an admin. |
| `DELETE /api/comments/:id` | Deletes a comment. Requires the comment author or an admin. |

Comment creation requests use `POST /api/comments` with `movie_id` and `text` in the JSON body.

## Postman Collection

The importable collection is [Mflix Collection.postman_collection.json](Mflix%20Collection.postman_collection.json).

In Postman, choose **Import** and select the file. The collection contains request folders for users, movies, and comments, with success and error scenarios.

Requests target `http://localhost:5000`, so run the server on its default port or edit the collection URLs. Collection scripts use Postman environment variables to retain generated emails, IDs, and authentication tokens while requests run.

## Test Database Reset

`POST /api/testreset/reset` provides a development and testing utility for restoring the configured database from the MongoDB `sample_mflix` dataset.

The route uses `MONGODB_URI` to connect to MongoDB and selects `sample_mflix` as the source database and the normalized `DATABASE_SELECTION` value as the target database. `DATABASE_SELECTION` defaults to `/blog_test`. Both databases must be on the same MongoDB deployment, and the MongoDB account must have the necessary read and write permissions.

### Reset behaviour

For each of the `movies`, `comments`, and `users` collections, the route copies the source documents into the target collection, replacing its existing contents. It then creates a test administrator account:

- **Email:** `admin@test.local`
- **Password:** `admin123`

The administrator's password is hashed using bcrypt, and a corresponding record is created in the `admins` collection.

Other target collections, including `sessions`, are not reset. The source collections are copied as-is, so their contents and the target collection indexes must be compatible. If a source collection is missing or empty, its corresponding target collection will be emptied.

### Safety considerations

This endpoint is intended for disposable development and test databases, not production use.

- The route has no authentication and should not be exposed to untrusted clients.
- A basic safeguard refuses to reset a database unless its normalized name contains `test`, case-insensitively. This helps prevent accidental resets but is not a substitute for access control or proper database isolation.
- The reset is not transactional. If an operation fails partway through, the target database may be left partially reset.
- The seeded administrator credentials are fixed development credentials. Do not use them for production accounts.

The utility is most appropriate for an isolated test database containing the expected MFlix dataset, with no important data that needs to be preserved.

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