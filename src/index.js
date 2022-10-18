import { RugoException } from '@rugo-vn/service';
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

export const started = async function () {
  const port = path(['settings', 'server', 'port'], this);

  if (!port) { throw new RugoException('Could not find server port'); }

  const routes = path(['settings', 'server', 'routes'], this) || [];
  const server = new Koa();

  // serve static
  const staticDir = path(['settings', 'server', 'static'], this);
  if (staticDir) {
    this.logger.info(`Enabled static serving`);
    server.use(createStatic({ root: staticDir }));
  }

  // each request start
  server.use(this.logging);

  applyQueryString(server); // parse query string
  server.use(cors()); // allow cors
  server.use(koaBody({ multipart: true })); // parse body

  // pre-routing
  server.use(this.exceptHandle);
  server.use(this.prepareRouting);

  // routing
  const router = new Router();
  const routeHandle = curryN(2, this.createRouteHandle);

  for (const route of routes) {
    router[(route.method || 'get').toLowerCase()](route.path, routeHandle(route.action));
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
