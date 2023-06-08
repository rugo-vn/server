import cors from '@koa/cors';
import Koa from 'koa';
import koaBody from 'koa-body';
import applyQueryString from 'koa-qs';
import colors from 'colors';
import { defineAction } from '@rugo-vn/service';
import { nanoid } from 'nanoid';
import { curryN } from 'ramda';
import {
  logging,
  exceptHandler,
  preprocessing,
  serveStatic,
  serveView,
  injectReload,
} from './handlers.js';
import { serveApi } from './middlewares/api.js';

let listener;

defineAction('start', async function (settings) {
  // config
  const { port, engine, inject, api } = settings;
  const secret = settings.secret || nanoid();

  if (!port) throw new Error('Could not find server port');

  // app
  const server = new Koa();
  server.keys = [secret];
  applyQueryString(server); // parse query string
  server.use(cors()); // allow cors
  server.use(koaBody({ multipart: true })); // parse body

  // common middleware
  server.use(logging);
  server.use(exceptHandler);
  server.use(curryN(2, preprocessing)(settings));

  // api middleware
  if (api) server.use(curryN(2, serveApi)(api).bind(this));

  // static middleware
  if (inject) server.use(curryN(2, injectReload)(inject));
  server.use(serveStatic);

  // view middleware
  if (engine) server.use(curryN(2, serveView)(engine).bind(this));

  // listen
  await new Promise((resolve) => {
    listener = server.listen(port, () => {
      resolve();
    });
  });

  console.log(
    colors.green(
      `Server is ${colors.bold('running')} at ${colors.yellow(
        'http://localhost:' + port
      )}`
    )
  );
});

defineAction('stop', async function () {
  if (listener) await listener.close();
});
