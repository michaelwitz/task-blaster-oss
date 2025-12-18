import { eq, and, sql, desc, asc, like, or, inArray } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { USERS, PROJECTS, TASKS, TAGS, TASK_TAGS, IMAGE_METADATA, IMAGE_DATA, STATUS_DEFINITIONS, TRANSLATIONS } from '../../lib/db/schema.js';
import { getRandomTagColor } from '../utils/tagColors.js';
import { keysToCamelCase } from '../utils/propertyMapper.js';
import { randomUUID } from 'crypto';

/**
 * Database Service
 * Comprehensive service layer for all database operations.
 * Uses Drizzle ORM aliasing for snake_case to camelCase field mapping.
 */
class DatabaseService {
  
// ==================== USER OPERATIONS ====================
  
  /**
   * Get all users with optional search
   */
  async getUsers(searchTerm = null) {
    let query = db.select({
      id: USERS.id,
      fullName: USERS.full_name,
      email: USERS.email,
      createdAt: USERS.created_at,
      updatedAt: USERS.updated_at
    }).from(USERS);
    
    if (searchTerm) {
      query = query.where(
        or(
          like(USERS.full_name, `%${searchTerm}%`),
          like(USERS.email, `%${searchTerm}%`)
        )
      );
    }
    
    return await query.orderBy(asc(USERS.full_name));
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    const [user] = await db.select({
      id: USERS.id,
      fullName: USERS.full_name,
      email: USERS.email,
      createdAt: USERS.created_at,
      updatedAt: USERS.updated_at
    })
    .from(USERS)
    .where(eq(USERS.id, id))
    .limit(1);
    
    return user || null;
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    const [user] = await db.insert(USERS)
      .values({
        full_name: userData.fullName,
        email: userData.email,
        access_token: userData.accessToken || randomUUID()
      })
      .returning();
    
    return user;
  }

  /**
   * Update user
   */
  async updateUser(id, userData) {
    const updateData = {};
    if (userData.fullName !== undefined) updateData.full_name = userData.fullName;
    if (userData.email !== undefined) updateData.email = userData.email;
    
    const [user] = await db.update(USERS)
      .set(updateData)
      .where(eq(USERS.id, id))
      .returning();
    
    return user || null;
  }

  /**
   * Delete user
   */
  async deleteUser(id) {
    const [user] = await db.delete(USERS)
      .where(eq(USERS.id, id))
      .returning();
    
    return user || null;
  }

  // ==================== PROJECT OPERATIONS ====================

  /**
   * Get all projects with leader info and task counts
   */
  async getProjectsWithDetails() {
    const projects = await db.select({
      id: PROJECTS.id,
      title: PROJECTS.title,
      code: PROJECTS.code,
      description: PROJECTS.description,
      leaderId: PROJECTS.leader_id,
      leaderName: USERS.full_name,
      leaderEmail: USERS.email,
      statusWorkflow: PROJECTS.status_workflow,
      createdAt: PROJECTS.created_at,
      updatedAt: PROJECTS.updated_at,
      taskCount: sql`COUNT(${TASKS.id})`.as('taskCount')
    })
    .from(PROJECTS)
    .leftJoin(USERS, eq(PROJECTS.leader_id, USERS.id))
    .leftJoin(TASKS, eq(PROJECTS.id, TASKS.project_id))
    .groupBy(
      PROJECTS.id, 
      PROJECTS.title, 
      PROJECTS.code,
      PROJECTS.description, 
      PROJECTS.leader_id,
      PROJECTS.status_workflow,
      PROJECTS.created_at,
      PROJECTS.updated_at,
      USERS.full_name,
      USERS.email
    )
    .orderBy(asc(PROJECTS.title));

    return projects;
  }

  /**
   * Get project by ID with full details
   */
  async getProjectById(id) {
    const [project] = await db.select({
      id: PROJECTS.id,
      title: PROJECTS.title,
      code: PROJECTS.code,
      description: PROJECTS.description,
      leaderId: PROJECTS.leader_id,
      leaderName: USERS.full_name,
      leaderEmail: USERS.email,
      statusWorkflow: PROJECTS.status_workflow,
      createdAt: PROJECTS.created_at,
      updatedAt: PROJECTS.updated_at
    })
    .from(PROJECTS)
    .leftJoin(USERS, eq(PROJECTS.leader_id, USERS.id))
    .where(eq(PROJECTS.id, id))
    .limit(1);

    return project || null;
  }

