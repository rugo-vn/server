import colors from 'colors';
import cookie from 'cookie';
import { FileCursor } from '@rugo-vn/service';
import { mergeDeepLeft, path } from 'ramda';
import { SPACE_HEADER_NAME } from './constants.js';
import { generateObject, makeResponse, matchRoute } from './utils.js';
import * as localHandlers from './handlers.js';

export const logging = async function (ctx, next) {
  ctx.logs = [];

  const ltime = new Date();
  await next();
  const ctime = new Date();

  const msgs = ctx.logs;

  msgs.push(colors.magenta(ctx.method));
  msgs.push(
    Math.floor(ctx.status / 100) === 2
      ? colors.green(ctx.status)
      : colors.red(ctx.status)
  );
  msgs.push(colors.white(ctx.url));

  const redirectLocation = path(['response', 'header', 'location'], ctx);
  if (redirectLocation) {
    msgs.push(colors.gray(`-> ${redirectLocation}`));
  }

  msgs.push(colors.yellow(`${ctime - ltime}ms`));

  this.logger.http(msgs.join(' '));
};

export const exceptHandler = async function (ctx, next) {
  try {
    await next();
  } catch (err) {
    if (!err.status) {
      makeResponse(ctx, { status: 500 });
      return this.logger.error(err);
    }

    makeResponse(ctx, { status: err.status, body: { error: err } });
  }
};

export const spaceParser = async function (ctx, next) {
  // app id
  const spaceId = ctx.headers[SPACE_HEADER_NAME];
  const spaceAction = path(['settings', 'server', 'space'], this);

  if (!spaceAction) {
    return;
  }

  const space =
    typeof spaceAction === 'string'
      ? await this.call(spaceAction, { id: spaceId })
      : spaceAction;

  if (!space) {
    return;
  }

  ctx.logs.push(`[${colors.green(space.name)}]`);

  // parse cookie
  const cookies = ctx.headers.cookie;

  // form
  const form = ctx.request.body;
  for (const key in ctx.request.files) {
    form[key] = new FileCursor(ctx.request.files[key].filepath);
  }

  // assign spaceId to default perms
  for (let perm of space.perms || []) {
    if (!perm.spaceId) perm.spaceId = space.id;
  }

  // args
  const args = {
    method: ctx.method,
    path: ctx.path,
    // params - not yet,
    query: ctx.query,
    headers: ctx.headers,
    cookies: cookies ? cookie.parse(cookies) : {},
    form,
    space,
  };

  ctx.args = args;

  await next();
};

export const routeHandler = async function (ctx) {
  const { space, method, path: reqPath } = ctx.args;

  const routes = [
    ...(path(['settings', 'server', 'routes'], this) || []),
    ...(space.routes || []),
  ];

  const matched = matchRoute(method, reqPath, routes);

  if (!matched) {
    return;
  }

  const { route, params } = matched;
  ctx.args.params = params;

  const handlers = route.handlers || [];
  if (handlers.length === 0 && route.handler) {
    handlers.push({
      name: route.handler,
      input: route.input,
      output: route.output,
    });
  }

  let curArgs = ctx.args;
  for (const handler of handlers) {
    const input = handler.input || {};
    const output = handler.output || {};
    const nextArgs = generateObject(input, curArgs);
    const res = await (localHandlers[handler.name]
      ? localHandlers[handler.name](nextArgs)
      : this.call(handler.name, nextArgs));
    const nextRes = generateObject(output, res);

    if (makeResponse(ctx, nextRes)) {
      return;
    } else {
      curArgs = mergeDeepLeft(generateObject(output, res), curArgs);
    }
  }
};
