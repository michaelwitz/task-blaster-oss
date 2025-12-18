import * as pactum from 'pactum';
import { clearTaskData, createTestTask } from '../helpers/testDatabase.js';
import {
  defaultStatusWorkflow,
  allAvailableStatuses,
  minimalWorkflow,
  threeStatusWorkflow,
  reorderedWorkflow,
  statusWorkflowSchema
} from '../fixtures/projectStatuses.js';

const { spec } = pactum;

// Use seeded token from seeders/seedUsers.js
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('Project Status Workflow', () => {
  beforeEach(async () => {
    await clearTaskData();
  });

  describe('GET /projects/:code/statuses', () => {
    beforeEach(async () => {
      // Reset to default workflow to ensure test isolation
      await spec()
        .put('/projects/WEBRED/statuses')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ statusWorkflow: defaultStatusWorkflow })
        .expectStatus(200);
    });

    describe('Authentication', () => {
      it('should return 401 without authentication token', async () => {
        await spec()
          .get('/projects/WEBRED/statuses')
          .expectStatus(401);
      });

      it('should return 401 with invalid token', async () => {
        await spec()
          .get('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', 'invalid-token-12345')
          .expectStatus(401)
          .expectJsonLike({ error: 'Unauthorized' });
      });
    });

    describe('Valid Project', () => {
      it('should return status workflow for existing project', async () => {
        await spec()
          .get('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200)
          .expectJsonSchema(statusWorkflowSchema);
      });

      it('should return default workflow for WEBRED project', async () => {
        const response = await spec()
          .get('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);

        const { statusWorkflow } = response.json;
        
        // WEBRED project has 3 statuses by default
        expect(statusWorkflow).toHaveLength(defaultStatusWorkflow.length);
        expect(statusWorkflow).toEqual(defaultStatusWorkflow);
      });
    });

    describe('Invalid Project', () => {
      it('should return 404 for non-existent project', async () => {
        await spec()
          .get('/projects/NOTFOUND/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(404)
          .expectJsonLike({ error: 'Project not found' });
      });
    });
  });

  describe('PUT /projects/:code/statuses', () => {
    describe('Authentication and Authorization', () => {
      it('should return 401 without authentication token', async () => {
        await spec()
          .put('/projects/WEBRED/statuses')
          .withJson({ statusWorkflow: ['TO_DO', 'DONE'] })
          .expectStatus(401);
      });

      it('should return 401 with invalid token', async () => {
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', 'invalid-token-12345')
          .withJson({ statusWorkflow: ['TO_DO', 'DONE'] })
          .expectStatus(401);
      });

      it('should allow project leader to update workflow', async () => {
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: threeStatusWorkflow })
          .expectStatus(200);
      });

      // Note: Testing non-leader access would require seeding another user
    });

    describe('Valid Workflow Updates', () => {
      it('should update workflow to 3 statuses', async () => {
        const response = await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: threeStatusWorkflow })
          .expectStatus(200);

        const { statusWorkflow } = response.json;
        expect(statusWorkflow).toEqual(threeStatusWorkflow);
        expect(statusWorkflow).toHaveLength(threeStatusWorkflow.length);
      });

      it('should update workflow to use all 8 available statuses', async () => {
        const response = await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: allAvailableStatuses })
          .expectStatus(200);

        const { statusWorkflow } = response.json;
        expect(statusWorkflow).toHaveLength(allAvailableStatuses.length);
      });

      it('should allow reordering statuses', async () => {
        const response = await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: reorderedWorkflow })
          .expectStatus(200);

        const { statusWorkflow } = response.json;
        expect(statusWorkflow).toEqual(reorderedWorkflow);
      });

      it('should allow minimal 1-status workflow', async () => {
        const response = await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: minimalWorkflow })
          .expectStatus(200);

        const { statusWorkflow } = response.json;
        expect(statusWorkflow).toEqual(minimalWorkflow);
        expect(statusWorkflow).toHaveLength(minimalWorkflow.length);
      });
    });

    describe('Invalid Workflow Updates', () => {
      it('should return 400 for empty workflow array', async () => {
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: [] })
          .expectStatus(400);
      });

      it('should return 400 for missing statusWorkflow field', async () => {
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({})
          .expectStatus(400);
      });

      it('should return 400 for invalid status code', async () => {
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: ['TO_DO', 'INVALID_STATUS', 'DONE'] })
          .expectStatus(400)
          .expectJsonLike({ 
            error: 'Invalid status codes',
            invalidStatuses: ['INVALID_STATUS']
          });
      });

      it('should return 400 for multiple invalid status codes', async () => {
        const response = await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ 
            statusWorkflow: ['TO_DO', 'FAKE_ONE', 'DONE', 'FAKE_TWO'] 
          })
          .expectStatus(400)
          .expectJsonLike({ 
            error: 'Invalid status codes'
          });

        const { invalidStatuses } = response.json;
        expect(invalidStatuses).toContain('FAKE_ONE');
        expect(invalidStatuses).toContain('FAKE_TWO');
        expect(invalidStatuses).toHaveLength(2);
      });
    });

    describe('Task Validation', () => {
      it('should prevent removing status when tasks exist with that status', async () => {
        // First ensure IN_REVIEW is in the workflow
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] })
          .expectStatus(200);

        // Create a task with IN_REVIEW status
        await createTestTask(1, { status: 'IN_REVIEW' });

        // Try to remove IN_REVIEW from workflow - should fail
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: ['TO_DO', 'IN_PROGRESS', 'DONE'] })
          .expectStatus(400)
          .expectJsonLike({ 
            error: "Cannot remove status 'IN_REVIEW' because tasks exist with this status"
          });
      });

      it('should allow removing status when no tasks exist with that status', async () => {
        // Create tasks only with TO_DO and DONE
        await createTestTask(1, { status: 'TO_DO' });
        await createTestTask(1, { status: 'DONE' });

        // Should successfully remove IN_PROGRESS and IN_REVIEW
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: ['TO_DO', 'DONE'] })
          .expectStatus(200);
      });

      it('should allow adding new statuses regardless of existing tasks', async () => {
        // Create task with default statuses
        await createTestTask(1, { status: 'TO_DO' });

        // Should allow adding TESTING to workflow
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: ['TO_DO', 'IN_PROGRESS', 'TESTING', 'DONE'] })
          .expectStatus(200);
      });

      it('should allow keeping all statuses when tasks exist', async () => {
        // Create tasks in various statuses
        await createTestTask(1, { status: 'TO_DO' });
        await createTestTask(1, { status: 'IN_PROGRESS' });
        await createTestTask(1, { status: 'IN_REVIEW' });
        await createTestTask(1, { status: 'DONE' });

        // Should allow reordering without removing any
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: ['DONE', 'IN_REVIEW', 'IN_PROGRESS', 'TO_DO'] })
          .expectStatus(200);
      });
    });

    describe('Workflow Persistence', () => {
      it('should persist workflow changes', async () => {
        // Update workflow
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: ['TO_DO', 'TESTING', 'DONE'] })
          .expectStatus(200);

        // Verify persistence by fetching again
        const response = await spec()
          .get('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);

        const { statusWorkflow } = response.json;
        expect(statusWorkflow).toEqual(['TO_DO', 'TESTING', 'DONE']);
      });

      it('should include statusWorkflow in project details', async () => {
        // Update workflow first
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: ['TO_DO', 'IN_PROGRESS', 'DONE'] })
          .expectStatus(200);

        // Get full project details
        const response = await spec()
          .get('/projects/1')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);

        const project = response.json;
        expect(project).toHaveProperty('statusWorkflow');
        expect(project.statusWorkflow).toEqual(['TO_DO', 'IN_PROGRESS', 'DONE']);
      });
    });

    describe('4-Status Workflow Operations', () => {
      const fourStatusWorkflow = ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

      beforeEach(async () => {
        // Set up 4-status workflow for each test
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: fourStatusWorkflow })
          .expectStatus(200);
      });

      it('should successfully set 4-status workflow', async () => {
        const response = await spec()
          .get('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);

        const { statusWorkflow } = response.json;
        expect(statusWorkflow).toEqual(fourStatusWorkflow);
        expect(statusWorkflow).toHaveLength(4);
      });

      it('should allow creating tasks in all 4 statuses', async () => {
        // Create tasks in each status
        const todoTask = await createTestTask(1, { status: 'TO_DO' });
        const inProgressTask = await createTestTask(1, { status: 'IN_PROGRESS' });
        const inReviewTask = await createTestTask(1, { status: 'IN_REVIEW' });
        const doneTask = await createTestTask(1, { status: 'DONE' });

        // Verify all tasks were created
        expect(todoTask.status).toBe('TO_DO');
        expect(inProgressTask.status).toBe('IN_PROGRESS');
        expect(inReviewTask.status).toBe('IN_REVIEW');
        expect(doneTask.status).toBe('DONE');
      });

      it('should prevent removing any status when tasks exist in all statuses', async () => {
        // Create tasks in all statuses
        await createTestTask(1, { status: 'TO_DO' });
        await createTestTask(1, { status: 'IN_PROGRESS' });
        await createTestTask(1, { status: 'IN_REVIEW' });
        await createTestTask(1, { status: 'DONE' });

        // Try to remove IN_REVIEW - should fail
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: ['TO_DO', 'IN_PROGRESS', 'DONE'] })
          .expectStatus(400)
          .expectJsonLike({ 
            error: "Cannot remove status 'IN_REVIEW' because tasks exist with this status"
          });
      });

      it('should allow reordering all 4 statuses', async () => {
        const reordered = ['DONE', 'IN_REVIEW', 'IN_PROGRESS', 'TO_DO'];
        
        const response = await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: reordered })
          .expectStatus(200);

        const { statusWorkflow } = response.json;
        expect(statusWorkflow).toEqual(reordered);
        expect(statusWorkflow).toHaveLength(4);
      });

      it('should allow expanding from 4 to 5 statuses', async () => {
        const fiveStatusWorkflow = ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'TESTING', 'DONE'];
        
        const response = await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: fiveStatusWorkflow })
          .expectStatus(200);

        const { statusWorkflow } = response.json;
        expect(statusWorkflow).toEqual(fiveStatusWorkflow);
        expect(statusWorkflow).toHaveLength(5);
      });

      it('should allow reducing from 4 to 3 statuses when no tasks in removed status', async () => {
        // Create tasks only in 3 of the 4 statuses
        await createTestTask(1, { status: 'TO_DO' });
        await createTestTask(1, { status: 'IN_PROGRESS' });
        await createTestTask(1, { status: 'DONE' });
        // No tasks in IN_REVIEW

        const response = await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: threeStatusWorkflow })
          .expectStatus(200);

        const { statusWorkflow } = response.json;
        expect(statusWorkflow).toEqual(threeStatusWorkflow);
        expect(statusWorkflow).toHaveLength(3);
      });

      it('should maintain 4-status workflow in project details', async () => {
        const response = await spec()
          .get('/projects/1')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);

        const project = response.json;
        expect(project).toHaveProperty('statusWorkflow');
        expect(project.statusWorkflow).toEqual(fourStatusWorkflow);
        expect(project.statusWorkflow).toHaveLength(4);
      });
    });

    describe('End-to-End User Flow: Adding New Status', () => {
      beforeEach(async () => {
        // Reset to default workflow before each E2E test
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: defaultStatusWorkflow })
          .expectStatus(200);
      });

      it('should complete full workflow of adding TESTING status and using it', async () => {
        // Step 1: Verify available status definitions include TESTING
        const statusDefsResponse = await spec()
          .get('/status-definitions')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);
        
        const availableStatuses = statusDefsResponse.json;
        const statusCodes = availableStatuses.map(s => s.code);
        expect(statusCodes).toContain('TESTING');

        // Step 2: Check current project workflow (should be default 3-status)
        const initialWorkflowResponse = await spec()
          .get('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);
        
        const initialWorkflow = initialWorkflowResponse.json.statusWorkflow;
        expect(initialWorkflow).toEqual(defaultStatusWorkflow);
        expect(initialWorkflow).not.toContain('TESTING');

        // Step 3: Project leader adds TESTING status to workflow
        const updatedWorkflow = ['TO_DO', 'IN_PROGRESS', 'TESTING', 'DONE'];
        const updateResponse = await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: updatedWorkflow })
          .expectStatus(200);
        
        expect(updateResponse.json.statusWorkflow).toEqual(updatedWorkflow);

        // Step 4: Verify the workflow change persisted
        const verifyResponse = await spec()
          .get('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);
        
        expect(verifyResponse.json.statusWorkflow).toEqual(updatedWorkflow);
        expect(verifyResponse.json.statusWorkflow).toContain('TESTING');

        // Step 5: Create tasks in the new workflow including TESTING status
        const todoTask = await createTestTask(1, { 
          status: 'TO_DO', 
          title: 'Implement feature' 
        });
        expect(todoTask.status).toBe('TO_DO');

        const inProgressTask = await createTestTask(1, { 
          status: 'IN_PROGRESS', 
          title: 'Build component' 
        });
        expect(inProgressTask.status).toBe('IN_PROGRESS');

        const testingTask = await createTestTask(1, { 
          status: 'TESTING', 
          title: 'Run test suite' 
        });
        expect(testingTask.status).toBe('TESTING');
        expect(testingTask.title).toBe('Run test suite');

        const doneTask = await createTestTask(1, { 
          status: 'DONE', 
          title: 'Deploy to production' 
        });
        expect(doneTask.status).toBe('DONE');

        // Step 6: Verify project details include the updated workflow
        const projectResponse = await spec()
          .get('/projects/1')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);
        
        const project = projectResponse.json;
        expect(project.statusWorkflow).toEqual(updatedWorkflow);
        expect(project.statusWorkflow).toHaveLength(4);

        // Step 7: Verify translation exists for TESTING status
        const translationResponse = await spec()
          .get('/translations/en')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);
        
        const translations = translationResponse.json.translations;
        expect(translations.tasks.statuses).toHaveProperty('TESTING');
        expect(translations.tasks.statusDescriptions).toHaveProperty('TESTING');

        // Step 8: Verify TESTING status cannot be removed while task exists
        const removeAttemptResponse = await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: ['TO_DO', 'IN_PROGRESS', 'DONE'] })
          .expectStatus(400);
        
        expect(removeAttemptResponse.json.error).toContain('TESTING');
        expect(removeAttemptResponse.json.error).toContain('tasks exist');

        // Step 9: Verify workflow remains unchanged after failed removal
        const finalWorkflowResponse = await spec()
          .get('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);
        
        expect(finalWorkflowResponse.json.statusWorkflow).toEqual(updatedWorkflow);
      });

      it('should complete full workflow of adding multiple new statuses', async () => {
        // Start with default workflow
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: defaultStatusWorkflow })
          .expectStatus(200);

        // Add TESTING and READY_FOR_DEPLOY statuses
        const enhancedWorkflow = [
          'TO_DO',
          'IN_PROGRESS',
          'TESTING',
          'READY_FOR_DEPLOY',
          'DONE'
        ];

        const updateResponse = await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: enhancedWorkflow })
          .expectStatus(200);
        
        expect(updateResponse.json.statusWorkflow).toEqual(enhancedWorkflow);
        expect(updateResponse.json.statusWorkflow).toHaveLength(5);

        // Create tasks in new statuses
        const testingTask = await createTestTask(1, { 
          status: 'TESTING',
          title: 'QA validation' 
        });
        const deployTask = await createTestTask(1, { 
          status: 'READY_FOR_DEPLOY',
          title: 'Release v2.0' 
        });

        expect(testingTask.status).toBe('TESTING');
        expect(deployTask.status).toBe('READY_FOR_DEPLOY');

        // Verify both statuses have translations
        const translationResponse = await spec()
          .get('/translations/en')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .expectStatus(200);
        
        const translations = translationResponse.json.translations;
        expect(translations.tasks.statuses.TESTING).toBeDefined();
        expect(translations.tasks.statuses.READY_FOR_DEPLOY).toBeDefined();
        expect(translations.tasks.statusDescriptions.TESTING).toBeDefined();
        expect(translations.tasks.statusDescriptions.READY_FOR_DEPLOY).toBeDefined();

        // Verify removal is blocked for both
        await spec()
          .put('/projects/WEBRED/statuses')
          .withHeaders('TB_TOKEN', VALID_TOKEN)
          .withJson({ statusWorkflow: ['TO_DO', 'IN_PROGRESS', 'DONE'] })
          .expectStatus(400);
      });
    });
  });
});
