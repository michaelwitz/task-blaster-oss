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
      `Use: npm run test`
    );
  }

  // Check 2: DATABASE_URL_TEST must be set and point to test database
  const testDbUrl = process.env.DATABASE_URL_TEST;
  if (!testDbUrl) {
    throw new Error(
      'SAFETY CHECK FAILED: DATABASE_URL_TEST not set\n' +
      'Add DATABASE_URL_TEST to api/.env'
    );
  }

  const testDbName = testDbUrl.split('/').pop()?.split('?')[0];
  if (testDbName !== 'task_blaster_test') {
    throw new Error(
      `SAFETY CHECK FAILED: DATABASE_URL_TEST must point to 'task_blaster_test' (current: ${testDbName})\n` +
      `Check api/.env configuration`
    );
  }

  // Check 3: Query database to verify we're connected to test database
  try {
    const result = await db.execute(sql`SELECT current_database()`);
    const currentDb = result[0]?.current_database;
    
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

// Counter for generating unique task IDs within the same millisecond
let taskCounter = 0;

/**
 * Create a test task
 * @param {number} projectId - Project ID for the task
 * @param {object} overrides - Override default task values
 * @returns {Promise<object>} Created task
 */
export async function createTestTask(projectId, overrides = {}) {
  const [project] = await db.select().from(PROJECTS).where(eq(PROJECTS.id, projectId));
  
  if (!project) {
    throw new Error(`Project with id ${projectId} not found`);
  }
  
  // Create unique task_id using timestamp and counter to avoid duplicates
  const taskId = `${project.code}-TEST-${Date.now()}-${taskCounter++}`;
  
  const [task] = await db.insert(TASKS).values({
    project_id: projectId,
    task_id: taskId,
    title: overrides.title || 'Test Task',
    status: overrides.status || 'TO_DO',
    priority: overrides.priority || 'MEDIUM',
    position: overrides.position !== undefined ? overrides.position : 10,
    assignee_id: overrides.assigneeId || null,
    prompt: overrides.prompt || 'Test prompt',
    is_blocked: overrides.isBlocked || false,
    blocked_reason: overrides.blockedReason || null,
    story_points: overrides.storyPoints || null,
    git_feature_branch: overrides.gitFeatureBranch || null,
    git_pull_request_url: overrides.gitPullRequestUrl || null
  }).returning();
  
  return task;
}

/**
 * Get task by ID
 * @param {number} id - Task ID
 * @returns {Promise<object|null>} Task or null if not found
 */
export async function getTaskById(id) {
  const [task] = await db.select().from(TASKS).where(eq(TASKS.id, id));
  return task || null;
}

/**
 * Get all tasks for a project with a specific status
 * @param {number} projectId - Project ID
 * @param {string} status - Task status (TO_DO, IN_PROGRESS, etc.)
 * @returns {Promise<Array>} Array of tasks
 */
export async function getTasksByStatus(projectId, status) {
  return await db.select()
    .from(TASKS)
    .where(
      and(
        eq(TASKS.project_id, projectId),
        eq(TASKS.status, status)
      )
    );
}
