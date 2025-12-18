/**
 * Expected project status workflow structures for testing
 */

export const defaultStatusWorkflow = ['TO_DO', 'IN_PROGRESS', 'DONE'];  // WEBRED project default workflow

export const allAvailableStatuses = [
  'TO_DO',
  'IN_PROGRESS', 
  'IN_REVIEW',
  'DONE',
  'TESTING',
  'AWAITING_APPROVAL',
  'READY_FOR_DEPLOY',
  'ICEBOX'
];

export const minimalWorkflow = ['TO_DO'];

export const threeStatusWorkflow = ['TO_DO', 'IN_PROGRESS', 'DONE'];

export const reorderedWorkflow = ['DONE', 'IN_PROGRESS', 'TO_DO'];

export const statusWorkflowSchema = {
  type: 'object',
  required: ['statusWorkflow'],
  properties: {
    statusWorkflow: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};
