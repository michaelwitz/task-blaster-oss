# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Task Blaster is a Kanban-style orchestration management application designed to coordinate AI agents and human users in software projects. This is the OSS version with manual user/agent management using UUID token authentication.

**Stack**: Fastify API (JavaScript) + React client (JavaScript) + PostgreSQL 15 + Drizzle ORM + Docker Compose

## Development Commands

### Initial Setup
```bash
# Install dependencies for both API and client
cd api && npm install
cd ../client && npm install
cd ..

# Set up environment variables
cp api/.env.example api/.env
# Edit api/.env with your database credentials

# Start PostgreSQL with Docker
npm run docker:up:db

# Run database migrations
npm run db:migrate

# Seed the database with initial data
npm run db:seed
```

### Running the Application
```bash
# Start both API and client in development mode (recommended)
npm run dev

# Or start individually:
npm run dev:api      # API only (port 3030, with --watch)
npm run dev:client   # Client only (port 3001)

# Full Docker Compose setup (all services)
npm run docker:up
```

### Database Operations
```bash
npm run db:migrate   # Run Drizzle migrations
npm run db:seed      # Seed with test data
npm run db:reset     # Reset and re-seed database
npm run db:generate  # Generate new migration from schema changes (in api/)
npm run db:studio    # Open Drizzle Studio (in api/)
npm run db:push      # Push schema changes directly to DB (in api/)
```

### Docker Operations
```bash
npm run docker:up         # Start all services (postgres, api, client)
npm run docker:up:db      # Start only PostgreSQL
npm run docker:down       # Stop all containers
npm run docker:logs       # View container logs
npm run docker:prod:up    # Start production setup
npm run docker:prod:down  # Stop production containers
npm run docker:prod:build # Build production images
```

### Linting
```bash
# Client has ESLint configured
cd client && npm run lint
```

### Testing
```bash
# API Integration Tests (Vitest + PactumJS)
cd api
npm run test              # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# From project root
npm run test             # Runs via workspace
```

Prerequisites: Docker Postgres running via `npm run docker:up:db`.
Docs: See `api/__tests__/README.md` for setup, writing tests, and troubleshooting.

## Architecture

