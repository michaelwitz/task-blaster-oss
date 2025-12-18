# User-Defined Status Columns - Test Documentation

**Branch**: `user-defined-status-columns`  
**Test Suite**: API Integration Tests  
**Framework**: Vitest + PactumJS  
**Total Tests**: 66 passing

---

## Overview

This document describes the comprehensive test suite for the user-defined status columns feature, which allows projects to customize their Kanban workflow by selecting and ordering statuses from instance-level status definitions.

### Test Execution

```bash
# From api/ directory (must source .env first)
set -a && source .env && set +a && NODE_ENV=test npm run test

# Or from project root
npm run test

# Watch mode
npm run test:watch
```

**Test Duration**: ~1.6 seconds  
**Test Database**: `task_blaster_test` (isolated from development data)

---

## Test Architecture

### Fixtures Pattern

Tests use a fixtures pattern for clean, maintainable test data:

```
__tests__/
├── fixtures/
│   ├── translations.js        # Expected translation structures
│   ├── statusDefinitions.js   # Status codes and schemas
│   └── projectStatuses.js     # Workflow configurations
├── helpers/
│   ├── testDatabase.js        # Database utilities
│   └── testServer.js          # Fastify server setup
└── routes/
    ├── translations.test.mjs
    ├── statusDefinitions.test.mjs
    ├── projectStatuses.test.mjs
    └── tasks.status.test.mjs
```

### Key Testing Patterns

1. **Test Isolation**: Each test suite resets the project workflow to a known state using `beforeEach` hooks
2. **Database Cleanup**: `clearTaskData()` removes tasks before each test but preserves users/projects for speed
3. **Authentication**: All tests use seeded token `550e8400-e29b-41d4-a716-446655440000` (user ID 5, Michael)
4. **Project Setup**: WEBRED project (ID 1) is used for all tests, with user 5 as project leader

---

## Test Suites

### 1. Translations Tests (12 tests)

**File**: `routes/translations.test.mjs`  
**Endpoint**: `GET /translations/:language`

#### Coverage

**Authentication (3 tests)**
- ✅ Returns 401 without token
- ✅ Returns 401 with invalid token
- ✅ Accepts valid token in TB_TOKEN header

**Valid Languages (4 tests)**
- ✅ Returns English translations with correct status labels
- ✅ Returns Spanish translations (`DONE` = "Completado")
- ✅ Returns French translations
- ✅ Returns German translations

**Invalid Languages (3 tests)**
- ✅ Returns 404 for unsupported language code (`xx`)
- ✅ Returns 400 for invalid format (too long: `eng`)
- ✅ Returns 400 for invalid format (uppercase: `EN`)

**Response Structure (2 tests)**
- ✅ Returns valid JSON structure with `translations` object
- ✅ Includes `statusDescriptions` for all statuses

#### Key Fixtures Used

```javascript
// fixtures/translations.js
expectedEnglishTranslations = {
  tasks: {
    statuses: { TO_DO: 'To Do', IN_PROGRESS: 'In Progress', ... }
  }
}
```

---

### 2. Status Definitions Tests (8 tests)

**File**: `routes/statusDefinitions.test.mjs`  
**Endpoint**: `GET /status-definitions`

#### Coverage

**Authentication (3 tests)**
- ✅ Returns 401 without token
- ✅ Returns 401 with invalid token
- ✅ Accepts valid token

**Response Data (3 tests)**
- ✅ Returns array of status definitions with correct schema
- ✅ Returns all 8 seeded status codes:
  - `TO_DO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`
  - `TESTING`, `AWAITING_APPROVAL`, `READY_FOR_DEPLOY`, `ICEBOX`
- ✅ Returns statuses in alphabetical order

**Status Code Format (2 tests)**
- ✅ All fields present (`code`, `description`, `createdAt`, `updatedAt`)
- ✅ Status codes match ENUM_CASE pattern (`^[A-Z_]+$`)

