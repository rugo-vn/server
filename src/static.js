import { resolve } from 'path';
import { curryN } from 'ramda';
import send from 'koa-send';

const createStatic = async ({ root }, ctx, next) => {
  const opts = {
    root: resolve(root),
    index: 'index.html'
  };

  let done = false

  if (ctx.method === 'HEAD' || ctx.method === 'GET') {
    try {
      done = await send(ctx, ctx.path, opts)
    } catch (err) {
      if (err.status !== 404) {
        throw err
      }
    }
  }

  if (!done) {
    await next()
  }
}

export default curryN(2, createStatic);