import pactumSupertest from 'pactum-supertest';

/**
 * Configure PactumJS to run requests against the in-process Fastify app
 * via pactum-supertest (no external network / server listen required).
 * @param {object} app - Fastify instance
 */
export function configurePactum(app) {
  // Shim mocha-style hooks for pactum-supertest when running under Jest
  if (typeof global.before === 'undefined' && typeof beforeAll !== 'undefined') {
    global.before = beforeAll;
  }
  if (typeof global.after === 'undefined' && typeof afterAll !== 'undefined') {
    global.after = afterAll;
  }
  // Bind Pactum to the Fastify instance
  pactumSupertest(app);
}
