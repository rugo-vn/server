/* eslint-disable */

import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import { createBroker, FileCursor } from '@rugo-vn/service';
import { RugoException } from '@rugo-vn/exception';

chai.use(chaiHttp);

const demoService = {
  name: 'demo',
  actions: {
    async home() { return { data: 'ok' }; },
    async notfound(){ return null; },
    async custom(){ throw new RugoException() },
    async info({ params, form, headers, query, schemas, hi }){ return { data: { params, form, headers, query, schemas, hi }}},
    async file(){
      return { data: FileCursor('Hello World') };
    },
  }
}

describe("Server test", () => {
  const address = 'http://127.0.0.1:8080';
  let broker;

  beforeEach(async () => {
    broker = createBroker({
      _services: [
        './src/index.js',
      ],
      server: {
        port: 8080,
        routes: [
          { path: '/', action: 'demo.home' },
          { path: '/not-found', action: 'demo.notfound' },
          { path: '/custom', action: 'demo.custom' },
          { path: '/file', action: 'demo.file' },
          { method: 'post', path: '/info/:name', action: 'demo.info' },
        ],
        args: {
          schemas: [1, 2],
        }
      }
    });

    await broker.loadServices();
    await broker.createService(demoService);
    await broker.start();
  });

  afterEach(async () => {
    await broker.close();
  });

  it('should create server', async () => {
    // simple get
    const res = await chai.request(address)
      .get('/something');

    expect(res).to.has.property('status', 404);
    expect(res.text).to.be.eq('Not Found');
  });

  it('should routing', async () => {
    // 200
    const res = await chai.request(address)
      .get('/');

    expect(res).to.has.property('status', 200);
    expect(res.text).to.be.eq('ok');
    expect(res.headers).to.has.property('content-type', 'text/plain; charset=utf-8');

    // 404
    const res2 = await chai.request(address)
      .get('/not-found');

    expect(res2).to.has.property('status', 404);
    expect(res2.text).to.be.eq('Not Found');

    // custom
    const res3 = await chai.request(address)
      .get('/custom');

    expect(res3).to.has.property('status', 400);
    expect(res3.text).to.be.eq('{"errors":[{"status":400,"title":"RugoException","detail":"Something wrong."}]}');
  });

  it('should pass arguments', async () => {
    const res = await chai.request(address)
      .post('/info/foo?filters[name]=bar')
      .set('X-Rugo-App', 'appid')
      .send({ abc: 'def' });

    expect(res).to.has.property('status', 200);
    expect(res.body.params).to.has.property('name', 'foo');
    expect(res.body.form).to.has.property('abc', 'def');
    expect(res.body.headers).to.has.property('x-rugo-app', 'appid');
    expect(res.body.query.filters).to.has.property('name', 'bar');
    expect(res.body.schemas).to.has.property('length', 2);
  });

  it('should file response', async () => {
    const res = await chai.request(address)
      .get('/file')
      .buffer();

    expect(res.body.toString()).to.be.eq('Hello World');
  });
});
