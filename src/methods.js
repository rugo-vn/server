import colors from 'colors';
import cookie from 'cookie';
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
  let args = {
    method: ctx.method,
    path: ctx.path,
    // params - not yet,
    form: ctx.request.body || {},
    query: ctx.query,
    headers: ctx.headers,
    cookies: cookies ? cookie.parse(cookies) : {}
  };
  let shared = clone(path(['settings', 'server', 'shared'], this) || {});

  // prepare action
  const prepareAction = path(['settings', 'server', 'prepare'], this);
  if (prepareAction) {
    const resp = await this.call(prepareAction, { args, shared });
    args = resp && resp.args ? resp.args : args;
    shared = resp && resp.shared ? resp.shared : shared;
  }

  ctx.args = args;
  ctx.shared = shared;

  await next();
};

export const createRouteHandle = async function (actionAddress, ctx, next) {
  const resp = await this.call(actionAddress, {
    ...ctx.args,
    params: ctx.params
  }, ctx.shared);

  if (!resp) {
    return await next();
  }

  ctx.status = 200;
  ctx.body = resp.data;

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
