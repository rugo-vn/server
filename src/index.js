import { join } from 'path';
import { RugoException } from '@rugo-vn/exception';
import Koa from 'koa';
import { curryN, path } from 'ramda';
import colors from 'colors';
import koaBody from 'koa-body';
import cors from '@koa/cors';
import applyQueryString from 'koa-qs';
import Router from '@koa/router';
import createStatic from './static.js';

export const name = 'server';

export * as methods from './methods.js';

const transformPath = async (ctx, next) => {
  ctx.args.path = join('/', ctx.params[0] || '');
  delete ctx.params[0];
  await next();
};

export const started = async function () {
  const port = path(['settings', 'server', 'port'], this);

  if (!port) { throw new RugoException('Could not find server port'); }

  const routes = path(['settings', 'server', 'routes'], this) || [];
  const server = new Koa();
  const router = new Router();
  const routeHandle = curryN(2, this.createRouteHandle);

  // serve static
  const statics = path(['settings', 'server', 'statics'], this);
  if (Array.isArray(statics)) {
    this.logger.info('Enabled static serving');
    server.use(createStatic({ statics }));
  }

  // each request start
  server.use(this.logging);

  applyQueryString(server); // parse query string
  server.use(cors()); // allow cors
  server.use(koaBody({ multipart: true })); // parse body

  // pre-routing
  server.use(this.exceptHandle);
  server.use(this.prepareRouting);

  // redirects
  const redirects = path(['settings', 'server', 'redirects'], this);
  if (Array.isArray(redirects)) {
    for (const r of redirects) {
      router.redirect(r.path, r.to);
    }
  }

  // routing
  for (const route of routes) {
    if (route.method === 'use') {
      router.all(route.path, transformPath, routeHandle(route));
      router.all(join(route.path, '(.*)'), transformPath, routeHandle(route));
      continue;
    }

    router[(route.method || 'get').toLowerCase()](route.path, routeHandle(route));
  }

  server.use(router.routes());

  // listen
  await new Promise(resolve => {
    this.listener = server.listen(port, () => {
      resolve();
    });
  });

  this.logger.info(colors.green(`Server is ${colors.bold('running')} at ${colors.yellow('http://localhost:' + port)}`));
};

export const closed = async function () {
  await this.listener.close();
  delete this.listener;
};
