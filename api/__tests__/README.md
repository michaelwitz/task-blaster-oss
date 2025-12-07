# API Integration Tests

This directory contains API integration tests for Task Blaster using **Vitest** and **PactumJS**.

## Quick Start

### Prerequisites
- Node.js 22+
- Docker (for PostgreSQL database)
- Database container running: `npm run docker:up:db` from project root

### Run Tests

```bash
# From api/ directory
npm run test              # Run all tests once
npm run test:watch       # Run tests in watch mode (re-runs on file changes)
npm run test:coverage    # Run tests with coverage report
```

### From Project Root
```bash
npm run test             # Runs tests via workspace
npm run test:watch      # Watch mode via workspace
```

## Test Setup

### Architecture

Tests use:
- **Vitest**: ESM-native test runner with Jest-compatible API
- **PactumJS**: API testing DSL with chainable request/response matchers
- **Fastify**: API server running on loopback port 3031 during tests
- **Docker PostgreSQL**: Real database for integration testing (port 5433)

### Setup Flow

1. **Vitest Setup** (`setup.pactum.mjs`)
   - Runs before all tests (via `setupFiles` in `vitest.config.mjs`)
   - Initializes Fastify app instance
   - Starts app on `127.0.0.1:3031`
   - Configures PactumJS base URL
   - Initializes token service with seeded users

2. **Per-Test Cleanup** (`beforeEach`)
   - Clears `TASKS` and `TASK_TAGS` tables
   - Ensures test isolation
   - Uses existing seeded `PROJECTS` and `USERS`

3. **Teardown** (`afterAll`)
   - Closes Fastify app listener

## Test Helpers

### `helpers/testServer.js`
Server setup and management:
- `createTestServer()` - Create Fastify app without listening
- `getTestToken()` - Get seeded test user token (Michael's UUID)

**Token**: `550e8400-e29b-41d4-a716-446655440000` (seeded in database)

### `helpers/testDatabase.js`
Database utilities for test data:
- `clearTaskData()` - Delete all TASKS and TASK_TAGS (run before each test)
- `createTestTask(projectId, overrides)` - Create a test task with optional field overrides
- `getTaskById(id)` - Query task by ID for assertions
- `getTasksByStatus(projectId, status)` - Query tasks by status

**Example**:
```javascript
// Create a task in TO_DO status
const task = await createTestTask(1, { status: 'TO_DO', title: 'Fix bug' });

// Verify it was created
expect(task.status).toBe('TO_DO');
expect(task.title).toBe('Fix bug');
```

## Writing Tests

### Basic Test Structure

```javascript
import { spec } from 'pactum';
import { createTestTask, getTaskById, clearTaskData } from '../helpers/testDatabase.js';

const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('PATCH /tasks/:id/status', () => {
  beforeEach(async () => {
    await clearTaskData();
  });

  it('should change task status', async () => {
    // Setup: Create a test task
    const task = await createTestTask(1, { status: 'TO_DO' });

    // Act: Make API request
    await spec()
      .patch(`/tasks/${task.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(200)
      .expectJsonLike({ id: task.id, status: 'IN_PROGRESS' });

    // Assert: Verify in database
    const updated = await getTaskById(task.id);
    expect(updated.status).toBe('IN_PROGRESS');
  });
});
```

### PactumJS Matchers

Common assertions:
```javascript
await spec()
  .get('/endpoint')
  .expectStatus(200)                           // HTTP status
  .expectJson({ key: 'value' })               // Exact JSON match
  .expectJsonLike({ partial: 'match' })       // Partial JSON match
  .expectJsonSchema({ type: 'object', ... })  // JSON Schema validation
  .expectCookies({ name: 'value' })           // Cookie checks
  .expectHeadersContains({ 'x-header': 'val' }); // Header checks
```

### Authentication

All routes in this API require the `TB_TOKEN` header:
```javascript
await spec()
  .patch('/tasks/1/status')
  .withHeaders('TB_TOKEN', '550e8400-e29b-41d4-a716-446655440000')
  .withJson({ status: 'IN_PROGRESS' })
  .expectStatus(200);
