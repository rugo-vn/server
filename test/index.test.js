/* eslint-disable */

import { mkdirSync, writeFileSync } from 'fs';
import chai, { assert, expect } from 'chai';
import chaiHttp from 'chai-http';
import { createBroker } from '@rugo-vn/service';
import rimraf from 'rimraf';
import { join, resolve } from 'path';

const TMP_DIR = resolve('test/.tmp');

chai.use(chaiHttp);

describe("Server test", () => {
  const address = 'http://127.0.0.1:8080';
  let broker;

  beforeEach(async () => {
    rimraf.sync(TMP_DIR);

    mkdirSync(TMP_DIR);
    writeFileSync(join(TMP_DIR, 'index.html'), 'Hello HTML!');
    writeFileSync(join(TMP_DIR, 'sample.txt'), 'Hello Sample!');

    broker = createBroker({
      _services: [
        './src/index.js',
        './test/sample.service.js',
      ],
      server: {
        port: 8080,
        space: {
          id: 'test',
          name: 'test',
          routes: [
            { method: 'post', path: '/upload', handler: 'alias', input: { from: '_.form.file' }, output: { body: '_.from' }, },
            { path: '/public/(.*)?', handler: 'serve', input: { from: TMP_DIR, path: '_.params.0' }},
          ],
        },
        routes: [
          { path: '/redirect', handler: 'redirect', input: { to: address }},
          { path: '/api/:table', handlers: [
            { name: 'sample.gate', input: { 'auth.table': '_.params.table', 'auth.space': '_.space.id' }, output: { auth: '_' } },
            {
              name: 'sample.find',
              input: { auth: '_.auth', 'auth.action': 'find', table: '_.params.table', query: '_.query', bar: '_.cookies.bar' },
              output: {
                status: 200,
                body: '_',
                'cookies.table': '_.table',
                'cookies.space': { signed: true },
                'cookies.space.value': '_.auth.space'
              },
            },
          ]},
        ],
      },
    });

    await broker.loadServices();
    await broker.start();
  });

  afterEach(async () => {
    rimraf.sync(TMP_DIR);
    await broker.close();
  });

  it('should create server', async () => {
    // simple get
    const res = await chai.request(address)
      .get('/something');

    expect(res).to.has.property('status', 404);
    expect(res.text).to.be.eq('Not Found');
  });

  it('should not create server', async () => {
    const tmp = createBroker({
      _services: [
        './src/index.js',
      ],
    });

    await tmp.loadServices();

    try {
      await tmp.start();
      assert.fail('should error');
    } catch(err) {
      expect(err).to.has.property('message', 'Could not find server port');
    }
  });

  it('should not get space', async () => {
    const tmp = createBroker({
      _services: [
        './src/index.js',
      ],
      server: {
        port: 8081,
        space: 'no.space',
      }
    });

    await tmp.loadServices();
    await tmp.start();

    const res = await chai.request(`http://127.0.0.1:8081`)
      .get('/something');

    expect(res).to.has.property('status', 500);
    expect(res.text).to.be.eq('Internal Server Error');

    await tmp.close();
  });

  it('should redirect', async () => {
    const res = await chai.request(address)
      .get('/redirect');

    expect(res).to.redirectTo(address + '/');
  });

  it('should send file to server', async () => {
    const res = await chai.request(address)
      .post('/upload')
      .attach('file', './package.json')
      .buffer();

    expect(res).to.has.property('status', 200);
    expect(res.body instanceof Buffer).to.be.eq(true);
  });

  it('should nested api', async () => {
    const res = await chai.request(address)
      .get('/api/demo?name=foo')
      .set('Cookie', 'bar=something');

    expect(res).to.has.property('status', 200);

    expect(res.body).to.has.property('table', 'demo');
    expect(res.body).to.has.property('bar', 'something');
    expect(res.body.query).to.has.property('name', 'foo');
    expect(res.body.auth).to.has.property('table', 'demo');
    expect(res.body.auth).to.has.property('space', 'test');
    expect(res.body.auth).to.has.property('action', 'find');

    expect(res).to.have.cookie('table', 'demo');
    expect(res).to.have.cookie('space', 'test');
  });

  it('should serve folder', async () => {
    const res = await chai.request(address)
      .get('/public')
      .buffer();

    expect(res).to.has.property('status', 200);
    expect(res.body.toString()).to.be.eq('Hello HTML!');

    const res2 = await chai.request(address)
      .get('/public/sample.txt')
      .buffer();

    expect(res2).to.has.property('status', 200);
    expect(res2.body.toString()).to.be.eq('Hello Sample!');
  });
});
