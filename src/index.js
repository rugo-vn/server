import { path } from 'ramda';
import { RugoException } from '@rugo-vn/exception';
import { nanoid } from 'nanoid';
import Koa from 'koa';
import colors from 'colors';
import koaBody from 'koa-body';
import cors from '@koa/cors';
import applyQueryString from 'koa-qs';

export const name = 'server';

export * as methods from './methods.js';

export const started = async function () {
  const port = path(['settings', 'server', 'port'], this);
  const secret = path(['settings', 'server', 'secret'], this) || nanoid();

  if (!port) { throw new RugoException('Could not find server port'); }

  const server = new Koa();

  server.keys = [secret];

  applyQueryString(server); // parse query string
  server.use(cors()); // allow cors
  server.use(koaBody({ multipart: true })); // parse body

  server.use(this.logging);
  server.use(this.spaceParser);
  server.use(this.routeHandler);

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
