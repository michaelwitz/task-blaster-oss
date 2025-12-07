import { beforeAll, afterAll } from 'vitest';
import { createTestServer } from './helpers/testServer.js';
import pactum from 'pactum';

let app;
const PORT = 3031;

beforeAll(async () => {
  app = await createTestServer();
  await app.listen({ port: PORT, host: '127.0.0.1' });
  pactum.request.setBaseUrl(`http://127.0.0.1:${PORT}`);
  pactum.request.setDefaultTimeout(10000);
});

afterAll(async () => {
  if (app) await app.close();
});
