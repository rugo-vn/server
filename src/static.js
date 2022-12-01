import { join, resolve } from 'path';
import { curryN } from 'ramda';
import send from 'koa-send';

const createStatic = async ({ statics }, ctx, next) => {
  let nextPath, nextRoot;

  for (const s of statics) {
    if (ctx.path.indexOf(s.use) !== 0) { continue; }

    nextPath = join('/', ctx.path.substring(s.use.length));
    nextRoot = s.root;
    break;
  }

  if (!nextPath) {
    return await next();
  }

  const opts = {
    root: resolve(nextRoot),
    index: 'index.html'
  };

  let done = false;

  if (ctx.method === 'HEAD' || ctx.method === 'GET') {
    try {
      done = await send(ctx, nextPath, opts);
    } catch (err) {
      if (err.status !== 404) {
        throw err;
      }
    }
  }

  if (!done) {
    await next();
  }
};

export default curryN(2, createStatic);