  /**
   * Get project by code
   */
  async getProjectByCode(code) {
    const [project] = await db.select({
      id: PROJECTS.id,
      title: PROJECTS.title,
      code: PROJECTS.code,
      description: PROJECTS.description,
      leaderId: PROJECTS.leader_id,
      leaderName: USERS.full_name,
      leaderEmail: USERS.email,
      statusWorkflow: PROJECTS.status_workflow,
      createdAt: PROJECTS.created_at,
      updatedAt: PROJECTS.updated_at
    })
    .from(PROJECTS)
    .leftJoin(USERS, eq(PROJECTS.leader_id, USERS.id))
    .where(eq(PROJECTS.code, code))
    .limit(1);

    return project || null;
  }

  /**
   * Create new project
   */
  async createProject(projectData) {
    const [project] = await db.insert(PROJECTS)
      .values({
        title: projectData.title,
        code: projectData.code,
        description: projectData.description,
        leader_id: projectData.leaderId,
        status_workflow: projectData.statusWorkflow || ['TO_DO', 'IN_PROGRESS', 'DONE']
      })
      .returning();
    
    return project;
  }

  /**
   * Update project - Project codes are immutable after creation
   */
  async updateProject(id, projectData) {
    const updateData = {};
    if (projectData.title !== undefined) updateData.title = projectData.title;
    // Project codes are immutable - cannot be updated after creation
    if (projectData.description !== undefined) updateData.description = projectData.description;
    if (projectData.leaderId !== undefined) updateData.leader_id = projectData.leaderId;
    
    // Check if there are any values to update
    if (Object.keys(updateData).length === 0) {
      throw new Error('No values to update');
    }
    
    const [project] = await db.update(PROJECTS)
      .set(updateData)
      .where(eq(PROJECTS.id, id))
      .returning();
    
    return project || null;
  }

  /**
   * Delete project and all associated tasks/tags
   */
  async deleteProject(id) {
    // First delete task-tag relationships for this project's tasks
    const projectTasks = await db.select({ id: TASKS.id })
      .from(TASKS)
      .where(eq(TASKS.project_id, id));

    if (projectTasks.length > 0) {
      const taskIds = projectTasks.map(task => task.id);
      await db.delete(TASK_TAGS)
        .where(inArray(TASK_TAGS.task_id, taskIds));
    }
    
    // Then delete tasks
    await db.delete(TASKS).where(eq(TASKS.project_id, id));
    
    // Finally delete the project
    const [project] = await db.delete(PROJECTS)
      .where(eq(PROJECTS.id, id))
      .returning();
    
    return project || null;
  }

  /**
   * Get project's status workflow
   */
  async getProjectStatusWorkflow(projectId) {
    const [project] = await db.select({
      id: PROJECTS.id,
      code: PROJECTS.code,
      statusWorkflow: PROJECTS.status_workflow
    })
    .from(PROJECTS)
    .where(eq(PROJECTS.id, projectId))
    .limit(1);

    return project || null;
  }

  /**
   * Update project's status workflow
   */
  async updateProjectStatusWorkflow(projectId, statusWorkflow, updatedBy) {
    const [project] = await db.update(PROJECTS)
      .set({ 
        status_workflow: statusWorkflow,
        updated_by: updatedBy,
        updated_at: new Date()
      })
      .where(eq(PROJECTS.id, projectId))
      .returning();
    
    return project || null;
  }

  /**
   * Check if any tasks in project use a specific status
   */
  async hasTasksWithStatus(projectId, status) {
    const [result] = await db.select({ 
      count: sql`COUNT(*)`.as('count') 
    })
    .from(TASKS)
    .where(
      and(
        eq(TASKS.project_id, projectId),
        eq(TASKS.status, status)
      )
    );
    
    return parseInt(result.count) > 0;
  }

  // ==================== TASK OPERATIONS ====================

