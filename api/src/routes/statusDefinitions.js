import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function statusDefinitionsRoutes(fastify, options) {
  const { dbService } = options;

  // Add authentication middleware to all status definition routes
  fastify.addHook('preHandler', authMiddleware);

  // GET /status-definitions - Get all available status codes
  fastify.get('/status-definitions', {
    schema: {
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              description: { type: ['string', 'null'] },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const statuses = await dbService.getStatusDefinitions();
      reply.send(statuses);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch status definitions' });
    }
  });
}
