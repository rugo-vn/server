import colors from 'colors';
import cookie from 'cookie';
import Mime from 'mime';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, parse, relative, resolve } from 'node:path';
import { path } from 'ramda';
import { callAction } from '@rugo-vn/service';
import { secureJoin } from './path.js';
import { STATIC_TYPE, VIEW_TYPE } from './constants.js';
import {
  deepScanDir,
  makeResponse,
  matchExt,
  matchRoute,
  readAllList,
  streamToString,
} from './methods.js';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function logging(ctx, next) {
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

  console.log(msgs.join(' '));
}

export async function exceptHandler(ctx, next) {
  try {
    await next();
  } catch (err) {
    if (!err.status) {
      makeResponse(ctx, { status: 500 });
      return console.log(err);
    }

    makeResponse(ctx, { status: err.status, body: { error: err } });
  }
}

export async function preprocessing(settings, ctx, next) {
  // space
  const { space } = settings;

  // parse cookie
  const cookies = ctx.headers.cookie;

  // form
  const form = ctx.request.body;
  for (const key in ctx.request.files) {
    form[key] = ctx.request.files[key].filepath;
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
}

export function createApiHandler(base, apis) {
  const routes = [];
  for (const api of apis) {
    const parts = api.src.split('.').map((i) => i.trim().toLowerCase());
    const asset = parts[0] || ':asset';
    const method = parts[1] || 'any';

    routes.push({
      method,
      path: join(base || '/', asset),
      params: { asset },
      addr: api.addr,
    });

    routes.push({
      method,
      path: join(base || '/', asset, ':id'),
      params: { asset },
      addr: api.addr,
    });
  }

  return async (ctx, next) => {
    const { method, path: reqPath, form, query, headers } = ctx.args;

    const matched = matchRoute(method, reqPath, routes);

    if (!matched) {
      return await next();
    }

    const body = await callAction(matched.route.addr, {
      id: matched.params.id,
      data: form,
      cond: query,
      meta: headers,
    });

    makeResponse(ctx, { body });
  };
}

export async function serveStatic(ctx, next) {
  const { path, space } = ctx.args;

  for (const asset of space.assets || []) {
    // not static and not mount
    if (asset.type !== STATIC_TYPE || !asset.mount) continue;

    // not mount path
    const relatedPath = relative(asset.mount, path);
    if (relatedPath[0] === '.' && relatedPath[1] === '.') continue;

    // check existen
    let entryPath = secureJoin(resolve(space.storage), asset.name, relatedPath);
    if (!existsSync(entryPath)) continue;

    if (statSync(entryPath).isDirectory())
      entryPath = join(entryPath, 'index.html');

    if (!existsSync(entryPath)) continue;

    // response
    ctx.set({
      'Content-Type': Mime.getType(entryPath),
    });
    ctx.body = createReadStream(entryPath);
    return;
  }

  await next();
}

export async function serveView(engine, ctx, next) {
  const { path, space, method } = ctx.args;

  for (const asset of space.assets || []) {
    // not static and not mount
    if (asset.type !== VIEW_TYPE || !asset.mount) continue;

    // not mount path
    const relatedPath = relative(asset.mount, path);
    if (relatedPath[0] === '.' && relatedPath[1] === '.') continue;

    // able paths
    const assetPath = secureJoin(resolve(space.storage), asset.name);
    if (!existsSync(assetPath)) continue;

    const ls = deepScanDir(assetPath).filter(matchExt('.ejs'));

    const routes = ls
      .filter((filePath) => {
        const pp = parse(filePath);

        // skip dot file and double underscore file
        if (pp.name[0] === '.' || (pp.name[0] === '_' && pp.name[1] === '_')) {
          return false;
        }

        return true;
      })
      .map((item) => {
        const pp = parse(item);
        const rawViewPath =
          pp.name === 'index' ? join('/', pp.dir) : join('/', pp.dir, pp.name);
        const viewPath = rawViewPath.replace(/\/\_/g, '/:');

        return {
          method: 'all',
          path: viewPath,
          view: item,
        };
      });

    const matched = matchRoute(method, join('/', relatedPath), routes);

    if (!matched) continue;

    const res = await this.call(engine, {
      entry: matched.route.view,
      files: readAllList(assetPath, ls),
      locals: {
        ...ctx.args,
        params: matched.params,
      },
    });

    return makeResponse(ctx, { body: res });
  }

  await next();
}

export async function injectReload(port, ctx, next) {
  await next();

  if (!ctx.body) return;

  if (ctx.body.constructor.name === 'ReadStream') {
    if (!matchExt('.html')(ctx.body.path)) return;

    ctx.body = await streamToString(ctx.body);
  }

  const injectContent = readFileSync(join(__dirname, 'inject.js'))
    .toString()
    .replace(`{{PORT}}`, port);

  ctx.body = ctx.body.replace(
    /(<\/body>(?![\s\S]*<\/body>[\s\S]*$))/gi,
    `<script>${injectContent}</script>$1`
  );
}
