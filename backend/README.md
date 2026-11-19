# SkillForge — Backend

A standalone student platform for exploring career blueprints, identifying skill gaps, and following personalized learning roadmaps.

The backend is a Node.js + Express + MongoDB REST API secured with JWT and bcryptjs.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (CommonJS) |
| Framework | Express |
| Database | MongoDB (Mongoose) |
| Authentication | jsonwebtoken + bcryptjs |
| Configuration | dotenv |

## Project Structure

```text
backend/
├── server.js
├── package.json
├── .env.example
├── config/
│   └── db.js
├── models/
│   ├── User.js
│   └── Career.js
├── middleware/
│   └── authMiddleware.js
├── routes/
│   ├── authRoutes.js
│   └── apiRoutes.js
└── utils/
    └── seed.js
```

Progress is stored as a subdocument on `User`; progress endpoints are in `apiRoutes.js`.

## Prerequisites

- Node.js 18+ and npm
- A MongoDB connection string (Atlas or local, e.g. `mongodb://127.0.0.1:27017/skillforge`)

## Setup

Install dependencies from this directory:

```bash
npm install
```

Copy `.env.example` to `.env` and set the values:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/skillforge
JWT_SECRET=replace_with_a_long_random_string
CLIENT_ORIGIN=http://127.0.0.1:5500
```

`JWT_SECRET` should be a long, random value. The server allows local origins on ports 5000 and 5500 and `https://hoppscotch.io`; add other frontend origins through `CLIENT_ORIGIN` or the comma-separated `CLIENT_URL` value.

Start the API:

```bash
npm start
```

For development with automatic restarts:

```bash
npm run dev
```

The server connects to MongoDB before listening on the configured port. Check its health at:

```text
GET http://localhost:5000/api/health
```

## Database Seeding

Seed the built-in career blueprints with `npm run seed` from `backend/`. Use `npm run seed:reset` to replace existing blueprint records with the seed data.

## API Endpoints

### Public

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | `{ "name", "email", "password" }` | Create a student account |
| POST | `/api/auth/login` | `{ "email", "password" }` | Return a JWT valid for one day |
| GET | `/api/careers` | — | List career blueprints |

### Protected

Send `Authorization: Bearer <token>` with each request.

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/careers` | `{ "title", "description", "difficultyLevel", "requiredSkills": [] }` | Create a career blueprint |
| POST | `/api/gap-analysis` | `{ "careerId", "possessedSkills": [] }` | Return required skills not possessed |
| GET | `/api/progress/:careerId` | — | Read the authenticated user's progress |
| PATCH | `/api/progress` | `{ "careerId", "updates": [{ "skillName", "task", "completed" }] }` | Mark tasks complete or incomplete |

On `skill-gap.html`, guests can compute up to five assessments locally; signing in enables saved gap analysis and roadmap progress.

## Quick API Test Flow

1. Register with `POST /api/auth/register`.
2. Log in with `POST /api/auth/login` and copy the returned token.
3. Use the token as a Bearer token for protected requests.
4. Call public `GET /api/careers` and copy a career `_id`.
5. Call protected `POST /api/gap-analysis` with `{ "careerId": "<id>", "possessedSkills": ["HTML5 & CSS3"] }`.
6. Mark a task complete with `PATCH /api/progress` and a body containing `careerId` and `updates`.
7. Confirm saved progress with `GET /api/progress/<careerId>`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `MONGO_URI missing in .env` | Create `backend/.env` and set `MONGO_URI`. |
| `MODULE_NOT_FOUND` while starting | Check that dependencies are installed and route paths exist. |
| `401 Not authorized` | Log in again and send the current Bearer token. |
| Browser CORS error | Set `CLIENT_ORIGIN` to the frontend URL in `.env`. |
| No careers returned | Run `npm run seed` from `backend/` to add the built-in career blueprints. |

## License

SkillForge is a standalone student project for career planning and skill development.
