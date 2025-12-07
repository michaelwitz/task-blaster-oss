# Implementation Plan: Add Multi-Environment Database Safety Guards

## Overview
Add environment-based database safeguards to prevent accidental data deletion in dev, stage, or production databases when running tests. This addresses a GitHub security issue where test helpers unconditionally delete data without validating the target environment.

## Problem Statement
The test helper `clearTaskData()` unconditionally deletes all records from TASKS and TASK_TAGS tables without environment validation. This creates a risk of accidental data deletion if tests run against the wrong database (dev, stage, or prod).

## Current State
- Single `.env` file with `task_blaster_db` database name (non-specific naming)
- No environment-specific database configuration
- Test helpers lack safety checks before destructive operations
- `NODE_ENV=test` set in test scripts but not validated at runtime
- No safeguards in seed/migration scripts to prevent running on prod

## Proposed Changes

### 1. Database Naming Convention
Establish explicit database names for all environments:
- **task_blaster_dev** - Local development database (developer's working DB)
- **task_blaster_test** - Automated test database (cleared/seeded by tests)
- **task_blaster_stage** - Staging environment (production-like, protected)
- **task_blaster_prod** - Production (fully protected)

### 2. Create Separate Test Database
Create a dedicated test database alongside the existing dev database:

```bash
# Rename existing database
docker exec task_blaster_postgres psql -U postgres -c "ALTER DATABASE task_blaster_db RENAME TO task_blaster_dev;"

# Create test database
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"
```

### 3. Environment-Specific Configuration Files

#### api/.env.development (rename existing `.env`)
```bash
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_dev
NODE_ENV=development
PORT=3030
DB_POOL_MIN=2
DB_POOL_MAX=10
LOG_LEVEL=info
```

#### api/.env.test (new file)
```bash
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test
NODE_ENV=test
PORT=3031
DB_POOL_MIN=2
DB_POOL_MAX=10
LOG_LEVEL=warn
```

#### api/.env.example (update)
```bash
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_dev
NODE_ENV=development
PORT=3030
DB_POOL_MIN=2
DB_POOL_MAX=10
LOG_LEVEL=info
```

### 4. Update Database Connection with Environment Loading

**File**: `api/lib/db/index.js`

Add dotenv configuration to load environment-specific files:

```javascript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment-specific .env file
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = `.env.${nodeEnv}`;
dotenv.config({ path: resolve(process.cwd(), envFile) });

// Fallback to .env if environment-specific file not found
dotenv.config();

// Database connection with explicit fallback
const connectionString = process.env.DATABASE_URL || 
  'postgres://postgres:password@localhost:5433/task_blaster_dev';

// Create postgres client
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client);
```

### 5. Add Safety Validation to Test Helpers

**File**: `api/__tests__/helpers/testDatabase.js`

Add comprehensive environment validation:

```javascript
import { db } from '../../lib/db/index.js';
import { USERS, PROJECTS, TASKS, TAGS, TASK_TAGS } from '../../lib/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Validates we're running against a test database
 * @throws {Error} if not in test environment or wrong database
 */
export async function validateTestEnvironment() {
  // Check 1: NODE_ENV must be 'test'
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      `SAFETY CHECK FAILED: Tests must run with NODE_ENV=test (current: ${process.env.NODE_ENV})\n` +
      `Use: NODE_ENV=test npm run test`
    );
  }

  // Check 2: DATABASE_URL must contain 'task_blaster_test'
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('SAFETY CHECK FAILED: DATABASE_URL not set');
  }

  const dbName = dbUrl.split('/').pop()?.split('?')[0];
  if (dbName !== 'task_blaster_test') {
    throw new Error(
      `SAFETY CHECK FAILED: DATABASE_URL must point to 'task_blaster_test' (current: ${dbName})\n` +
      `Check api/.env.test configuration`
    );
  }

  // Check 3: Query database to verify connection
  try {
    const result = await db.execute(sql`SELECT current_database()`);
    const currentDb = result.rows[0]?.current_database;
    
    if (currentDb !== 'task_blaster_test') {
      throw new Error(
        `SAFETY CHECK FAILED: Connected to wrong database: ${currentDb}\n` +
        `Expected: task_blaster_test`
      );
    }
  } catch (error) {
    if (error.message.includes('SAFETY CHECK FAILED')) {
      throw error;
    }
    // If DB query fails for other reasons, log warning but continue
    console.warn('Warning: Could not verify database name via query:', error.message);
  }
}

/**
 * Clear all task-related data (but keep users/projects for faster tests)
 * Called before each test to ensure isolation
 */
export async function clearTaskData() {
  await validateTestEnvironment();
  
  await db.delete(TASK_TAGS);
  await db.delete(TASKS);
}

// ... rest of existing helper functions
```

### 6. Add Startup Validation to Test Setup

**File**: `api/__tests__/setup.pactum.mjs`

Add fail-fast validation before any tests run:

```javascript
import { beforeAll, afterAll } from 'vitest';
import pactum from 'pactum';
import { createTestServer, closeTestServer } from './helpers/testServer.js';
import { validateTestEnvironment } from './helpers/testDatabase.js';

// Fail fast if not in test environment
if (process.env.NODE_ENV !== 'test') {
  console.error(
    '\x1b[31m%s\x1b[0m', // Red color
    '\n❌ SAFETY CHECK FAILED: Tests must run with NODE_ENV=test\n' +
    `   Current: ${process.env.NODE_ENV}\n` +
    `   Use: NODE_ENV=test npm run test\n`
  );
  process.exit(1);
}

// Validate DATABASE_URL contains 'task_blaster_test'
const dbUrl = process.env.DATABASE_URL || '';
const dbName = dbUrl.split('/').pop()?.split('?')[0];
if (dbName !== 'task_blaster_test') {
  console.error(
    '\x1b[31m%s\x1b[0m', // Red color
    '\n❌ SAFETY CHECK FAILED: DATABASE_URL must point to test database\n' +
    `   Current database: ${dbName}\n` +
    `   Expected: task_blaster_test\n` +
    `   Check: api/.env.test\n`
  );
  process.exit(1);
}

let app;

beforeAll(async () => {
  // Validate test environment before starting server
  await validateTestEnvironment();
  
  console.log('✅ Environment validation passed: task_blaster_test');
  
  app = await createTestServer();
  await app.listen({ port: 3031, host: '127.0.0.1' });
  
  pactum.request.setBaseUrl('http://127.0.0.1:3031');
});

afterAll(async () => {
  await closeTestServer();
});
```

### 7. Add Protection to Seed Scripts

**File**: `api/scripts/seedDatabase.js`

Add safeguards to prevent seeding stage/prod:

```javascript
import 'dotenv/config';

// Safety check: Prevent seeding production
if (process.env.NODE_ENV === 'production') {
  console.error(
    '\x1b[31m%s\x1b[0m',
    '\n❌ SAFETY CHECK FAILED: Cannot seed production database\n' +
    '   NODE_ENV=production detected\n'
  );
  process.exit(1);
}

// Safety check: Validate database name
const dbUrl = process.env.DATABASE_URL || '';
const dbName = dbUrl.split('/').pop()?.split('?')[0];

const allowedDatabases = ['task_blaster_dev', 'task_blaster_test'];
if (!allowedDatabases.includes(dbName)) {
  console.error(
    '\x1b[31m%s\x1b[0m',
    '\n❌ SAFETY CHECK FAILED: Cannot seed this database\n' +
    `   Current database: ${dbName}\n` +
    `   Allowed: ${allowedDatabases.join(', ')}\n`
  );
  process.exit(1);
}

console.log(`✅ Seeding database: ${dbName}`);

// ... rest of seed logic
```

### 8. Update Package Scripts

**File**: `api/package.json`

```json
{
  "scripts": {
    "dev": "node --watch --env-file=.env.development src/server.js",
    "test": "NODE_ENV=test vitest run",
    "test:watch": "NODE_ENV=test vitest",
    "test:coverage": "NODE_ENV=test vitest run --coverage",
    "db:migrate": "drizzle-kit migrate",
    "db:migrate:test": "NODE_ENV=test drizzle-kit migrate",
    "db:seed": "node --env-file=.env.development scripts/seedDatabase.js",
    "db:seed:test": "NODE_ENV=test node --env-file=.env.test scripts/seedDatabase.js",
    "db:setup:test": "node scripts/setupTestDatabase.js",
    "db:reset": "node scripts/resetDatabase.js",
    "db:generate": "drizzle-kit generate",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push"
  }
}
```

**File**: `package.json` (root)

```json
{
  "scripts": {
    "test": "npm run test --workspace=api",
    "test:watch": "npm run test:watch --workspace=api",
    "test:coverage": "npm run test:coverage --workspace=api"
  }
}
```

### 9. Update .gitignore

Ensure environment files are properly handled:

```gitignore
# Environment files
api/.env
api/.env.development
api/.env.test
api/.env.local
api/.env.*.local

# Keep example file tracked
!api/.env.example
```

### 10. Create Setup Script for Test Database

**File**: `api/scripts/setupTestDatabase.js` (new)

Automate test database setup:

```javascript
import postgres from 'postgres';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function setupTestDatabase() {
  const adminUrl = 'postgres://postgres:password@localhost:5433/postgres';
  const sql = postgres(adminUrl);

  try {
    // Check if test database exists
    const result = await sql`
      SELECT 1 FROM pg_database WHERE datname = 'task_blaster_test'
    `;

    if (result.length === 0) {
      console.log('Creating task_blaster_test database...');
      await sql`CREATE DATABASE task_blaster_test`;
      console.log('✅ Test database created');
    } else {
      console.log('✅ Test database already exists');
    }

    await sql.end();

    // Run migrations on test database
    console.log('Running migrations on test database...');
    await execAsync('NODE_ENV=test npm run db:migrate', { cwd: process.cwd() });
    console.log('✅ Migrations complete');

    // Seed test database
    console.log('Seeding test database...');
    await execAsync('npm run db:seed:test', { cwd: process.cwd() });
    console.log('✅ Test database ready');

  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  }
}

setupTestDatabase();
```

### 11. Documentation Updates

#### WARP.md

Add environment strategy section:

```markdown
## Environment Strategy

Task Blaster uses explicit database naming for environment safety:

| Environment | Database Name | NODE_ENV | Usage |
|------------|---------------|----------|-------|
| Development | task_blaster_dev | development | Local development, manual testing |
| Test | task_blaster_test | test | Automated test suite (CI/CD) |
| Staging | task_blaster_stage | production | Pre-production testing |
| Production | task_blaster_prod | production | Live application |

### Database Setup

```bash
# First-time setup: Create test database
npm run db:setup:test

# Or manually:
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"
NODE_ENV=test npm run db:migrate
npm run db:seed:test
```

### Safety Features

- Test helpers validate `NODE_ENV=test` and database name before destructive operations
- Seed scripts refuse to run on stage/prod databases
- Multiple validation layers prevent accidental data deletion
```

#### api/__tests__/README.md

Add environment setup section:

```markdown
## Environment Setup

### Prerequisites

1. **Test Database**: Tests require a separate `task_blaster_test` database
2. **Environment File**: Create `api/.env.test` with test database URL

### First-Time Setup

```bash
# Automated setup (recommended)
npm run db:setup:test

# Or manual setup
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"
NODE_ENV=test npm run db:migrate
npm run db:seed:test
```

### Safety Mechanisms

Tests include multiple safety guards to prevent accidental data deletion:

1. **NODE_ENV check** - Must be `test` for destructive operations
2. **Database name validation** - Must be exactly `task_blaster_test`
3. **Runtime DB query** - Confirms connection to correct database
4. **Startup validation** - Fails fast before running any tests
5. **Per-operation validation** - Checks in `clearTaskData()` and similar functions

If any check fails, tests will exit immediately with a clear error message.

### Troubleshooting

**Error: "SAFETY CHECK FAILED: Tests must run with NODE_ENV=test"**
- Ensure you're using the correct npm script: `npm run test`
- Scripts are configured to set `NODE_ENV=test` automatically

**Error: "DATABASE_URL must point to 'task_blaster_test'"**
- Check `api/.env.test` exists and contains correct database URL
- Run `npm run db:setup:test` to create test database
```

## Environment Protection Matrix

| Environment | Database Name | NODE_ENV | Destructive Ops | Protected By |
|------------|---------------|----------|-----------------|--------------|
| Development | task_blaster_dev | development | Manual only | Seed script checks |
| Test | task_blaster_test | test | Automated (tests) | All 6 guard layers |
| Staging | task_blaster_stage | production | Blocked | All guards + no test ENV |
| Production | task_blaster_prod | production | Blocked | All guards + no test ENV |

## Safety Guard Layers

1. **NODE_ENV check** - Must be `test` for destructive test operations
2. **Database name validation** - Must be exactly `task_blaster_test`
3. **Runtime DB query** - Confirm connected to correct database via `SELECT current_database()`
4. **Startup validation** - Fail fast in test setup (`setup.pactum.mjs`) before any tests run
5. **Per-operation validation** - Check in `clearTaskData()` and similar helper functions
6. **Seed script guards** - Block seeding stage/prod, require dev/test only

## Migration Path for Existing Databases

### Local Development

```bash
# 1. Rename existing database
docker exec task_blaster_postgres psql -U postgres -c "ALTER DATABASE task_blaster_db RENAME TO task_blaster_dev;"

# 2. Create test database
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"

# 3. Update local environment file
mv api/.env api/.env.development

# 4. Create test environment file
cat > api/.env.test << EOF
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test
NODE_ENV=test
PORT=3031
DB_POOL_MIN=2
DB_POOL_MAX=10
LOG_LEVEL=warn
EOF

# 5. Run migrations on test database
NODE_ENV=test npm run db:migrate

# 6. Seed test database
npm run db:seed:test

# 7. Verify tests run successfully
npm run test
```

### CI/CD Configuration

For GitHub Actions or other CI/CD:

```yaml
env:
  NODE_ENV: test
  DATABASE_URL: postgres://postgres:password@localhost:5432/task_blaster_test
  
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: task_blaster_test
```

## Implementation Checklist

### Step 1: Database Setup
- [ ] Rename existing `task_blaster_db` to `task_blaster_dev`
- [ ] Create new `task_blaster_test` database
- [ ] Verify both databases exist in Docker

### Step 2: Environment Configuration
- [ ] Rename `api/.env` to `api/.env.development`
- [ ] Create `api/.env.test` with test database URL
- [ ] Update `api/.env.example` with new naming convention
- [ ] Update `.gitignore` for environment files

### Step 3: Code Changes
- [ ] Update `api/lib/db/index.js` with dotenv environment loading
- [ ] Add `validateTestEnvironment()` to `api/__tests__/helpers/testDatabase.js`
- [ ] Update `clearTaskData()` to call validation
- [ ] Add startup validation to `api/__tests__/setup.pactum.mjs`
- [ ] Add safeguards to `api/scripts/seedDatabase.js`

### Step 4: Scripts and Automation
- [ ] Create `api/scripts/setupTestDatabase.js`
- [ ] Update `api/package.json` scripts
- [ ] Update root `package.json` test scripts
- [ ] Test all new scripts

### Step 5: Database Migration
- [ ] Run migrations on test database
- [ ] Seed test database with minimal data
- [ ] Verify both databases have correct schema

### Step 6: Testing
- [ ] Run test suite with new safeguards
- [ ] Verify all safety checks trigger correctly
- [ ] Test with wrong environment (should fail fast)
- [ ] Test with wrong database (should fail fast)

### Step 7: Documentation
- [ ] Update WARP.md with environment strategy
- [ ] Update `api/__tests__/README.md` with setup instructions
- [ ] Add troubleshooting guide
- [ ] Document migration path for teams

### Step 8: Verification
- [ ] All tests pass with safety guards
- [ ] Tests fail appropriately with wrong environment
- [ ] Seed scripts block stage/prod databases
- [ ] Clear error messages for misconfigurations
- [ ] Developer workflow unchanged (npm run dev/test)

## Success Criteria

- ✅ Separate dev and test databases exist locally
- ✅ Tests run against `task_blaster_test` only
- ✅ Developer's API server uses `task_blaster_dev`
- ✅ Test helpers validate environment before destructive operations
- ✅ Clear error messages when environment misconfigured
- ✅ Seed scripts refuse to run against stage/prod
- ✅ All existing tests pass with new safety guards
- ✅ Documentation explains environment strategy
- ✅ Zero risk of accidental production data deletion

## Git Workflow

1. Create branch: `add-multi-environment-db-safeguards`
2. Commit documentation (this file)
3. Commit database setup changes
4. Commit environment configuration files
5. Commit code safety guards
6. Commit automation scripts
7. Commit documentation updates
8. Open pull request for review
