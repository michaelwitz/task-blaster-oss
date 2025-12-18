import * as pactum from 'pactum';
import {
  expectedEnglishTranslations,
  expectedSpanishTranslations,
  expectedFrenchTranslations,
  expectedGermanTranslations,
  expectedTranslationStructure
} from '../fixtures/translations.js';

const { spec } = pactum;

// Use seeded token from seeders/seedUsers.js
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('GET /translations/:language', () => {
  describe('Authentication', () => {
    it('should return 401 without authentication token', async () => {
      await spec()
        .get('/translations/en')
        .expectStatus(401);
    });

    it('should return 401 with invalid token', async () => {
      await spec()
        .get('/translations/en')
        .withHeaders('TB_TOKEN', 'invalid-token-12345')
        .expectStatus(401)
        .expectJsonLike({ error: 'Unauthorized' });
    });

    it('should accept valid token in TB_TOKEN header', async () => {
      await spec()
        .get('/translations/en')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200);
    });
  });

  describe('Valid Languages', () => {
    it('should return English translations', async () => {
      await spec()
        .get('/translations/en')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLike({
          translations: expectedEnglishTranslations
        });
    });

    it('should return Spanish translations', async () => {
      await spec()
        .get('/translations/es')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLike({
          translations: expectedSpanishTranslations
        });
    });

    it('should return French translations', async () => {
      await spec()
        .get('/translations/fr')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLike({
          translations: expectedFrenchTranslations
        });
    });

    it('should return German translations', async () => {
      await spec()
        .get('/translations/de')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLike({
          translations: expectedGermanTranslations
        });
    });
  });

  describe('Invalid Languages', () => {
    it('should return 404 for unsupported language code', async () => {
      await spec()
        .get('/translations/xx')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(404)
        .expectJsonLike({ 
          error: 'Translations not found for language: xx' 
        });
    });

    it('should return 400 for invalid language format (too long)', async () => {
      await spec()
        .get('/translations/eng')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(400);
    });

    it('should return 400 for invalid language format (uppercase)', async () => {
      await spec()
        .get('/translations/EN')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(400);
    });
  });

  describe('Response Structure', () => {
    it('should return valid JSON structure', async () => {
      await spec()
        .get('/translations/en')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonSchema(expectedTranslationStructure);
    });

    it('should include status descriptions in translations', async () => {
      await spec()
        .get('/translations/en')
        .withHeaders('TB_TOKEN', VALID_TOKEN)
        .expectStatus(200)
        .expectJsonLike({
          translations: {
            tasks: {
              statusDescriptions: {}
            }
          }
        });
    });
  });
});