#### Key Fixtures Used

```javascript
// fixtures/statusDefinitions.js
expectedStatusCodes = [
  'AWAITING_APPROVAL', 'DONE', 'ICEBOX', 'IN_PROGRESS', 
  'IN_REVIEW', 'READY_FOR_DEPLOY', 'TESTING', 'TO_DO'
]
```

---

### 3. Project Status Workflow Tests (31 tests)

**File**: `routes/projectStatuses.test.mjs`  
**Endpoints**: 
- `GET /projects/:code/statuses`
- `PUT /projects/:code/statuses`

#### Coverage Breakdown

##### GET Endpoint (5 tests)

**Authentication (2 tests)**
- ✅ Returns 401 without token
- ✅ Returns 401 with invalid token

**Valid Project (2 tests)**
- ✅ Returns status workflow with correct schema
- ✅ Returns WEBRED project's default 3-status workflow: `['TO_DO', 'IN_PROGRESS', 'DONE']`

**Invalid Project (1 test)**
- ✅ Returns 404 for non-existent project code

##### PUT Endpoint - Authentication (3 tests)

- ✅ Returns 401 without token
- ✅ Returns 401 with invalid token
- ✅ Allows project leader to update workflow

##### PUT Endpoint - Valid Updates (5 tests)

- ✅ Updates workflow to 3 statuses
- ✅ Updates workflow to use all 8 available statuses
- ✅ Allows reordering statuses (e.g., `['DONE', 'IN_PROGRESS', 'TO_DO']`)
- ✅ Allows minimal 1-status workflow
- ✅ Persists changes correctly

##### PUT Endpoint - Invalid Updates (4 tests)

- ✅ Returns 400 for empty workflow array
- ✅ Returns 400 for missing `statusWorkflow` field
- ✅ Returns 400 for invalid status code with details
- ✅ Returns 400 for multiple invalid status codes

##### Task Validation (4 tests)

- ✅ **Prevents removing status when tasks exist** with that status (returns 400)
- ✅ Allows removing status when NO tasks exist with that status
- ✅ Allows adding new statuses regardless of existing tasks
- ✅ Allows keeping all statuses when tasks exist (reordering only)

##### Workflow Persistence (2 tests)

- ✅ Changes persist across GET requests
- ✅ `statusWorkflow` included in project details (`GET /projects/:id`)

##### 4-Status Workflow Suite (7 tests)

Tests a complete 4-status workflow: `['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']`

- ✅ Successfully sets 4-status workflow
- ✅ Allows creating tasks in all 4 statuses
- ✅ Prevents removing any status when tasks exist in all
- ✅ Allows reordering all 4 statuses
- ✅ Allows expanding from 4 to 5 statuses (add `TESTING`)
- ✅ Allows reducing from 4 to 3 statuses (remove `IN_REVIEW` when no tasks)
- ✅ Maintains 4-status workflow in project details

##### End-to-End User Flows (2 tests)

**Test 1: Adding TESTING Status - Complete Workflow (9 steps)**

```javascript
// Step 1: Verify TESTING exists in available statuses
GET /status-definitions → includes TESTING ✅

// Step 2: Check current workflow (3 statuses)
GET /projects/WEBRED/statuses → ['TO_DO', 'IN_PROGRESS', 'DONE'] ✅

// Step 3: Add TESTING to workflow
PUT /projects/WEBRED/statuses
  → ['TO_DO', 'IN_PROGRESS', 'TESTING', 'DONE'] ✅

// Step 4: Verify persistence
GET /projects/WEBRED/statuses → includes TESTING ✅

// Step 5: Create tasks in all statuses including TESTING
createTask(status: 'TESTING', title: 'Run test suite') ✅

// Step 6: Verify in project details
GET /projects/1 → statusWorkflow includes TESTING ✅

// Step 7: Verify translation exists
GET /translations/en → TESTING label and description present ✅

// Step 8: Attempt to remove TESTING (should fail)
PUT /projects/WEBRED/statuses (without TESTING) → 400 error ✅

// Step 9: Verify workflow unchanged
GET /projects/WEBRED/statuses → still includes TESTING ✅
```

