import { projectSchemas } from '../schemas/validation.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function projectRoutes(fastify, options) {
  const { dbService } = options;

  // Add authentication middleware to all project routes
  fastify.addHook('preHandler', authMiddleware);

  // GET /projects - List all projects with details
  fastify.get('/projects', {
    schema: projectSchemas.getProjects
  }, async (request, reply) => {
    try {
      const projects = await dbService.getProjectsWithDetails();
      reply.send(projects);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch projects' });
    }
  });

  // GET /projects/:id - Get specific project
  fastify.get('/projects/:id', {
    schema: projectSchemas.getProjectById
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const project = await dbService.getProjectById(parseInt(id));
      
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      reply.send(project);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch project' });
    }
  });

  // POST /projects - Create new project
  fastify.post('/projects', {
    schema: projectSchemas.createProject
  }, async (request, reply) => {
    try {
      const project = await dbService.createProject(request.body);
      reply.code(201).send(project);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to create project' });
    }
  });

  // PUT /projects/:id - Update project
  fastify.put('/projects/:id', {
    schema: projectSchemas.updateProject
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const project = await dbService.updateProject(parseInt(id), request.body);
      
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      reply.send(project);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update project' });
    }
  });

  // DELETE /projects/:id - Delete project
  fastify.delete('/projects/:id', {
    schema: projectSchemas.deleteProject
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const project = await dbService.deleteProject(parseInt(id));
      
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      reply.send({ message: 'Project deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to delete project' });
    }
  });

  // GET /projects/:id/tasks - Get tasks for project
  fastify.get('/projects/:id/tasks', {
    schema: projectSchemas.getProjectTasks
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { status, priority } = request.query;
      const filters = { projectId: parseInt(id), status, priority };
      
      const tasks = await dbService.getTasks(filters);
      reply.send(tasks);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch project tasks' });
    }
  });

  // GET /projects/:id/kanban/tasks/column/:status - Get column positions for a specific status
  fastify.get('/projects/:id/kanban/tasks/column/:status', {
    schema: {
      params: {
        type: 'object',
        required: ['id', 'status'],
        properties: {
          id: { type: 'string', pattern: '^\\d+$' },
          status: { type: 'string', pattern: '^[A-Z_]+$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { id, status } = request.params;
      const projectId = parseInt(id);
      
      const columnTasks = await dbService.getColumnPositions(projectId, status);
      reply.send(columnTasks);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch column positions' });
    }
  });

  // PATCH /projects/:code/kanban/tasks/column/:status/positions - Update multiple task positions in a column
  fastify.patch('/projects/:code/kanban/tasks/column/:status/positions', {
    schema: {
      params: {
        type: 'object',
        required: ['code', 'status'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' }, // Project code like PROJ, FEATURE
          status: { type: 'string', pattern: '^[A-Z_]+$' }
        }
      },
      body: {
        type: 'object',
        required: ['positionUpdates'],
        properties: {
          positionUpdates: {
            type: 'array',
            items: {
              type: 'object',
              required: ['taskId', 'newPosition'],
              properties: {
                taskId: { type: 'number' },
                newPosition: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code, status } = request.params;
      const { positionUpdates } = request.body;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      const updatedTasks = await dbService.updateColumnPositions(project.id, status, positionUpdates);
      reply.send(updatedTasks);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update column positions' });
    }
  });

  // PATCH /projects/:code/kanban/tasks/:taskId/position - Update single task position
  fastify.patch('/projects/:code/kanban/tasks/:taskId/position', {
    schema: {
      params: {
        type: 'object',
        required: ['code', 'taskId'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' }, // Project code like PROJ, FEATURE
          taskId: { type: 'string', pattern: '^\\d+$' }
        }
      },
      body: {
        type: 'object',
        required: ['newPosition', 'status'],
        properties: {
          newPosition: { type: 'number' },
          status: { type: 'string', pattern: '^[A-Z_]+$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code, taskId } = request.params;
      const { newPosition, status } = request.body;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      const taskIdNum = parseInt(taskId);
      const updatedTask = await dbService.updateTaskPosition(taskIdNum, newPosition, status);
      reply.send(updatedTask);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update task position' });
    }
  });

  // PATCH /projects/:code/tasks/:taskId/status - Change task status (project-scoped)
  fastify.patch('/projects/:code/tasks/:taskId/status', {
    schema: projectSchemas.updateTaskStatus
  }, async (request, reply) => {
    try {
      const { code, taskId } = request.params;
      const { status } = request.body;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      // Get current task by task_id
      const currentTask = await dbService.getTaskByTaskId(taskId);
      if (!currentTask) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      // Verify the task belongs to the specified project
      if (currentTask.projectId !== project.id) {
        return reply.code(403).send({ error: 'Task does not belong to this project' });
      }
      
      // Get tasks in target column to determine position
      const targetColumnTasks = await dbService.getTasks({ 
        projectId: currentTask.projectId, 
        status 
      });
      
      // Calculate new position (at the bottom of the column)
      const newPosition = targetColumnTasks.length > 0 ? 
        Math.max(...targetColumnTasks.map(t => t.position || 0)) + 10 : 10;
      
      // Update task with new status and position
      const updatedTask = await dbService.updateTask(currentTask.id, {
        ...currentTask,
        status,
        position: newPosition,
        updatedAt: new Date()
      });
      
      request.log.info(`Task ${taskId} status changed from ${currentTask.status} to ${status}`);
      reply.send(updatedTask);
    } catch (error) {
      request.log.error(error, 'Failed to change task status');
      reply.code(500).send({ error: 'Failed to change task status' });
    }
  });

  // PUT /projects/:code/tasks/:taskId - Update task (project-scoped)
  fastify.put('/projects/:code/tasks/:taskId', {
    schema: projectSchemas.updateTask
  }, async (request, reply) => {
    try {
      const { code, taskId } = request.params;
      const taskData = request.body;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      // Get current task by task_id
      const currentTask = await dbService.getTaskByTaskId(taskId);
      if (!currentTask) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      // Verify the task belongs to the specified project
      if (currentTask.projectId !== project.id) {
        return reply.code(403).send({ error: 'Task does not belong to this project' });
      }
      
      // Update task
      const updatedTask = await dbService.updateTask(currentTask.id, taskData);
      
      request.log.info(`Task ${taskId} updated`);
      reply.send(updatedTask);
    } catch (error) {
      request.log.error(error, 'Failed to update task');
      reply.code(500).send({ error: 'Failed to update task' });
    }
  });

  // DELETE /projects/:code/tasks/:taskId - Delete task (project-scoped)
  fastify.delete('/projects/:code/tasks/:taskId', {
    schema: projectSchemas.deleteTask
  }, async (request, reply) => {
    try {
      const { code, taskId } = request.params;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      // Get current task by task_id
      const currentTask = await dbService.getTaskByTaskId(taskId);
      if (!currentTask) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      
      // Verify the task belongs to the specified project
      if (currentTask.projectId !== project.id) {
        return reply.code(403).send({ error: 'Task does not belong to this project' });
      }
      
      // Delete task
      const deletedTask = await dbService.deleteTask(currentTask.id);
      
      request.log.info(`Task ${taskId} deleted`);
      reply.send({ message: 'Task deleted successfully' });
    } catch (error) {
      request.log.error(error, 'Failed to delete task');
      reply.code(500).send({ error: 'Failed to delete task' });
    }
  });

  // GET /projects/:code/statuses - Get project's status workflow
  fastify.get('/projects/:code/statuses', {
    schema: {
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            statusWorkflow: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code } = request.params;
      
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      reply.send({ statusWorkflow: project.statusWorkflow });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch project status workflow' });
    }
  });

  // PUT /projects/:code/statuses - Update project's status workflow (leaders only)
  fastify.put('/projects/:code/statuses', {
    schema: {
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z0-9]+$' }
        }
      },
      body: {
        type: 'object',
        required: ['statusWorkflow'],
        properties: {
          statusWorkflow: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { code } = request.params;
      const { statusWorkflow } = request.body;
      
      // Get project by code
      const project = await dbService.getProjectByCode(code);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      
      // Verify user is project leader
      if (project.leaderId !== request.user.id) {
        return reply.code(403).send({ error: 'Only project leaders can update status workflow' });
      }
      
      // Validate all status codes exist in STATUS_DEFINITIONS
      const validStatuses = await dbService.getStatusDefinitions();
      const validStatusCodes = validStatuses.map(s => s.code);
      
      const invalidStatuses = statusWorkflow.filter(status => !validStatusCodes.includes(status));
      if (invalidStatuses.length > 0) {
        return reply.code(400).send({ 
          error: 'Invalid status codes', 
          invalidStatuses 
        });
      }
      
      // Check if any statuses being removed have tasks
      const currentWorkflow = project.statusWorkflow;
      const removedStatuses = currentWorkflow.filter(status => !statusWorkflow.includes(status));
      
      for (const status of removedStatuses) {
        const hasTasks = await dbService.hasTasksWithStatus(project.id, status);
        if (hasTasks) {
          return reply.code(400).send({ 
            error: `Cannot remove status '${status}' because tasks exist with this status` 
          });
        }
      }
      
      // Update the workflow
      const updatedProject = await dbService.updateProjectStatusWorkflow(
        project.id, 
        statusWorkflow, 
        request.user.id
      );
      
      request.log.info(`Project ${code} status workflow updated by user ${request.user.id}`);
      reply.send({ 
        statusWorkflow: updatedProject.status_workflow 
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to update project status workflow' });
    }
  });
}
