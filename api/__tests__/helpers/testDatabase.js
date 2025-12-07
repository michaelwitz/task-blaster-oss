import { db } from '../../lib/db/index.js';
import { USERS, PROJECTS, TASKS, TAGS, TASK_TAGS } from '../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Clear all task-related data (but keep users/projects for faster tests)
 * Called before each test to ensure isolation
 */
export async function clearTaskData() {
  await db.delete(TASK_TAGS);
  await db.delete(TASKS);
}

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
  
  // Create unique task_id using timestamp
  const taskId = `${project.code}-TEST-${Date.now()}`;
  
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