  /**
   * Get tasks for a specific project with assignees and tags
   */
  async getTasksForProject(projectId) {
    const tasks = await db.select({
      id: TASKS.id,
      taskId: TASKS.task_id,
      title: TASKS.title,
      status: TASKS.status,
      priority: TASKS.priority,
      position: TASKS.position,
      storyPoints: TASKS.story_points,
      projectId: TASKS.project_id,
      assigneeId: TASKS.assignee_id,
      assigneeName: USERS.full_name,
      assigneeEmail: USERS.email,
      prompt: TASKS.prompt,
      isBlocked: TASKS.is_blocked,
      blockedReason: TASKS.blocked_reason,
      gitFeatureBranch: TASKS.git_feature_branch,
      gitPullRequestUrl: TASKS.git_pull_request_url,
      startedAt: TASKS.started_at,
      completedAt: TASKS.completed_at,
      createdAt: TASKS.created_at,
      updatedAt: TASKS.updated_at
    })
    .from(TASKS)
    .leftJoin(USERS, eq(TASKS.assignee_id, USERS.id))
    .where(eq(TASKS.project_id, projectId))
    .orderBy(asc(TASKS.status), asc(TASKS.position));

    // Get tags for each task
    const tasksWithTags = await Promise.all(
      tasks.map(async (task) => {
        const tags = await this.getTagsForTask(task.id);
        return { ...task, tags };
      })
    );

    return tasksWithTags;
  }

