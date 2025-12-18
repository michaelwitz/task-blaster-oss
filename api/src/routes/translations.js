import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function translationsRoutes(fastify, options) {
  const { dbService } = options;

  // Add authentication middleware to all translation routes
  fastify.addHook('preHandler', authMiddleware);

  // GET /translations/:language - Get translations for specified language
  fastify.get('/translations/:language', {
    schema: {
      params: {
        type: 'object',
        required: ['language'],
        properties: {
          language: { type: 'string', pattern: '^[a-z]{2}$' } // Two-letter language code
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            translations: { 
              type: 'object',
              additionalProperties: true  // Allow dynamic translation keys
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { language } = request.params;
      
      const translationData = await dbService.getTranslationsByLanguage(language);
      
      if (!translationData) {
        return reply.code(404).send({ error: `Translations not found for language: ${language}` });
      }
      
      // The translations field is TEXT in database, so it's returned as a string
      // Parse it to return as JSON object
      const translations = JSON.parse(translationData.translations);
      
      reply.send({ translations });
    } catch (error) {
      fastify.log.error('Translation error:', error);
      reply.code(500).send({ error: 'Failed to fetch translations' });
    }
  });
}
