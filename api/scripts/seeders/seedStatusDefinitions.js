import { db } from '../../lib/db/index.js';
import { STATUS_DEFINITIONS } from '../../lib/db/schema.js';

export async function seedStatusDefinitions() {
  console.log('  📝 Seeding status definitions...');
  
  try {
    await db.insert(STATUS_DEFINITIONS).values([
      { 
        code: 'TO_DO',
        description: 'Tasks that are planned but not yet started'
      },
      { 
        code: 'IN_PROGRESS',
        description: 'Tasks currently being worked on'
      },
      { 
        code: 'IN_REVIEW',
        description: 'Tasks awaiting code review or approval'
      },
      { 
        code: 'DONE',
        description: 'Completed tasks'
      },
      { 
        code: 'TESTING',
        description: 'Tasks in testing phase'
      },
      { 
        code: 'AWAITING_APPROVAL',
        description: 'Tasks waiting for stakeholder approval'
      },
      { 
        code: 'READY_FOR_DEPLOY',
        description: 'Tasks ready to be deployed to production'
      },
      { 
        code: 'ICEBOX',
        description: 'Tasks that are deprioritized or on hold'
      }
    ]);
    
    console.log('  ✅ Status definitions seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding status definitions:', error.message);
    throw error;
  }
}
