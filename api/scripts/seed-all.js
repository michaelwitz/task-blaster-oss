import { seedUsers } from './seeders/seedUsers.js';
import { seedStatusDefinitions } from './seeders/seedStatusDefinitions.js';
import { seedTranslations } from './seeders/seedTranslations.js';
import { seedProjects } from './seeders/seedProjects.js';
import { seedTags } from './seeders/seedTags.js';
import { seedTasks } from './seeders/seedTasks.js';
import { seedTaskTags } from './seeders/seedTaskTags.js';
import { client } from '../lib/db/index.js';

// Safety check: Prevent seeding production
if (process.env.NODE_ENV === 'production') {
  console.error(
    '\x1b[31m%s\x1b[0m',
    '\n❌ SAFETY CHECK FAILED: Cannot seed production database\n' +
    '   NODE_ENV=production detected\n'
  );
  process.exit(1);
}

// Safety check: Validate database name
const dbUrl = process.env.DATABASE_URL || '';
const dbName = dbUrl.split('/').pop()?.split('?')[0];

const allowedDatabases = ['task_blaster_dev', 'task_blaster_test'];
if (!allowedDatabases.includes(dbName)) {
  console.error(
    '\x1b[31m%s\x1b[0m',
    '\n❌ SAFETY CHECK FAILED: Cannot seed this database\n' +
    `   Current database: ${dbName}\n` +
    `   Allowed: ${allowedDatabases.join(', ')}\n`
  );
  process.exit(1);
}

console.log(`✅ Safety check passed. Seeding database: ${dbName}`);

async function seedAll() {
  try {
    console.log('🌱 Seeding database data in correct order...');
    console.log('');

    // Step 1: Seed independent tables first (no foreign keys)
    console.log('📋 Step 1: Seeding base entities...');
    await seedUsers();
    await seedStatusDefinitions();
    await seedTranslations();
    await seedTags();
    console.log('');

    // Step 2: Seed tables that depend on users
    console.log('📋 Step 2: Seeding projects (depends on users)...');
    await seedProjects();
    console.log('');

    // Step 3: Seed tables that depend on projects and users
    console.log('📋 Step 3: Seeding tasks (depends on projects and users)...');
    await seedTasks();
    console.log('');

    // Step 4: Seed relationship tables
    console.log('📋 Step 4: Seeding relationships (depends on tasks and tags)...');
    await seedTaskTags();
    console.log('');

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log('   • 4 users created');
    console.log('   • 8 status definitions created');
    console.log('   • 4 translation sets created (en, es, fr, de)');
    console.log('   • 3 projects created');
    console.log('   • 6 tags created');
    console.log('   • 5 tasks created');
    console.log('   • 10 task-tag relationships created');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    console.error('🔍 Full error:', error);
    await client.end();
    process.exit(1);
  } finally {
    // Close database connection
    await client.end();
  }
}

seedAll();