### Monorepo Structure
- **api/**: Fastify backend server (JavaScript, ES modules)
  - `src/routes/`: Route handlers (users, projects, tasks, tags, images)
  - `src/services/`: Business logic (databaseService, tokenService, gitStatus)
  - `src/middleware/`: Authentication middleware
  - `src/schemas/`: Zod validation schemas
  - `lib/db/`: Database schema and Drizzle ORM setup
  - `scripts/`: Database seeding scripts
- **client/**: React frontend (JavaScript, Vite)
  - `src/components/`: React components (KanbanBoard, TaskCard, etc.)
  - `src/hooks/`: Custom hooks (useTasks, useDragAndDrop, etc.)
  - `src/pages/`: Route pages (HomePage, KanbanPage)
  - `src/i18n/`: Internationalization (en, es, fr, de)

### Database Schema (PostgreSQL)
Key tables managed by Drizzle ORM:
- **USERS**: Users with `access_token` for UUID-based auth
- **PROJECTS**: Projects with unique `code` and `leader_id`
- **TASKS**: Tasks with `task_id` (human-readable), `status`, `priority`, `position` (sparse numbering)
- **TAGS**: Tag definitions with `tag` (lowercase-with-hyphens) as primary key and `color`
- **TASK_TAGS**: Many-to-many junction table
- **IMAGE_METADATA** / **IMAGE_DATA**: Image attachments with base64 storage (local dev) or S3 URLs (prod)

Schema file: `api/lib/db/schema.js`

### Authentication Flow
1. **Token Service** (`api/src/services/tokenService.js`): Caches user tokens in memory on startup for fast validation
2. **Auth Middleware** (`api/src/middleware/authMiddleware.js`): Validates tokens from `TB_TOKEN` header or `Authorization: Bearer` header
3. **User Context**: Attaches `request.user` object with `{id, email, fullName}` for authenticated routes
4. Tokens are UUIDs stored in `USERS.access_token` column

### API Server (Fastify)
- **Port**: 3030
- **Logging**: Built-in Pino logger with correlation IDs
- **CORS**: Configured for localhost:3001 and 127.0.0.1:3001
- **Hot Reload**: Uses Node.js `--watch` flag in development
- **Route Registration**: Plugin-based architecture, routes share `dbService` instance

### Client (React)
- **Port**: 3001
- **Build Tool**: Vite
- **State Management**: React hooks, no Redux/MobX
- **UI Library**: Mantine Core components (@mantine/core, @mantine/hooks, @mantine/modals)
- **Drag & Drop**: @dnd-kit for Kanban board
- **Routing**: react-router-dom v7
- **i18n**: react-i18next with browser locale detection
- **Token Storage**: localStorage with key `TB_TOKEN`

### Important Patterns

#### Data Formatting Standards
- **Database Enum Values**: Use ENUM_CASE (e.g., `TO_DO`, `IN_PROGRESS`, `HIGH`, `CRITICAL`)
- **Tag Format Exception**: Tags use lowercase-with-hyphens (e.g., `user-management`, `reactjs-client`)
- **API Validation**: Server-side validation enforces these formats strictly (tags validated at API level for agent compatibility)
- **UI Display**: Enum values are translated via i18n (database stores `TO_DO`, UI shows "To Do" or "Por Hacer")

#### Field Mapping (snake_case ↔ camelCase)
The API uses snake_case in the database but camelCase in JavaScript:
- Database: `full_name`, `access_token`, `created_at`, `leader_id`, `assignee_id`
- JavaScript/API: `fullName`, `accessToken`, `createdAt`, `leaderId`, `assigneeId`
- Drizzle ORM handles this via explicit aliasing in `databaseService.js`

#### Sparse Numbering for Task Positions
Tasks use sparse numbering (increments of 10) for efficient drag-and-drop:
- New tasks: position 10, 20, 30, etc.
- Inserting between position 10 and 20: assign position 15
- Minimizes database updates when reordering

#### Correlation IDs
Every request gets a correlation ID (`x-correlation-id` header) for log tracing. The server attaches it to Pino logger context.

## Key Conventions

### API Development
- Use Fastify plugin pattern for route organization
- Always use `authMiddleware` hook for protected routes (optional: `optionalAuthMiddleware`)
- Return descriptive error messages with proper HTTP status codes
- Use Zod schemas for request validation (`api/src/schemas/validation.js`)
- Log important operations with correlation ID context

### Database Operations
- Use `databaseService.js` for all DB operations (don't query directly in routes)
- Always use Drizzle ORM's `eq()`, `and()`, `or()`, etc. for queries
- Field mapping: explicitly alias snake_case DB fields to camelCase
- Use `.returning()` for insert/update operations to get full result
- Tags are persistent (survive task deletion) for cross-project consistency

### Client Development
- Custom hooks for data fetching and state management (see `client/src/hooks/`)
- API calls use `TB_TOKEN` header for authentication
- Optimistic UI updates with rollback on error
- i18n keys use camelCase, nested by feature (e.g., `tasks.status.toDo`)
- Markdown editor: @uiw/react-md-editor for task descriptions
- Image uploads: base64 encoding for local storage

### Migration and Seeding
- Schema changes: edit `api/lib/db/schema.js`, then run `npm run db:generate` (in api/)
- Migrations stored in `api/lib/db/migrations/`
- Seed scripts in `api/scripts/seeders/`
- Always seed tags before tasks (tag references must exist)

### Environment Configuration
- API: `api/.env` with `DATABASE_URL`, `NODE_ENV`, `PORT`, `LOG_LEVEL`
- Client: Vite environment variables with `VITE_` prefix (e.g., `VITE_API_URL`)
- Docker: `POSTGRES_PASSWORD` env var (defaults to "password")
- Never commit `.env` files

## Internationalization (i18n)

Supported languages: English (en), Spanish (es), French (fr), German (de)
- Auto-detects browser locale with fallback to English
- Translation files in `client/src/i18n/locales/`
- Enum translations: database values like `TO_DO` are mapped to user-friendly text
- Language preference stored in localStorage

## Docker and Deployment

### Development
- PostgreSQL runs on host port 5433 (container port 5432)
- API and client can run in Docker or locally
- Volume mounts for hot reload: `./api:/app` and `./client:/app`

### Production
- Use `docker-compose.prod.yml` for production builds
- Switch image storage from PostgreSQL to S3/cloud storage
- Set `NODE_ENV=production` and configure proper `DATABASE_URL`

## Common Gotchas

- **Port conflicts**: PostgreSQL uses 5433 (not default 5432) to avoid conflicts
- **Token initialization**: API server calls `tokenService.initialize()` on startup; routes fail if cache not ready
- **Tag validation**: Tags must be lowercase, hyphens only, no leading/trailing hyphens
- **Task position**: When inserting tasks, use sparse numbering logic (don't assume sequential IDs)
- **Field names**: Watch for snake_case in DB vs camelCase in JS - use explicit mapping
- **CORS**: Only localhost:3001 and 127.0.0.1:3001 are allowed origins by default
