/* eslint-disable */

import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import log4js from 'log4js';
import { mergeDeepLeft, mergeDeepRight } from 'ramda';

const logger = log4js.getLogger();
logger.level = "info";

import * as originServer from '../src/index.js';

chai.use(chaiHttp);

const createServer = (config = {}) => mergeDeepRight({
  ...originServer,
  settings: { port: 3000 },
  logger: logger,
  call(name, ...params){
    switch (name) {
      case 'demo.home':
        return { status: 200, body: 'ok', headers: [['Content-Type', 'text/plain']] };

      case 'demo.notfound':
        return null;

      case 'demo.custom':
        return { status: 400, body: 'Something wrong' };

      default:
        return this.actions[name].bind(this)(...params);
    }
  }
}, config);

describe("Server test", () => {
  it('should create server', async () => {
    const server = createServer();

    await server.started();

    // get address
    expect(server.call('address')).to.be.eq('http://127.0.0.1:3000');

    // simple get
    const res = await chai.request(server.call('address'))
      .get('/');

    expect(res).to.has.property('status', 404);
    expect(res.text).to.be.eq('Not Found');

    await server.stopped();
  });

  it('should routing', async () => {
    const server = createServer({
      settings: {
        routes: [
          { method: 'get', path: '/', address: 'demo.home' },
          { method: 'get', path: '/not-found', address: 'demo.notfound' },
          { method: 'get', path: '/custom', address: 'demo.custom'}
        ]
      }
    });

    await server.started();

    // 200
    const res = await chai.request(server.call('address'))
      .get('/');

    expect(res).to.has.property('status', 200);
    expect(res.text).to.be.eq('ok');
    expect(res.headers).to.has.property('content-type', 'text/plain');

    // 404
    const res2 = await chai.request(server.call('address'))
      .get('/not-found');

    expect(res2).to.has.property('status', 404);
    expect(res2.text).to.be.eq('Not Found');

    // custom
    const res3 = await chai.request(server.call('address'))
      .get('/custom');

    expect(res3).to.has.property('status', 400);
    expect(res3.text).to.be.eq('Something wrong');

    await server.stopped();
  });
});
