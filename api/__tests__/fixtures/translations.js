/**
 * Expected translation structures for testing
 * These should match the seeded translation data
 */

export const expectedEnglishTranslations = {
  tasks: {
    statuses: {
      TO_DO: 'To Do',
      IN_PROGRESS: 'In Progress',
      IN_REVIEW: 'In Review',
      DONE: 'Done'
    }
  }
};

export const expectedSpanishTranslations = {
  tasks: {
    statuses: {
      TO_DO: 'Por Hacer',
      IN_PROGRESS: 'En Progreso',
      IN_REVIEW: 'En Revisión',
      DONE: 'Completado'  // Updated to match actual seeded data
    }
  }
};

export const expectedFrenchTranslations = {
  tasks: {
    statuses: {}
  }
};

export const expectedGermanTranslations = {
  tasks: {
    statuses: {}
  }
};

export const expectedTranslationStructure = {
  type: 'object',
  required: ['translations'],
  properties: {
    translations: {
      type: 'object'
    }
  }
};
