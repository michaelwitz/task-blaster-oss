import { db } from '../../lib/db/index.js';
import { PROJECTS } from '../../lib/db/schema.js';

export async function seedProjects() {
  console.log('  📝 Seeding projects...');
  
  try {
    await db.insert(PROJECTS).values([
      { 
        title: 'Website Redesign', 
        code: 'WEBRED', 
        description: 'Complete overhaul of company website with modern design',
        leader_id: 5,
        status_workflow: ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
        created_by: 1
      },
      { 
        title: 'Mobile App Development', 
        code: 'MOBDEV', 
        description: 'Native mobile app for iOS and Android platforms',
        leader_id: 2,
        status_workflow: ['TO_DO', 'IN_PROGRESS', 'TESTING', 'DONE'],
        created_by: 2
      },
      { 
        title: 'API Modernization', 
        code: 'APIMOD', 
        description: 'Migrate legacy APIs to modern REST architecture',
        leader_id: 3,
        status_workflow: ['ICEBOX', 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'READY_FOR_DEPLOY', 'DONE'],
        created_by: 3
      },
      { 
        title: 'Database Migration', 
        code: 'DATAMIG', 
        description: 'Migrate all customer data to new clustered database',
        leader_id: 5,
        status_workflow: ['TO_DO', 'IN_PROGRESS', 'DONE'],
        created_by: 5
      },
      { 
        title: 'Security Compliance', 
        code: 'SECURE', 
        description: 'Annual security audit and compliance updates',
        leader_id: 4,
        status_workflow: ['AWAITING_APPROVAL', 'TO_DO', 'IN_PROGRESS', 'TESTING', 'READY_FOR_DEPLOY', 'DONE'],
        created_by: 4
      }
    ]);
    
    console.log('  ✅ Projects seeded successfully');
  } catch (error) {
    console.error('  ❌ Error seeding projects:', error.message);
    throw error;
  }
}
