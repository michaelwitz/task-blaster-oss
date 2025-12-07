import * as pactum from 'pactum';
import { clearTaskData, createTestTask, getTaskById } from '../helpers/testDatabase.js';

const { spec } = pactum;

// Use seeded token from seeders/seedUsers.js
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('PATCH /tasks/:id/status', () => {
  beforeEach(async () => {
    await clearTaskData();
  });

  describe('Authentication', () => {
    it('should return 401 without authentication token', async () => {
      const task = await createTestTask(1);
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(401);
    });

    it('should return 401 with invalid token', async () => {
      const task = await createTestTask(1);
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', 'invalid-token-12345')
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(401)
        .expectJsonLike({ error: 'Unauthorized' });
    });

    it('should accept valid token in TB_TOKEN header', async () => {
      const task = await createTestTask(1, { status: 'TO_DO' });
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200);
    });
  });

  describe('Validation', () => {
    it('should return 404 for non-existent task', async () => {
      await spec()
        .patch('/tasks/99999/status')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(404)
        .expectJsonLike({ error: 'Task not found' });
    });

    it('should return 400 for invalid status value', async () => {
      const task = await createTestTask(1);
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'INVALID_STATUS' })
        .expectStatus(400);
    });

    it('should require status in request body', async () => {
      const task = await createTestTask(1);
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({})
        .expectStatus(400);
    });
  });

  describe('Status Changes', () => {
    it('should change status from TO_DO to IN_PROGRESS', async () => {
      const task = await createTestTask(1, { status: 'TO_DO' });
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200)
        .expectJsonLike({ id: task.id, status: 'IN_PROGRESS' });
      const updated = await getTaskById(task.id);
      expect(updated.status).toBe('IN_PROGRESS');
    });

    it('should change status from IN_PROGRESS to DONE', async () => {
      const task = await createTestTask(1, { status: 'IN_PROGRESS' });
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'DONE' })
        .expectStatus(200)
        .expectJsonLike({ id: task.id, status: 'DONE' });
      const updated = await getTaskById(task.id);
      expect(updated.status).toBe('DONE');
    });

    it('should change status from TO_DO to REVIEW', async () => {
      const task = await createTestTask(1, { status: 'TO_DO' });
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'REVIEW' })
        .expectStatus(200)
        .expectJsonLike({ id: task.id, status: 'REVIEW' });
      const updated = await getTaskById(task.id);
      expect(updated.status).toBe('REVIEW');
    });
  });

  describe('Position Calculation', () => {
    it('should place task at bottom of empty target column', async () => {
      const task = await createTestTask(1, { status: 'TO_DO', position: 10 });
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200);
      const updated = await getTaskById(task.id);
      expect(updated.position).toBe(10);
    });

    it('should place task at bottom of non-empty target column', async () => {
      await createTestTask(1, { status: 'IN_PROGRESS', position: 10 });
      await createTestTask(1, { status: 'IN_PROGRESS', position: 20 });
      await createTestTask(1, { status: 'IN_PROGRESS', position: 30 });
      const task = await createTestTask(1, { status: 'TO_DO', position: 10 });
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200);
      const updated = await getTaskById(task.id);
      expect(updated.position).toBe(40);
    });

    it('should maintain correct position for multiple moves', async () => {
      const t1 = await createTestTask(1, { status: 'TO_DO', position: 10 });
      const t2 = await createTestTask(1, { status: 'TO_DO', position: 20 });
      await spec().patch(`/tasks/${t1.id}/status`).withHeaders('TB_TOKEN', VALID_TOKEN).withJson({ status: 'IN_PROGRESS' }).expectStatus(200);
      await spec().patch(`/tasks/${t2.id}/status`).withHeaders('TB_TOKEN', VALID_TOKEN).withJson({ status: 'IN_PROGRESS' }).expectStatus(200);
      const u1 = await getTaskById(t1.id);
      const u2 = await getTaskById(t2.id);
      expect(u1.position).toBe(10);
      expect(u2.position).toBe(20);
      expect(u2.position).toBeGreaterThan(u1.position);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve other task fields when changing status', async () => {
      const task = await createTestTask(1, { status: 'TO_DO', title: 'Important Task', priority: 'HIGH', assigneeId: 1, storyPoints: 5, prompt: 'Do something' });
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200)
        .expectJsonLike({ title: 'Important Task', priority: 'HIGH' });
    });

    it('should update updatedAt timestamp', async () => {
      const task = await createTestTask(1, { status: 'TO_DO' });
      const original = task.updated_at;
      await new Promise((r) => setTimeout(r, 50));
      await spec().patch(`/tasks/${task.id}/status`).withHeaders('TB_TOKEN', VALID_TOKEN).withJson({ status: 'IN_PROGRESS' }).expectStatus(200);
      const updated = await getTaskById(task.id);
      expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(original).getTime());
    });

    it('should return complete task object', async () => {
      const task = await createTestTask(1, { status: 'TO_DO' });
      await spec()
        .patch(`/tasks/${task.id}/status`)
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .withJson({ status: 'IN_PROGRESS' })
        .expectStatus(200)
        .expectJsonSchema({
          type: 'object',
          required: ['id', 'task_id', 'title', 'status', 'priority', 'position', 'project_id'],
          properties: {
            id: { type: 'number' },
            task_id: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string' },
            priority: { type: 'string' },
            position: { type: 'number' },
            project_id: { type: 'number' }
          }
        });
    });
  });
});