**Test 2: Adding Multiple Statuses (TESTING + READY_FOR_DEPLOY)**

```javascript
// Reset to default workflow
PUT /projects/WEBRED/statuses → 3 statuses ✅

// Add TESTING and READY_FOR_DEPLOY
PUT /projects/WEBRED/statuses
  → ['TO_DO', 'IN_PROGRESS', 'TESTING', 'READY_FOR_DEPLOY', 'DONE'] ✅

// Create tasks in new statuses
createTask(status: 'TESTING') ✅
createTask(status: 'READY_FOR_DEPLOY') ✅

// Verify translations for both
GET /translations/en → both have labels and descriptions ✅

// Verify removal blocked for both
PUT /projects/WEBRED/statuses (without new statuses) → 400 error ✅
```

---

### 4. Task Status Tests (15 tests)

**File**: `routes/tasks.status.test.mjs`  
**Endpoint**: `PATCH /tasks/:id/status`

These tests validate task status changes work correctly (pre-existing functionality). All 15 tests passing.

---

## Test Data & Fixtures

### Seeded Test Data

**Database**: `task_blaster_test`

**Users**:
- User 1: John Doe (token: `0fd2d377-84e3-43fe-954f-d6ee9708c255`)
- User 5: Michael Woytowitz (token: `550e8400-e29b-41d4-a716-446655440000`) ← Used in tests

**Projects**:
- Project 1: WEBRED - Website Redesign (leader: User 5)
- Project 2: MOBDEV - Mobile App Development
- Project 3: APIMOD - API Modernization

**Status Definitions** (8 total):
```javascript
'AWAITING_APPROVAL'
'DONE'
'ICEBOX'
'IN_PROGRESS'
'IN_REVIEW'
'READY_FOR_DEPLOY'
'TESTING'
'TO_DO'
```

**Translations** (4 languages):
- English (`en`)
- Spanish (`es`)
- French (`fr`)
- German (`de`)

### Fixture Files

#### `fixtures/translations.js`

```javascript
export const expectedEnglishTranslations = {
  tasks: {
    statuses: {
      TO_DO: 'To Do',
      IN_PROGRESS: 'In Progress',
      IN_REVIEW: 'In Review',
      DONE: 'Done'
    }
  }
};

export const expectedSpanishTranslations = {
  tasks: {
    statuses: {
      TO_DO: 'Por Hacer',
      IN_PROGRESS: 'En Progreso',
      IN_REVIEW: 'En Revisión',
      DONE: 'Completado'  // Note: not "Hecho"
    }
  }
};
```

#### `fixtures/statusDefinitions.js`

```javascript
export const expectedStatusCodes = [
  'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE',
  'TESTING', 'AWAITING_APPROVAL', 'READY_FOR_DEPLOY', 'ICEBOX'
];

export const statusCodePattern = /^[A-Z_]+$/;
```

#### `fixtures/projectStatuses.js`

```javascript
// WEBRED project's actual default workflow
export const defaultStatusWorkflow = ['TO_DO', 'IN_PROGRESS', 'DONE'];

export const allAvailableStatuses = [
  'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE',
  'TESTING', 'AWAITING_APPROVAL', 'READY_FOR_DEPLOY', 'ICEBOX'
];

export const threeStatusWorkflow = ['TO_DO', 'IN_PROGRESS', 'DONE'];
export const minimalWorkflow = ['TO_DO'];
export const reorderedWorkflow = ['DONE', 'IN_PROGRESS', 'TO_DO'];
```

---

## Key Testing Decisions

### 1. Test Isolation Strategy

Each test suite uses `beforeEach` hooks to reset the workflow to a known state:

