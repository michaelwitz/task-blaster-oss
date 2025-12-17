import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// For tests, use DATABASE_URL_TEST; otherwise use DATABASE_URL
// This allows developers to point DATABASE_URL at any environment for troubleshooting
// while keeping tests isolated to the test database
let connectionString;
if (process.env.NODE_ENV === 'test') {
  connectionString = process.env.DATABASE_URL_TEST;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL_TEST not set. Tests require explicit test database configuration.\n' +
      'Add DATABASE_URL_TEST to your .env file'
    );
  }
} else {
  connectionString = process.env.DATABASE_URL || 
    'postgres://postgres:password@localhost:5433/task_blaster_dev';
}

// Create postgres client
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client);

// Export client for cleanup
export { client };

