import fs from 'fs';
import Koa from 'koa';
import colors from 'colors';
import koaBody from 'koa-body';
import cors from '@koa/cors';
import applyQueryString from 'koa-qs';
import Router from '@koa/router';

import { clone, curry } from 'ramda';
import { FileData } from '@rugo-vn/common';

export const name = 'server';

const log = async (logger, ctx, next) => {
  const ltime = new Date();
  await next();
  const ctime = new Date();

  logger.info(
    colors.yellow(ctx.method) +
    ' ' +
    (Math.floor(ctx.status / 100) === 2 ? colors.green(ctx.status) : colors.red(ctx.status)) +
    ' ' +
    colors.white(ctx.url) +
    ' ' +
    colors.magenta(`${ctime - ltime}ms`)
  );
};

const createRouteHandle = async (service, address, ctx, next) => {
  const res = await service.runner.call(address, {
    params: ctx.params,
    form: ctx.form,
    headers: ctx.headers,
    query: ctx.query
  }, {
    meta: {
      schemas: clone(service.settings.schemas || []),
      authSchema: clone(service.settings.authSchema)
    }
  });

  let done = true;

  if (!res) { done = false; }

  if (res && !res.status && !res.body) { done = false; }

  if (!done) { return await next(); }

  const headers = res.headers || [];
  for (const [key, value] of headers) {
    ctx.set(key, value);
  }

  ctx.status = res.status || 200;

  if (res.file){
    ctx.body = fs.createReadStream(res.file);
  } else {
    ctx.body = res.body || '';
  }
};

export const actions = {
  address () {
    return `http://127.0.0.1:${this.settings.port}`;
  }
};

/**
 *
 */
export async function started () {
  // create server
  const server = new Koa();

  // middlewares
  server.use(curry(log)(this.logger));

  // parser
  applyQueryString(server);

  server.use(cors());
  server.use(koaBody({ multipart: true }));

  server.use(async (ctx, next) => {
    ctx.form = {
      ...ctx.request.body,
      ...ctx.request.files
    };

    for (const key in ctx.form) {
      if (ctx.form[key] && ctx.form[key].constructor.name === 'PersistentFile') {
        ctx.form[key] = new FileData(ctx.form[key].filepath);
      }
    }

    return await next();
  });

  // routing
  const router = new Router();
  const routeHandle = curry(createRouteHandle)(this);

  for (const route of this.settings.routes || []) {
    router[route.method.toLowerCase()](route.path, routeHandle(route.address));
  }

  server.use(router.routes());

  // listen
  await new Promise(resolve => {
    this.listener = server.listen(this.settings.port, () => {
      resolve();
    });
  });

  this.logger.info(`Server is running at port ${this.settings.port}`);
}

/**
 *
 */
export async function stopped () {
  await this.listener.close();
  delete this.listener;
}
