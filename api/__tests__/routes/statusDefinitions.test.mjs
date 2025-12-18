import * as pactum from 'pactum';
import {
  expectedStatusCodes,
  statusDefinitionSchema,
  statusCodePattern
} from '../fixtures/statusDefinitions.js';

const { spec } = pactum;

// Use seeded token from seeders/seedUsers.js
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('GET /status-definitions', () => {
  describe('Authentication', () => {
    it('should return 401 without authentication token', async () => {
      await spec()
        .get('/status-definitions')
        .expectStatus(401);
    });

    it('should return 401 with invalid token', async () => {
      await spec()
        .get('/status-definitions')
        .withHeaders('TB_TOKEN', 'invalid-token-12345')
        .expectStatus(401)
        .expectJsonLike({ error: 'Unauthorized' });
    });

    it('should accept valid token in TB_TOKEN header', async () => {
      await spec()
        .get('/status-definitions')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200);
    });
  });

  describe('Response Data', () => {
    it('should return array of status definitions', async () => {
      const response = await spec()
        .get('/status-definitions')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonSchema(statusDefinitionSchema);
      
      return response;
    });

    it('should return all seeded status codes', async () => {
      const response = await spec()
        .get('/status-definitions')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200);

      const statuses = response.json;
      const statusCodes = statuses.map(s => s.code);

      // Verify all expected statuses are present
      expectedStatusCodes.forEach(code => {
        expect(statusCodes).toContain(code);
      });
      
      // Verify we have exactly 8 statuses
      expect(statuses.length).toBe(expectedStatusCodes.length);
    });

    it('should return statuses in alphabetical order by code', async () => {
      const response = await spec()
        .get('/status-definitions')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200);

      const statuses = response.json;
      const statusCodes = statuses.map(s => s.code);

      // Create sorted copy
      const sortedCodes = [...statusCodes].sort();

      // Verify codes are in alphabetical order
      expect(statusCodes).toEqual(sortedCodes);
    });

    it('should include all required fields', async () => {
      const response = await spec()
        .get('/status-definitions')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200);

      const statuses = response.json;

      statuses.forEach(status => {
        expect(status).toHaveProperty('code');
        expect(status).toHaveProperty('createdAt');
        expect(status).toHaveProperty('updatedAt');
        expect(typeof status.code).toBe('string');
        expect(status.code.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Status Code Format', () => {
    it('should return statuses in ENUM_CASE format', async () => {
      const response = await spec()
        .get('/status-definitions')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200);

      const statuses = response.json;

      statuses.forEach(status => {
        // All status codes should be uppercase with underscores
        expect(status.code).toMatch(statusCodePattern);
      });
    });
  });
});
