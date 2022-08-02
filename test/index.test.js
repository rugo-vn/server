/* eslint-disable */

import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import log4js from 'log4js';
import { mergeDeepRight } from 'ramda';
import { ServiceBroker } from 'moleculer';
import * as serverService from '../src/index.js';

const logger = log4js.getLogger();
logger.level = "info";

chai.use(chaiHttp);

const demoService = {
  name: 'demo',
  actions: {
    async home() { return { status: 200, body: 'ok', headers: [['Content-Type', 'text/plain']] } },
    async notfound(){ return null; },
    async custom(){ return { status: 400, body: 'Something wrong' }; },
    async info(ctx){ return { status: 200, body: { params: ctx.params, meta: ctx.meta }}}
  }
}

describe("Server test", () => {
  let broker;

  beforeEach(async () => {
    broker = new ServiceBroker();
    broker.createService(demoService);
    broker.createService(mergeDeepRight(
      serverService, {
        settings: {
          port: 3000,
          routes: [
            { method: 'get', path: '/', address: 'demo.home' },
            { method: 'get', path: '/not-found', address: 'demo.notfound' },
            { method: 'get', path: '/custom', address: 'demo.custom'},
            { method: 'all', path: '/info/:name', address: 'demo.info'}
          ],
          schemas: [
            { name: 'bob' },
            { name: 'alice' },
          ]
        }
      })
    );

    await broker.start();
  });

  afterEach(async () => {
    await broker.stop();
  });

  it('should create server', async () => {
    // get address
    const address = await broker.call('server.address');
    expect(address).to.be.eq('http://127.0.0.1:3000');

    // simple get
    const res = await chai.request(address)
      .get('/something');

    expect(res).to.has.property('status', 404);
    expect(res.text).to.be.eq('Not Found');
  });

  it('should routing', async () => {
    const address = await broker.call('server.address');

    // 200
    const res = await chai.request(address)
      .get('/');

    expect(res).to.has.property('status', 200);
    expect(res.text).to.be.eq('ok');
    expect(res.headers).to.has.property('content-type', 'text/plain');

    // 404
    const res2 = await chai.request(address)
      .get('/not-found');

    expect(res2).to.has.property('status', 404);
    expect(res2.text).to.be.eq('Not Found');

    // custom
    const res3 = await chai.request(address)
      .get('/custom');

    expect(res3).to.has.property('status', 400);
    expect(res3.text).to.be.eq('Something wrong');
  });

  it('should pass arguments', async () => {
    const address = await broker.call('server.address');

    const res = await chai.request(address)
      .post('/info/foo?filters[name]=bar')
      .set('X-Rugo-App', 'appid')
      .send({ abc: 'def' });

    expect(res).to.has.property('status', 200);
    expect(res.body.params.params).to.has.property('name', 'foo');
    expect(res.body.params.form).to.has.property('abc', 'def');
    expect(res.body.params.headers).to.has.property('x-rugo-app', 'appid');
    expect(res.body.params.query.filters).to.has.property('name', 'bar');
    expect(res.body.meta.schemas).to.has.property('length', 2);
  });
});
