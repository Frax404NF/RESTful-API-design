# Habit Tracker API

A production-ready REST API built with **Node.js**, **Express**, **TypeScript**, and **Drizzle ORM** — with a PostgreSQL database hosted on Neon. Built as part of the [API Design with Node.js v5](https://frontendmasters.com/courses/api-design-nodejs-v5) course on Frontend Masters.

> 📖 **Full API Documentation:** See [API_DOCS.md](./API_DOCS.md) for all endpoints, request/response schemas, and usage examples.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 23+ |
| Framework | Express.js v5 |
| Language | TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Neon) |
| Auth | JWT (via `jose`) |
| Validation | Zod v4 |
| Testing | Vitest + Supertest |
| Security | Helmet, CORS, Rate Limiting |

---

## Project Structure

```
src/
├── controller/         # Request handlers (business logic)
│   ├── authController.ts
│   ├── habitController.ts
│   ├── tagController.ts
│   └── userController.ts
├── db/
│   ├── connection.ts   # Database pool (singleton via @epic-web/remember)
│   └── schema.ts       # Drizzle schema + Zod types
├── middleware/
│   ├── auth.ts         # JWT authentication middleware
│   ├── errorHandler.ts # Centralized error handling + APIError class
│   └── validation.ts   # Zod body/params validation middleware
├── routes/
│   ├── authRoutes.ts
│   ├── habitRoutes.ts
│   ├── tagRoutes.ts
│   └── userRoutes.ts
├── utils/
│   ├── jwt.ts          # Token sign/verify helpers
│   └── password.ts     # bcrypt hash/compare helpers
└── server.ts           # Express app setup, middleware, route mounting
tests/
├── setup/
│   ├── globalSetup.ts  # Vitest global DB connection check
│   └── dbHelpers.ts    # Test utility functions
├── auth.test.ts        # Auth integration tests
└── setup.test.ts       # DB connectivity test
```

---

## Key Features

- ✅ **JWT Authentication** — Secure Bearer token-based auth on all protected routes
- ✅ **CRUD for Habits** — Create, read, update, and delete habits with tag associations
- ✅ **Tag System** — Many-to-many relationship between habits and tags via junction table
- ✅ **Habit Completions** — Log daily completions with duplicate-per-day prevention (409 Conflict)
- ✅ **Habit Statistics** — Current streak, longest streak, total completions, and completion percentage
- ✅ **User Profiles** — Secure profile management with 3-step password change flow
- ✅ **Zod Validation** — Schema-validated request bodies and URL params with descriptive errors
- ✅ **Rate Limiting** — 20 req/15min on auth, 500 req/15min on general endpoints
- ✅ **DB Transactions** — Atomic multi-table operations (e.g., habit + tag creation)
- ✅ **Integration Tests** — Vitest + Supertest testing against a real PostgreSQL test database

---

## Getting Started

### Prerequisites

- Node.js 23.6.0 or higher
- A PostgreSQL database (Neon free tier works perfectly)

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Authentication
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars-long

# Server
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Security
BCRYPT_ROUNDS=10
```

---

## Running Tests

```bash
# Run all integration tests
npm test

# Run a specific test file
npm test auth.test

# Run in watch mode
npm run test:watch
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot-reload |
| `npm test` | Run all tests (Vitest) |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |

---

## API Overview

```
POST   /api/auth/register         Register new user
POST   /api/auth/login            Login and get JWT token

GET    /api/habits                Get all habits (paginated)
POST   /api/habits                Create new habit
GET    /api/habits/:id            Get single habit with entries
PUT    /api/habits/:id            Update habit
DELETE /api/habits/:id            Delete habit
POST   /api/habits/:id/complete   Log habit completion (once/day)
GET    /api/habits/:id/stats      Get streak & completion stats

GET    /api/users/profile         Get user profile
PUT    /api/users/profile         Update profile
POST   /api/users/change-password Change password

GET    /api/tags                  List all tags
GET    /api/tags/popular          Top 10 tags by usage
GET    /api/tags/:id              Get tag with associated habits
POST   /api/tags                  Create tag
PUT    /api/tags/:id              Update tag
DELETE /api/tags/:id              Delete tag
```

> See [API_DOCS.md](./API_DOCS.md) for full schema documentation with examples.

---

## Learning Context

This project was built while following the **API Design with Node.js v5** course on Frontend Masters. The primary goal was to learn and implement:

- RESTful API design patterns and HTTP semantics
- Database transactions and relational query patterns with Drizzle ORM
- Secure authentication flows using JWT
- Middleware-based validation and error handling in Express
- CRUD Implementation
- Integration testing with Vitest and Supertest

---

*Built by [Frax404NF](https://github.com/Frax404NF)*
