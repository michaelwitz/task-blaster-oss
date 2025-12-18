/**
 * Expected status definitions for testing
 */

export const expectedStatusCodes = [
  'TO_DO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'TESTING',
  'AWAITING_APPROVAL',
  'READY_FOR_DEPLOY',
  'ICEBOX'
];

export const statusDefinitionSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['code'],
    properties: {
      code: { type: 'string' },
      description: { type: ['string', 'null'] },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' }
    }
  }
};

export const statusCodePattern = /^[A-Z_]+$/;
