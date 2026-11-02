import { app } from '../backend/src/app.js';

export default function handler(req: Parameters<typeof app>[0], res: Parameters<typeof app>[1]) {
  const requestUrl = new URL(req.url ?? '/', `https://${req.headers.host ?? 'localhost'}`);
  const apiPath = requestUrl.searchParams.get('__vercelApiPath');

  if (apiPath !== null) {
    requestUrl.searchParams.delete('__vercelApiPath');
    req.url = `/api/${apiPath.replace(/^\/+/, '')}${requestUrl.search}`;
  }

  return app(req, res);
}
