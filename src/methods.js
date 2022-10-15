import colors from 'colors';
import cookie from 'cookie';
import { FileCursor } from '@rugo-vn/service';
import { clone, path } from 'ramda';

export const logging = async function (ctx, next) {
  const ltime = new Date();
  await next();
  const ctime = new Date();

  this.logger.info(
    colors.magenta(ctx.method) +
    ' ' +
    (Math.floor(ctx.status / 100) === 2 ? colors.green(ctx.status) : colors.red(ctx.status)) +
    ' ' +
    colors.white(ctx.url) +
    ' ' +
    colors.yellow(`${ctime - ltime}ms`)
  );
};

export const exceptHandle = async function (ctx, next) {
  try {
    await next();
  } catch (errs) {
    if (!Array.isArray(errs) || errs[0] === undefined) {
      ctx.status = 500;
      ctx.body = { errors: [{ title: 'ServerError', detail: 'Internal Server Error' }] };
      return this.logger.error(errs);
    }

    ctx.status = errs[0].status;
    ctx.body = { errors: errs };
  }
};

export const prepareRouting = async function (ctx, next) {
  // parse cookie
  const cookies = ctx.headers.cookie;

  // args
  const args = {
    method: ctx.method,
    path: ctx.path,
    // params - not yet,
    form: ctx.request.body || {},
    query: ctx.query,
    headers: ctx.headers,
    cookies: cookies ? cookie.parse(cookies) : {},
    ...clone(path(['settings', 'server', 'args'], this) || {})
  };

  ctx.args = args;

  await next();
};

export const createRouteHandle = async function (actionAddress, ctx, next) {
  const resp = await this.call(actionAddress, {
    ...ctx.args,
    params: ctx.params
  });

  if (!resp) {
    return await next();
  }

  ctx.status = 200;

  if (resp.data instanceof FileCursor) {
    ctx.body = resp.data.toStream();
  } else {
    ctx.body = resp.data;
  }

  const headers = path(['meta', 'headers'], resp) || {};
  for (const key in headers) {
    ctx.set(key, headers[key]);
  }

  const cookies = path(['meta', 'cookies'], resp) || {};
  for (const key in cookies) {
    const value = cookies[key];

    if (typeof value === 'string') {
      ctx.cookies.set(key, value);
      continue;
    }

    if (typeof value === 'object' && value.value !== undefined) {
      const opts = clone(value);
      delete opts.value;
      ctx.cookies.set(key, value.value, opts);
    }
  }
};
