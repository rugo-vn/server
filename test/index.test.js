/* eslint-disable */

import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';

import createServer from "../src/index.js";

chai.use(chaiHttp);

describe("Server test", () => {
  it('should create server', async () => {
    const server = await createServer(3000);

    expect(server).to.has.property('koa');
    expect(server).to.has.property('context');
    expect(server).to.has.property('listen');
    expect(server).to.has.property('close');
    expect(server).to.has.property('address');
    expect(server).to.not.has.property('listener');

    await server.listen()

    expect(server).to.has.property('listener');
    expect(server.address()).to.be.eq('http://127.0.0.1:3000');

    server.use((ctx) => { ctx.body = 'ok'; if (ctx.query.error){ ctx.status = 404 }; });

    const res = await chai.request(server.address())
    .get('/');

    expect(res).to.has.property('status', 200);
    expect(res.text).to.be.eq('ok');

    const res2 = await chai.request(server.address()).get('/error/request?error=true');
    expect(res2).to.has.property('status', 404);
    expect(res2.text).to.be.eq('ok');

    await chai.request(server.address()).get('/this/is/a/long/request');
    await chai.request(server.address()).get('/this/is/a/long/request/2');

    await server.close();
    expect(server).to.has.property('listener', null);

    await server.close();
  });
});