  /**
   * Get all tasks with filters
   */
  async getTasks(filters = {}) {
    let query = db.select({
      id: TASKS.id,
      taskId: TASKS.task_id,
      title: TASKS.title,
      status: TASKS.status,
      priority: TASKS.priority,
      position: TASKS.position,
      storyPoints: TASKS.story_points,
      projectId: TASKS.project_id,
      projectName: PROJECTS.title,
      assigneeId: TASKS.assignee_id,
      assigneeName: USERS.full_name,
      assigneeEmail: USERS.email,
      prompt: TASKS.prompt,
      isBlocked: TASKS.is_blocked,
      blockedReason: TASKS.blocked_reason,
      gitFeatureBranch: TASKS.git_feature_branch,
      gitPullRequestUrl: TASKS.git_pull_request_url,
      startedAt: TASKS.started_at,
      completedAt: TASKS.completed_at,
      createdAt: TASKS.created_at,
      updatedAt: TASKS.updated_at
    })
    .from(TASKS)
    .leftJoin(PROJECTS, eq(TASKS.project_id, PROJECTS.id))
    .leftJoin(USERS, eq(TASKS.assignee_id, USERS.id));

    // Apply filters
    const conditions = [];
    if (filters.projectId) {
      conditions.push(eq(TASKS.project_id, filters.projectId));
    }
    if (filters.status) {
      conditions.push(eq(TASKS.status, filters.status));
    }
    if (filters.assigneeId) {
      conditions.push(eq(TASKS.assignee_id, filters.assigneeId));
    }
    if (filters.search) {
      conditions.push(
        or(
          like(TASKS.title, `%${filters.search}%`),
          like(TASKS.prompt, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const tasks = await query.orderBy(asc(TASKS.position));
    
    // Get tags for each task
    const tasksWithTags = await Promise.all(
      tasks.map(async (task) => {
        const tags = await this.getTagsForTask(task.id);
        return { ...task, tags };
      })
    );

    return tasksWithTags;
  }

  /**
   * Get task by ID with full details
   */
  async getTaskById(id) {
    const [task] = await db.select({
      id: TASKS.id,
      taskId: TASKS.task_id,
      title: TASKS.title,
      status: TASKS.status,
      priority: TASKS.priority,
      position: TASKS.position,
      storyPoints: TASKS.story_points,
      projectId: TASKS.project_id,
      projectName: PROJECTS.title,
      assigneeId: TASKS.assignee_id,
      assigneeName: USERS.full_name,
      assigneeEmail: USERS.email,
      prompt: TASKS.prompt,
      isBlocked: TASKS.is_blocked,
      blockedReason: TASKS.blocked_reason,
      gitFeatureBranch: TASKS.git_feature_branch,
      gitPullRequestUrl: TASKS.git_pull_request_url,
      startedAt: TASKS.started_at,
      completedAt: TASKS.completed_at,
      createdAt: TASKS.created_at,
      updatedAt: TASKS.updated_at
    })
    .from(TASKS)
    .leftJoin(PROJECTS, eq(TASKS.project_id, PROJECTS.id))
    .leftJoin(USERS, eq(TASKS.assignee_id, USERS.id))
    .where(eq(TASKS.id, id))
    .limit(1);

    if (!task) return null;

    const tags = await this.getTagsForTask(id);
    return { ...task, tags };
  }

  /**
   * Get task by task_id (project code + sequence) with full details
   */
  async getTaskByTaskId(taskId) {
    const [task] = await db.select({
      id: TASKS.id,
      taskId: TASKS.task_id,
      title: TASKS.title,
      status: TASKS.status,
      priority: TASKS.priority,
      position: TASKS.position,
      storyPoints: TASKS.story_points,
      projectId: TASKS.project_id,
      projectName: PROJECTS.title,
      assigneeId: TASKS.assignee_id,
      assigneeName: USERS.full_name,
      assigneeEmail: USERS.email,
      prompt: TASKS.prompt,
      isBlocked: TASKS.is_blocked,
      blockedReason: TASKS.blocked_reason,
      gitFeatureBranch: TASKS.git_feature_branch,
      gitPullRequestUrl: TASKS.git_pull_request_url,
      startedAt: TASKS.started_at,
      completedAt: TASKS.completed_at,
      createdAt: TASKS.created_at,
      updatedAt: TASKS.updated_at
    })
    .from(TASKS)
    .leftJoin(PROJECTS, eq(TASKS.project_id, PROJECTS.id))
    .leftJoin(USERS, eq(TASKS.assignee_id, USERS.id))
    .where(eq(TASKS.task_id, taskId))
    .limit(1);

    if (!task) return null;

    const tags = await this.getTagsForTask(task.id);
    return { ...task, tags };
  }

  /**
   * Create new task with auto-generated task_id and proper positioning
   */
  async createTask(taskData) {
    // Use transaction to ensure atomicity for task_id generation
    const task = await db.transaction(async (tx) => {
      // Get project to generate task_id
      const [project] = await tx
        .select()
        .from(PROJECTS)
        .where(eq(PROJECTS.id, taskData.projectId));

      if (!project) {
        throw new Error('Project not found');
      }

      // Generate task_id using project code + sequence
      const taskId = `${project.code}-${project.next_task_sequence}`;

      // Increment next_task_sequence atomically
      await tx
        .update(PROJECTS)
        .set({ next_task_sequence: project.next_task_sequence + 1 })
        .where(eq(PROJECTS.id, taskData.projectId));

      // Get the next position for this project and status
      const [maxPosition] = await tx.select({ 
        max: sql`COALESCE(MAX(${TASKS.position}), 0)`.as('max') 
      })
      .from(TASKS)
      .where(
        and(
          eq(TASKS.project_id, taskData.projectId),
          eq(TASKS.status, taskData.status || 'TO_DO')
        )
      );

      // Use sparse positioning (count by 10s) to avoid frequent rebalancing
      const nextPosition = Math.floor(maxPosition.max / 10) * 10 + 10;
      
      // Create the task with auto-generated task_id
      const [newTask] = await tx.insert(TASKS)
        .values({
          task_id: taskId, // Auto-generated, not from API
          title: taskData.title,
          status: taskData.status || 'TO_DO',
          priority: taskData.priority || 'MEDIUM',
          position: nextPosition,
          story_points: taskData.storyPoints,
          project_id: taskData.projectId,
          assignee_id: taskData.assigneeId,
          prompt: taskData.prompt,
          is_blocked: taskData.isBlocked || false,
          blocked_reason: taskData.blockedReason,
          git_feature_branch: taskData.gitFeatureBranch,
          git_pull_request_url: taskData.gitPullRequestUrl,
          started_at: taskData.startedAt,
          completed_at: taskData.completedAt
        })
        .returning();

      return newTask;
    });

    // Add tags if provided (outside transaction to avoid deadlocks)
    if (taskData.tags && taskData.tags.length > 0) {
      await this.setTaskTags(task.id, taskData.tags);
    }

    // Return the full task object in camelCase format
    return await this.getTaskById(task.id);
  }

  /**
   * Update task
   */
  async updateTask(id, taskData) {
    const updateData = {};
    if (taskData.taskId !== undefined) updateData.task_id = taskData.taskId;
    if (taskData.title !== undefined) updateData.title = taskData.title;
    if (taskData.status !== undefined) updateData.status = taskData.status;
    if (taskData.priority !== undefined) updateData.priority = taskData.priority;
    if (taskData.position !== undefined) updateData.position = taskData.position;
    if (taskData.storyPoints !== undefined) updateData.story_points = taskData.storyPoints;
    if (taskData.projectId !== undefined) updateData.project_id = taskData.projectId;
    if (taskData.assigneeId !== undefined) updateData.assignee_id = taskData.assigneeId;
    if (taskData.prompt !== undefined) updateData.prompt = taskData.prompt;
    if (taskData.isBlocked !== undefined) updateData.is_blocked = taskData.isBlocked;
    if (taskData.blockedReason !== undefined) updateData.blocked_reason = taskData.blockedReason;
    if (taskData.gitFeatureBranch !== undefined) updateData.git_feature_branch = taskData.gitFeatureBranch;
    if (taskData.gitPullRequestUrl !== undefined) updateData.git_pull_request_url = taskData.gitPullRequestUrl;
    if (taskData.startedAt !== undefined) updateData.started_at = taskData.startedAt;
    if (taskData.completedAt !== undefined) updateData.completed_at = taskData.completedAt;
    
    const [task] = await db.update(TASKS)
      .set(updateData)
      .where(eq(TASKS.id, id))
      .returning();

    // Update tags if provided
    if (taskData.tagNames !== undefined) {
      await this.setTaskTags(id, taskData.tagNames || []);
    }

    // Return the full task object in camelCase format
    return await this.getTaskById(id);
  }

  /**
   * Update task position and handle related task adjustments
   */
  async updateTaskPosition(taskId, newPosition, status) {
    // Get the current task
    const [currentTask] = await db.select()
      .from(TASKS)
      .where(eq(TASKS.id, taskId))
      .limit(1);

    if (!currentTask) return null;

    const oldPosition = currentTask.position;
    const oldStatus = currentTask.status;
    const projectId = currentTask.project_id;

    // If status is changing, handle it as a status change
    if (status !== oldStatus) {
      await db.update(TASKS)
        .set({ 
          status: status,
          position: newPosition,
          updated_at: new Date()
        })
        .where(eq(TASKS.id, taskId));

      return await this.getTaskById(taskId);
    }

    // Same status - handle position change with sparse positioning
    if (newPosition === oldPosition) {
      return currentTask; // No change needed
    }

    // Get all tasks in the same status column for this project
    const columnTasks = await db.select()
      .from(TASKS)
      .where(
        and(
          eq(TASKS.project_id, projectId),
          eq(TASKS.status, status)
        )
      )
      .orderBy(asc(TASKS.position));

    // Find the target position in the sorted list
    const targetIndex = columnTasks.findIndex(task => task.position >= newPosition);
    
    if (targetIndex === -1) {
      // Inserting at the end
      const [updatedTask] = await db.update(TASKS)
        .set({ 
          position: newPosition,
          updated_at: new Date()
        })
        .where(eq(TASKS.id, taskId))
        .returning();
      
      return updatedTask;
    }

    // Check if we need to redistribute positions
    const beforeTask = targetIndex > 0 ? columnTasks[targetIndex - 1] : null;
    const afterTask = columnTasks[targetIndex];
    
    let finalPosition = newPosition;
    
    if (beforeTask && afterTask) {
      const gap = afterTask.position - beforeTask.position;
      if (gap < 2) {
        // Need to redistribute - use sparse positioning
        finalPosition = beforeTask.position + Math.floor(gap / 2);
        
        // Redistribute all tasks in this column
        await this.redistributeColumnPositions(projectId, status);
      } else {
        // Enough space, use the calculated position
        finalPosition = beforeTask.position + Math.floor(gap / 2);
      }
    } else if (!beforeTask) {
      // Inserting at the beginning
      finalPosition = afterTask.position / 2;
    } else {
      // Inserting at the end
      finalPosition = beforeTask.position + 10;
    }

    // Update the task position
    const [updatedTask] = await db.update(TASKS)
      .set({ 
        position: finalPosition,
        updated_at: new Date()
      })
      .where(eq(TASKS.id, taskId))
      .returning();

    return updatedTask;
  }

  /**
   * Redistribute positions in a column using sparse positioning
   */
  async redistributeColumnPositions(projectId, status) {
    const tasks = await db.select()
      .from(TASKS)
      .where(
        and(
          eq(TASKS.project_id, projectId),
          eq(TASKS.status, status)
        )
      )
      .orderBy(asc(TASKS.position));

    // Update all tasks with new sparse positions
    const updatePromises = tasks.map((task, index) => {
      const newPosition = (index + 1) * 10;
      return db.update(TASKS)
        .set({ 
          position: newPosition,
          updated_at: new Date()
        })
        .where(eq(TASKS.id, task.id));
    });

    await Promise.all(updatePromises);
  }

  /**
   * Delete task
   */
  async deleteTask(id) {
    // Delete task tags first
    await db.delete(TASK_TAGS).where(eq(TASK_TAGS.task_id, id));
    
    const [task] = await db.delete(TASKS)
      .where(eq(TASKS.id, id))
      .returning();
    
    return task || null;
  }

  // ==================== TAG OPERATIONS ====================

  /**
   * Validate tag name according to functional requirements
   * - Must be lowercase
   * - Only hyphens (-) allowed as separators
   * - Cannot start or end with hyphen
   */
  validateTagName(tagName) {
    if (!tagName || typeof tagName !== 'string') {
      throw new Error('Tag name is required and must be a string');
    }

    // Check if tag is lowercase
    if (tagName !== tagName.toLowerCase()) {
      throw new Error('Tag name must be lowercase');
    }

    // Check if tag starts or ends with hyphen
    if (tagName.startsWith('-') || tagName.endsWith('-')) {
      throw new Error('Tag name cannot start or end with a hyphen');
    }

    // Check if tag contains only allowed characters (lowercase letters, numbers, hyphens)
    const validTagRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!validTagRegex.test(tagName)) {
      throw new Error('Tag name can only contain lowercase letters, numbers, and hyphens as separators');
    }

    return true;
  }

  /**
   * Get all tags with optional search and usage counts
   */
  async getTags(searchTerm = null) {
    let query = db.select({
      tag: TAGS.tag,
      color: TAGS.color,
      createdAt: TAGS.created_at,
      usageCount: sql`COUNT(${TASK_TAGS.task_id})`.as('usage_count')
    })
    .from(TAGS)
    .leftJoin(TASK_TAGS, eq(TAGS.tag, TASK_TAGS.tag))
    .groupBy(TAGS.tag, TAGS.color, TAGS.created_at);

    if (searchTerm) {
      query = query.where(like(TAGS.tag, `%${searchTerm}%`));
    }

    const tags = await query.orderBy(asc(TAGS.tag));
    return tags;
  }

  /**
   * Get tag by tag name
   */
  async getTagByName(tagName) {
    const [tag] = await db.select({
      tag: TAGS.tag,
      color: TAGS.color,
      createdAt: TAGS.created_at
    })
      .from(TAGS)
      .where(eq(TAGS.tag, tagName))
      .limit(1);
    
    return tag || null;
  }

  /**
   * Create new tag with random color
   */
  async createTag(tagData) {
    // Validate tag name
    this.validateTagName(tagData.tag || tagData.name);
    
    const tagName = tagData.tag || tagData.name;
    const color = tagData.color || getRandomTagColor();
    
    const [tag] = await db.insert(TAGS)
      .values({
        tag: tagName,
        color: color
      })
      .returning();
    
    return {
      tag: tag.tag,
      color: tag.color,
      createdAt: tag.created_at
    };
  }

  /**
   * Update tag
   */
  async updateTag(tagName, tagData) {
    // Validate tag name if it's being updated
    if (tagData.tag || tagData.name) {
      this.validateTagName(tagData.tag || tagData.name);
    }
    
    const updateData = {};
    if (tagData.color) updateData.color = tagData.color;
    
    const [tag] = await db.update(TAGS)
      .set(updateData)
      .where(eq(TAGS.tag, tagName))
      .returning();
    
    return tag ? {
      tag: tag.tag,
      color: tag.color,
      createdAt: tag.created_at
    } : null;
  }

  /**
   * Delete tag
   */
  async deleteTag(tagName) {
    const [tag] = await db.delete(TAGS)
      .where(eq(TAGS.tag, tagName))
      .returning();
    
    return tag ? {
      tag: tag.tag,
      color: tag.color,
      createdAt: tag.created_at
    } : null;
  }

  /**
   * Get tags for a specific task
   */
  async getTagsForTask(taskId) {
    const tags = await db.select({
      tag: TAGS.tag,
      color: TAGS.color
    })
    .from(TAGS)
    .innerJoin(TASK_TAGS, eq(TAGS.tag, TASK_TAGS.tag))
    .where(eq(TASK_TAGS.task_id, taskId))
    .orderBy(asc(TAGS.tag));

    return tags;
  }

  /**
   * Set tags for a task (replaces existing tags)
   */
  async setTaskTags(taskId, tagNames) {
    // Remove existing tags
    await db.delete(TASK_TAGS).where(eq(TASK_TAGS.task_id, taskId));
    
    // Add new tags
    if (tagNames && tagNames.length > 0) {
      const taskTagData = tagNames.map(tagName => ({
        task_id: taskId,
        tag: tagName
      }));
      
      await db.insert(TASK_TAGS).values(taskTagData);
    }
  }

  // ==================== IMAGE OPERATIONS ====================

  /**
   * Get all images for a task
   */
  async getTaskImages(taskId) {
    const images = await db.select({
      id: IMAGE_METADATA.id,
      originalName: IMAGE_METADATA.original_name,
      contentType: IMAGE_METADATA.content_type,
      fileSize: IMAGE_METADATA.file_size,
      url: IMAGE_METADATA.url,
      storageType: IMAGE_METADATA.storage_type,
      createdAt: IMAGE_METADATA.created_at
    })
    .from(IMAGE_METADATA)
    .where(eq(IMAGE_METADATA.task_id, taskId))
    .orderBy(asc(IMAGE_METADATA.created_at));
    
    return images;
  }

  /**
   * Store image with metadata and binary data
   */
  async storeTaskImage(taskId, imageData) {
    // Insert image metadata
    const [metadata] = await db.insert(IMAGE_METADATA)
      .values({
        task_id: taskId,
        original_name: imageData.originalName,
        content_type: imageData.contentType,
        file_size: imageData.fileSize,
        url: `/images/0`, // Temporary, will update with actual ID
        storage_type: 'local'
      })
      .returning();
    
    // Update URL with actual image ID
    await db.update(IMAGE_METADATA)
      .set({ url: `/images/${metadata.id}` })
      .where(eq(IMAGE_METADATA.id, metadata.id));
    
    // Insert binary data
    await db.insert(IMAGE_DATA)
      .values({
        id: metadata.id,
        data: imageData.base64Data,
        thumbnail_data: null // Could add thumbnail generation later
      });
    
    return {
      id: metadata.id,
      originalName: metadata.original_name,
      contentType: metadata.content_type,
      fileSize: metadata.file_size,
      url: `/images/${metadata.id}`,
      storageType: metadata.storage_type,
      createdAt: metadata.created_at
    };
  }

  /**
   * Get image with binary data for serving
   */
  async getImageWithData(imageId) {
    const [result] = await db
      .select({
        id: IMAGE_METADATA.id,
        originalName: IMAGE_METADATA.original_name,
        contentType: IMAGE_METADATA.content_type,
        fileSize: IMAGE_METADATA.file_size,
        data: IMAGE_DATA.data,
        thumbnailData: IMAGE_DATA.thumbnail_data
      })
      .from(IMAGE_METADATA)
      .leftJoin(IMAGE_DATA, eq(IMAGE_METADATA.id, IMAGE_DATA.id))
      .where(eq(IMAGE_METADATA.id, imageId))
      .limit(1);
    
    return result || null;
  }

  /**
   * Get image metadata only
   */
  async getImageMetadata(imageId) {
    const [image] = await db.select({
      id: IMAGE_METADATA.id,
      taskId: IMAGE_METADATA.task_id,
      originalName: IMAGE_METADATA.original_name,
      contentType: IMAGE_METADATA.content_type,
      fileSize: IMAGE_METADATA.file_size,
      url: IMAGE_METADATA.url,
      storageType: IMAGE_METADATA.storage_type,
      createdAt: IMAGE_METADATA.created_at
    })
    .from(IMAGE_METADATA)
    .where(eq(IMAGE_METADATA.id, imageId))
    .limit(1);
    
    return image || null;
  }

  /**
   * Delete image and its binary data
   */
  async deleteImage(imageId) {
    // Delete binary data first (cascade will handle this, but being explicit)
    await db.delete(IMAGE_DATA)
      .where(eq(IMAGE_DATA.id, imageId));
    
    // Delete metadata
    const [deletedImage] = await db.delete(IMAGE_METADATA)
      .where(eq(IMAGE_METADATA.id, imageId))
      .returning();
    
    return deletedImage ? {
      id: deletedImage.id,
      originalName: deletedImage.original_name,
      contentType: deletedImage.content_type
    } : null;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const result = await db.execute(sql`SELECT 1 as test`);
      return { status: 'connected', result };
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Get column positions for a specific project and status
   */
  async getColumnPositions(projectId, status) {
    const tasks = await db.select({
      id: TASKS.id,
      position: TASKS.position
    })
    .from(TASKS)
    .where(
      and(
        eq(TASKS.project_id, projectId),
        eq(TASKS.status, status)
      )
    )
    .orderBy(asc(TASKS.position));

    return tasks;
  }

  /**
   * Update multiple task positions in a column (optimized for sparse positioning)
   */
  async updateColumnPositions(projectId, status, positionUpdates) {
    // Update only the tasks that need position changes
    const updatePromises = positionUpdates.map(({ taskId, newPosition }) => {
      return db.update(TASKS)
        .set({ 
          position: newPosition,
          updated_at: new Date()
        })
        .where(eq(TASKS.id, taskId));
    });

    await Promise.all(updatePromises);

    // Return updated column positions
    return await this.getColumnPositions(projectId, status);
  }

  /**
   * Calculate optimal positions for sparse positioning
   */
  calculateSparsePositions(tasks, insertIndex, insertPosition) {
    const positions = [];
    let needsRedistribution = false;

    // Check if we need redistribution
    for (let i = 0; i < tasks.length - 1; i++) {
      const gap = tasks[i + 1].position - tasks[i].position;
      if (gap < 2) {
        needsRedistribution = true;
        break;
      }
    }

    if (needsRedistribution) {
      // Redistribute all positions with 10-unit gaps
      for (let i = 0; i <= tasks.length; i++) {
        if (i === insertIndex) {
          positions.push((i + 1) * 10); // Insert position
        }
        if (i < tasks.length) {
          positions.push((i + 2) * 10); // Existing tasks
        }
      }
    } else {
      // Use existing positions, only update the inserted task
      for (let i = 0; i < tasks.length; i++) {
        positions.push(tasks[i].position);
      }
      positions.splice(insertIndex, 0, insertPosition);
    }

    return { positions, needsRedistribution };
  }

  // ==================== STATUS DEFINITIONS OPERATIONS ====================

  /**
   * Get all available status definitions
   */
  async getStatusDefinitions() {
    const statuses = await db.select({
      code: STATUS_DEFINITIONS.code,
      description: STATUS_DEFINITIONS.description,
      createdAt: STATUS_DEFINITIONS.created_at,
      updatedAt: STATUS_DEFINITIONS.updated_at
    })
    .from(STATUS_DEFINITIONS)
    .orderBy(asc(STATUS_DEFINITIONS.code));

    return statuses;
  }

  /**
   * Get status definition by code
   */
  async getStatusDefinitionByCode(code) {
    const [status] = await db.select({
      code: STATUS_DEFINITIONS.code,
      description: STATUS_DEFINITIONS.description,
      createdAt: STATUS_DEFINITIONS.created_at,
      updatedAt: STATUS_DEFINITIONS.updated_at
    })
    .from(STATUS_DEFINITIONS)
    .where(eq(STATUS_DEFINITIONS.code, code))
    .limit(1);

    return status || null;
  }

  // ==================== TRANSLATIONS OPERATIONS ====================

  /**
   * Get translations by language code
   */
  async getTranslationsByLanguage(languageCode) {
    const [translation] = await db.select({
      id: TRANSLATIONS.id,
      languageCode: TRANSLATIONS.language_code,
      translations: TRANSLATIONS.translations,
      updatedAt: TRANSLATIONS.updated_at
    })
    .from(TRANSLATIONS)
    .where(eq(TRANSLATIONS.language_code, languageCode))
    .limit(1);

    return translation || null;
  }

  /**
   * Get all available language codes
   */
  async getAvailableLanguages() {
    const languages = await db.select({
      languageCode: TRANSLATIONS.language_code
    })
    .from(TRANSLATIONS)
    .orderBy(asc(TRANSLATIONS.language_code));

    return languages.map(lang => lang.languageCode);
  }
}

export default DatabaseService;