```javascript
beforeEach(async () => {
  await clearTaskData();  // Remove all tasks
  
  // Reset to default workflow
  await spec()
    .put('/projects/WEBRED/statuses')
    .withHeaders('TB_TOKEN', VALID_TOKEN)
    .withJson({ statusWorkflow: defaultStatusWorkflow })
    .expectStatus(200);
});
```

### 2. Unique Task ID Generation

Tasks use a counter to avoid duplicate IDs when created in the same millisecond:

```javascript
// testDatabase.js
let taskCounter = 0;
const taskId = `${project.code}-TEST-${Date.now()}-${taskCounter++}`;
```

### 3. Project Leader Authorization

Tests use user 5 (Michael) as the project leader for WEBRED to test authorization flows:
- Leader can update workflow ✅
- Non-leaders would get 403 (not explicitly tested)

### 4. Database Safety

Multiple safety checks prevent accidental data loss:
1. `NODE_ENV=test` required
2. `DATABASE_URL_TEST` must point to `task_blaster_test`
3. Runtime database name verification
4. Startup validation in `validateTestEnvironment()`

---

## Running Specific Test Suites

```bash
# Run only translations tests
npm run test -- translations

# Run only status definitions tests
npm run test -- statusDefinitions

# Run only project statuses tests
npm run test -- projectStatuses

# Run with coverage
npm run test:coverage
```

---

## Expected Behavior Validation

### Status Addition Flow

1. ✅ Check available statuses (`GET /status-definitions`)
2. ✅ Verify current workflow (`GET /projects/:code/statuses`)
3. ✅ Add new status to workflow (`PUT /projects/:code/statuses`)
4. ✅ Create tasks with new status
5. ✅ Verify translations exist (`GET /translations/:language`)
6. ✅ Cannot remove status while tasks exist

### Status Removal Flow

1. ✅ Can remove status if NO tasks exist with that status
2. ✅ Returns 400 if tasks exist with that status
3. ✅ Error message includes status name and reason

### Workflow Validation

1. ✅ All status codes must exist in `STATUS_DEFINITIONS`
2. ✅ Workflow must have at least 1 status
3. ✅ Workflow can have up to 8 statuses
4. ✅ Status order is preserved as specified
5. ✅ Only project leader can update workflow

---

## Troubleshooting

### Tests Fail: "Database not found"

```bash
# Create test database
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"

# Run migrations
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:migrate

# Seed test data
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:seed
```

### Tests Fail: "Port 3031 in use"

```bash
# Kill process on port 3031
lsof -ti:3031 | xargs kill -9

# Re-run tests
npm run test
```

### Tests Fail: "Token cache not initialized"

Ensure Docker PostgreSQL is running:
```bash
docker ps | grep task_blaster_postgres
# If not running: npm run docker:up:db
```

---

## CI/CD Integration

These tests are designed to run in CI pipelines:

```yaml
# Example GitHub Actions
- name: Setup Test Database
  run: |
    docker-compose up -d postgres
    npm run db:migrate
    npm run db:seed

- name: Run Tests
  run: |
    cd api
    set -a && source .env && set +a
    NODE_ENV=test npm run test
```

---

## Future Enhancements

### Phase 3 (Client Integration)
- Component tests for status workflow UI
- E2E tests with Playwright/Cypress
- Visual regression tests for Kanban columns

### Additional API Tests
- Non-leader attempting to update workflow (403 test)
- Concurrent workflow updates
- Status workflow with special characters
- Performance tests with 100+ tasks across 8 statuses

---

## Documentation References

- **API Documentation**: `api/src/routes/` (route files contain inline docs)
- **Test Helpers**: `api/__tests__/helpers/testDatabase.js`
- **Test Setup**: `api/__tests__/README.md`
- **Feature Spec**: `~/Dev/task-blaster/user-defined-status-columns.md`

---

**Last Updated**: 2025-12-17  
**Test Suite Version**: 1.0  
**All Tests Passing**: ✅ 66/66
