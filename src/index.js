import Koa from 'koa';
import koaBody from 'koa-body';
import cors from '@koa/cors';
import applyQueryString from 'koa-qs';
import colors from 'colors';
import { FileData } from '@rugo-vn/common';

/**
 *
 * @typedef {object} Instance
 * @property {object} koa Origin koa object.
 * @property {object} context Alias context of koa.
 * @property {object} listener HTTP Listener.
 * @property {Function} close Async. Close server instance.
 * @property {Function} listen Async. Start the server.
 * @property {Function} address Get address of server.
 */

/**
 * Logging request information.
 *
 * @param {object} ctx Current context.
 * @param {Function} next next function in koa.
 */
const logMiddleware = async (ctx, next) => {
  const ltime = new Date();
  await next();
  const ctime = new Date();

  console.log(
    colors.yellow('[server] ') +
    colors.grey(ctime.toISOString()) +
    ' ' +
    colors.yellow(ctx.method) +
    ' ' +
    (Math.floor(ctx.status / 100) === 2 ? colors.green(ctx.status) : colors.red(ctx.status)) +
    ' ' +
    colors.white(ctx.url) +
    ' ' +
    colors.magenta(`${ctime - ltime}ms`)
  );
};

/**
 * Create server instance
 *
 * @param {number} port Port to mount.
 * @returns {Instance} Return instance of server.
 */
const createServer = (port) => {
  // create server
  const server = new Koa();

  // middlewares
  server.use(logMiddleware);

  applyQueryString(server);

  server.use(cors());
  server.use(koaBody({ multipart: true }));

  server.use(async (ctx, next) => {
    ctx.form = {
      ...ctx.request.body,
      ...ctx.request.files
    };

    for (let key in ctx.form){
      if (ctx.form[key] && ctx.form[key].constructor.name === 'PersistentFile'){
        ctx.form[key] = new FileData(ctx.form[key].filepath)
      }
    }

    return await next();
  });

  return {
    koa: server,
    context: server.context,

    async close () {
      if (!this.listener) { return; }

      await this.listener.close();
      this.listener = null;
    },

    use (...args) {
      server.use(...args);
    },

    async listen () {
      await new Promise(resolve => {
        this.listener = server.listen(port, () => {
          resolve(this);
        });
      });
    },

    address () {
      return `http://127.0.0.1:${port}`;
    }
  };
};
export default createServer;
