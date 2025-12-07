import { beforeAll, afterAll } from 'vitest';
import { createTestServer } from './helpers/testServer.js';
import { validateTestEnvironment } from './helpers/testDatabase.js';
import pactum from 'pactum';

// Fail fast if not in test environment
if (process.env.NODE_ENV !== 'test') {
  console.error(
    '\x1b[31m%s\x1b[0m', // Red color
    '\n❌ SAFETY CHECK FAILED: Tests must run with NODE_ENV=test\n' +
    `   Current: ${process.env.NODE_ENV}\n` +
    `   Use: npm run test\n`
  );
  process.exit(1);
}

// Validate DATABASE_URL_TEST is set and points to test database
const testDbUrl = process.env.DATABASE_URL_TEST || '';
const testDbName = testDbUrl.split('/').pop()?.split('?')[0];
if (testDbName !== 'task_blaster_test') {
  console.error(
    '\x1b[31m%s\x1b[0m', // Red color
    '\n❌ SAFETY CHECK FAILED: DATABASE_URL_TEST must point to test database\n' +
    `   Current: ${testDbName}\n` +
    `   Expected: task_blaster_test\n` +
    `   Check: api/.env\n`
  );
  process.exit(1);
}

let app;
const PORT = 3031;

beforeAll(async () => {
  // Validate test environment before starting server
  await validateTestEnvironment();
  
  console.log('✅ Environment validation passed: task_blaster_test');
  
  app = await createTestServer();
  await app.listen({ port: PORT, host: '127.0.0.1' });
  pactum.request.setBaseUrl(`http://127.0.0.1:${PORT}`);
  pactum.request.setDefaultTimeout(10000);
});

afterAll(async () => {
  if (app) await app.close();
});