```

Missing or invalid token returns `401 Unauthorized`.

## Current Test Coverage

**File**: `routes/tasks.status.test.mjs`

Tests for `PATCH /tasks/:id/status` endpoint:

### Authentication (3 tests)
- ✅ Requires authentication (401 without token)
- ✅ Rejects invalid token (401)
- ✅ Accepts valid token in header

### Validation (3 tests)
- ✅ Returns 404 for non-existent task
- ✅ Returns 400 for invalid status value
- ✅ Requires status in request body

### Status Changes (3 tests)
- ✅ Changes TO_DO → IN_PROGRESS
- ✅ Changes IN_PROGRESS → DONE
- ✅ Changes TO_DO → REVIEW

### Position Calculation (3 tests)
- ✅ Places task at bottom of empty column
- ✅ Places task at bottom of non-empty column
- ✅ Maintains correct position across multiple moves

### Data Integrity (3 tests)
- ✅ Preserves other task fields (title, priority, assignee, etc.)
- ✅ Updates `updatedAt` timestamp
- ✅ Returns complete task object

**Total**: 15 tests, all passing ✅

## Database & Seeded Data

### Test Database
- Real PostgreSQL 15 instance in Docker
- Uses existing database from `npm run docker:up:db`
- Connection: `localhost:5433` (see `api/.env`)

### Seeded Data
- **Project 1** (code: `TEST`) - Used for all tests
- **User 1** - Michael (token: `550e8400-e29b-41d4-a716-446655440000`)
- Seeded via `api/scripts/seeders/` on startup

### Test Isolation
Tests clear task data before each run but **reuse seeded projects and users** for speed:
```javascript
beforeEach(async () => {
  await clearTaskData();  // Remove only task data
  // Projects and users remain for faster test setup
});
```

## Troubleshooting

### Tests fail with "Task not found"
Ensure database container is running: `npm run docker:up:db`

### Port 3031 already in use
Another process is listening on port 3031. Either:
- Kill the process: `lsof -ti:3031 | xargs kill -9`
- Change port in `setup.pactum.mjs` (line 6)

### Token cache initialization fails
Database connection issue. Verify:
- Docker container is running: `docker ps | grep postgres`
- Database URL in `api/.env` is correct
- Seeded users exist: `psql -c "SELECT id, full_name FROM users;"`

### Tests hang or timeout
Increase timeout in `vitest.config.mjs` (line 9): `testTimeout: 20000`

## Environment Configuration

**File**: `api/.env`

Required for tests:
```
DATABASE_URL=postgres://user:password@localhost:5433/task_blaster
NODE_ENV=test  # Optional, set for consistent test behavior
```

**File**: `api/vitest.config.mjs`

Test configuration:
- Test pattern: `__tests__/**/*.test.{js,mjs}`
- Setup files: `__tests__/setup.pactum.mjs`
- Timeout: 20 seconds per test
- Environment: Node.js

## Adding New Tests

### 1. Create test file
```bash
touch api/__tests__/routes/NEW_ENDPOINT.test.mjs
```

### 2. Structure
- Import helpers: `testDatabase`, `spec` from pactum
- Use `beforeEach` to clear data
- Write describe/it blocks with PactumJS specs

### 3. Example
```javascript
import { spec } from 'pactum';
import { clearTaskData, createTestTask } from '../helpers/testDatabase.js';

describe('GET /tasks/:id', () => {
  beforeEach(async () => {
    await clearTaskData();
  });

  it('should return task by id', async () => {
    const task = await createTestTask(1);
    await spec()
      .get(`/tasks/${task.id}`)
      .withHeaders('TB_TOKEN', '550e8400-e29b-41d4-a716-446655440000')
      .expectStatus(200)
      .expectJsonLike({ id: task.id });
  });
});
```

### 4. Run tests
```bash
npm run test:watch
# Tests auto-run when files change
```

## CI/CD Integration

Tests are designed to work in GitHub Actions with Docker services:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_DB: task_blaster
      POSTGRES_PASSWORD: password
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5433:5432
```

Future phases will add:
- In-memory database option for speed
- Matrix testing (Vitest with/without HTTP mode)
- Coverage reporting

## Performance

Current baseline (15 tests):
- **Setup**: ~290ms (token init, Fastify startup)
- **Tests**: ~230ms
- **Total**: ~580ms

Benchmarks:
- Per-test average: ~15ms
- Database operations: <5ms per operation
- Network I/O: ~10-20ms per request

## Resources

- [Vitest Documentation](https://vitest.dev)
- [PactumJS Documentation](https://pactumjs.github.io)
- [Fastify Testing](https://www.fastify.io/docs/latest/Guides/Testing/)
- [Task Blaster API Routes](../src/routes/)

## Future Enhancements

### Phase 2: Pactum-Fastify Adapter
Remove port binding by implementing PactumJS core adapter:
- `app.inject()` integration
- No port required
- ~20-30% faster tests
- See `add-vitest-pactumjs-API-tests.md` for details

### Phase 3: In-Memory Database
- SQLite for local tests
- Faster setup/teardown
- Optional Docker for CI/CD

### Phase 4: Expanded Coverage
- All CRUD endpoints
- Projects, tags, users
- Error handling & edge cases
- Performance/load tests
