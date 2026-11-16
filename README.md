# Amigo Doce

A full-stack application for organizing gift exchanges, participants, and draws. The pnpm and Turborepo monorepo contains a Next.js frontend (`apps/web`, port 3000), a NestJS API (`apps/api`, port 3001), and PostgreSQL managed with Prisma. The user interface is in Portuguese.

## Local development with Docker

Requirements: Docker and Docker Compose v2. The local environment uses its own network and volumes. PostgreSQL is bound to `127.0.0.1:5433`, the frontend to `http://localhost:3000`, and the API health endpoint to `http://localhost:3001/health`.

```sh
cp .env.development.example .env.development
docker compose -f compose.dev.yaml up --build
```

The `deps` service installs dependencies into Docker volumes. The API applies pending migrations with `prisma migrate deploy` and starts in development mode. Next.js forwards `/api/*` to the API on the private network. Stop the application with `Ctrl+C` and `docker compose -f compose.dev.yaml down`. To also delete the local database volume, use `docker compose -f compose.dev.yaml down -v`.

The values in `.env.development.example` are for local development only. Never use them in production.

## Monorepo commands

With pnpm 12.9.1 and Node.js 26 installed:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

PostgreSQL-backed integration tests require a **dedicated disposable database**: set `INTEGRATION_DATABASE_URL` to its connection string, build the API, and run `pnpm --filter @amigo-doce/api test:integration`. The test applies migrations and modifies test data, including the login rate-limit table. Never point it at a development or production database containing data to keep.
