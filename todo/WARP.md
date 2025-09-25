# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project scope
- Monorepo managed by pnpm workspaces. Primary app is apps/web (Next.js 14); companion apps: apps/desktop (Electron) and apps/mobile (Expo).
- Local infra via docker-compose: Postgres, Redis, and optional Keycloak for OAuth (used by default in web auth config).
- Database layer via Prisma (schema in apps/web/prisma/schema.prisma).

Common commands
- Install deps (root):
  - pnpm install
- Environment setup (web app):
  - cp .env.example apps/web/.env.local
  - Important for Prisma CLI: also have apps/web/.env (Prisma reads .env; Next.js reads .env.local)
- Docker services (ensure Docker Desktop is running):
  - pnpm docker:up       # starts postgres and redis
  - pnpm docker:down
  - docker-compose up -d keycloak   # start Keycloak if you plan to use Keycloak auth locally
- Database (run from repo root; proxies to apps/web):
  - pnpm db:migrate
  - pnpm db:seed
  - pnpm db:studio
  - pnpm --filter web prisma:generate
- Development servers:
  - pnpm dev            # apps/web on http://localhost:3000
  - pnpm dev:web        # same as above
  - pnpm dev:desktop    # Electron wrapper
  - pnpm dev:mobile     # Expo dev server
- Build:
  - pnpm build          # builds apps/web (Prisma generate + next build)
  - pnpm build:desktop  # electron-builder
  - pnpm build:mobile   # expo build
- Lint / Type-check:
  - pnpm lint           # recursively runs each package’s lint (apps/web uses next lint)
  - pnpm type-check     # tsc --noEmit across packages
- Start (production-like):
  - pnpm --filter web start   # next start -p 3000

Testing
- A root script "pnpm -r test" exists, but no packages define test scripts or test files at this time. Single-test invocation is not applicable until a test runner is added.

High-level architecture
- apps/web (Next.js 14, App Router)
  - Routing: src/app
    - UI entry: src/app/page.tsx; layout in src/app/layout.tsx
    - API routes under src/app/api: tasks, schedule, calendar, email, reports, cron/daily-report, auth
  - Auth: apps/web/auth.ts configures NextAuth v5 with PrismaAdapter
    - Keycloak provider enabled by default (KEYCLOAK_CLIENT_ID/SECRET/ISSUER)
    - Google provider scaffolded (commented) with Calendar scopes for future enablement
  - Data layer: Prisma
    - Schema: apps/web/prisma/schema.prisma with core models: User, Account, Session, VerificationToken, Task (+ TaskResource, TaskEvent), DailyReport
    - Common commands: db:migrate, db:seed, db:studio
  - Core domain/services (src/lib)
    - db.ts: Prisma client
    - scheduler.ts and smart-scheduler.ts: task scheduling logic and optimizations
    - google-calendar.ts and calendar-sync.ts: calendar integration + sync helpers
    - email-service.ts, email.ts, email-parser.ts: outbound email + inbound parsing primitives
    - reporting.ts, notifications.ts: daily/weekly reporting and notifications
  - Middleware: src/middleware.ts for cross-cutting Next.js behaviors
  - Configuration: next.config.mjs is minimal; Tailwind/postcss present
  - Cron: vercel.json (in app root) schedules POST /api/cron/daily-report (22:00 UTC) in production
- apps/desktop
  - Electron shell (main.js, preload.js), built via electron-builder
- apps/mobile
  - Expo-based React Native app with basic navigation stubs
- Infrastructure
  - docker-compose.yml provides Postgres, Redis, and Keycloak. Root scripts start Postgres and Redis; Keycloak requires an explicit docker-compose up -d keycloak.

Important notes from README.md and setup docs
- Prerequisites: Node 18+, pnpm 8+, Docker Desktop running for local DB. The project is developed for Vercel deployment (Next.js serverless).
- Environment: copy .env.example to apps/web/.env.local; for Prisma CLI also create apps/web/.env. Ensure DATABASE_URL is set (defaults to local Postgres).
- Authentication: NextAuth v5 (beta) is used; consider stability implications if changing versions. Keycloak setup instructions and credentials are in SETUP_INTEGRATIONS.md; there’s also guidance for enabling Google OAuth.
- Email: SMTP (e.g., Gmail) or Resend supported via environment variables; see .env.example and SETUP_INTEGRATIONS.md.
- Known ports: Web dev server on 3000; Keycloak on 8080; Postgres 5432; Redis 6379.

Where to implement features
- Task creation/CRUD and scheduling: API routes under src/app/api/tasks and src/app/api/schedule backed by src/lib/{scheduler,smart-scheduler}.ts and Prisma Task models.
- Calendar integration: src/lib/google-calendar.ts and src/lib/calendar-sync.ts, with endpoints under src/app/api/calendar.
- Email ingress/egress: src/app/api/email and src/lib/email-service.ts/email-parser.ts.
- Daily reports: src/app/api/cron/daily-report and src/lib/reporting.ts; production scheduling via vercel.json cron.
- Auth flows and session token handling: apps/web/auth.ts (NextAuth handlers and callbacks).

CI/CD and editor/tooling
- No CLAUDE, Cursor, or Copilot rule files were found.
- No GitHub workflow files were found.

Troubleshooting pointers
- If db:migrate fails: verify apps/web/.env contains DATABASE_URL (Prisma reads .env). For Next.js runtime, use apps/web/.env.local.
- To use Keycloak locally: start it separately (docker-compose up -d keycloak) and ensure KEYCLOAK_* vars are set to the local defaults from .env.example.
