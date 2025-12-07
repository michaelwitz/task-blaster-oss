import pactum from 'pactum';

let getApp = () => null;

// Register once when this module is imported
pactum.handler.addSpecHandler('fastify', async (ctx) => {
  const app = getApp();
  if (!app) throw new Error('Fastify app not bound yet');
  const { method, path, headers, body } = {
    method: ctx.req.method,
    path: ctx.req.path,
    headers: ctx.req.headers,
    body: ctx.req.body
  };
  return app.inject({ method, url: path, headers, payload: body });
});

export function bindFastifyApp(provider) {
  getApp = provider;
}
