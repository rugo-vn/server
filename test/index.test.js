import { spawnService } from '@rugo-vn/service';
import { pack } from '@rugo-vn/service/src/wrap.js';
import chai, { assert, expect } from 'chai';
import chaiHttp from 'chai-http';

const PORT = 3000;
const API_PREFIX = '/api/v1';

chai.use(chaiHttp);

describe('Server test', function () {
  const address = `http://127.0.0.1:${PORT}`;
  let service;

  it('should not create server', async () => {
    try {
      service = await spawnService({
        name: 'server',
        exec: ['node', 'src/index.js'],
        cwd: './',
      });
      await service.start();
      assert.fail('should error');
    } catch (err) {
      expect(err).to.has.property('message', 'Could not find server port');
    }

    await service.stop();
  });

  it('should run server', async () => {
    service = await spawnService({
      name: 'server',
      exec: ['node', 'src/index.js'],
      cwd: './',
      settings: {
        port: PORT,
        engine: 'fx.run', // view engine
        inject: 8001, // inject reload code with port server, default: false
        space: {
          /* official props */
          id: 'spaceId',
          assets: [
            { name: 'statics', type: 'static', mount: '/stuffs' },
            { name: 'uploads', type: 'static', mount: '/' },
            { name: 'views', type: 'view', mount: '/' },
            {
              name: 'posts',
              type: 'db',
              properties: {
                name: { type: 'String' },
              },
            },
          ],
          /* additions props */
          storage: './test/fixtures/',
        },
        api: {
          base: API_PREFIX,
          mappings: {
            'posts.get': 'sayHello',
            '.post': 'db.update',
            '.': 'sayHello',
          },
          opts: {},
        },
      },
      async hook(addr, args, opts) {
        let res;

        switch (addr) {
          case 'sayHello':
            res = 'Hello, World!';
            break;

          case 'login':
          case 'db.update':
            res = {
              args,
              opts,
            };
            break;

          case 'fx.run':
            res = args.files[args.entry] + JSON.stringify(args.locals.params);
            break;
        }

        return await pack(() => res);
      },
    });

    await service.start();
  });

  it('should test server online', async () => {
    // simple get
    const res = await chai.request(address).get('/something');

    expect(res).to.has.property('status', 404);
    expect(res.text).to.be.eq('Not Found');
  });

  it('should say hello', async () => {
    const res = await chai.request(address).get(`${API_PREFIX}/greets`);

    expect(res.text).to.be.eq('Hello, World!');
    expect(res).to.has.property('status', 200);
  });

  // it('should call login api', async () => {
  //   const res = await chai
  //     .request(address)
  //     .post(`${API_PREFIX}/tokens`)
  //     .send({ email: 'sample@rugo.vn', password: 'password' });

  //   const { args, opts } = res.body;

  //   expect(args).to.has.property('data');
  //   expect(args.data).to.has.property('email');
  //   expect(args.data).to.has.property('password');

  //   expect(opts).to.has.property('userSchema');
  //   expect(opts).to.has.property('roleSchema');
  // });

  it('should call default api', async () => {
    const res = await chai
      .request(address)
      .post(`${API_PREFIX}/posts/12`)
      .send({});

    expect(res.body).to.has.property('args');
    expect(res.body.args).to.has.property('id');
    expect(res.body.args).to.has.property('meta');

    expect(res.body).to.has.property('opts');
    expect(res.body.opts).to.has.property('schema');
  });

  it('should serve directory', async () => {
    const res = await chai.request(address).get(`/stuffs/text.txt`).buffer();
    expect(res.text).to.be.eq('Hello, World!');

    const res2 = await chai.request(address).get(`/stuffs/img.png`).buffer();
    expect(res2.body instanceof Buffer).to.be.eq(true);

    const res3 = await chai.request(address).get(`/`).buffer();
    expect(res3.text).to.be.eq('Upload content!\n');
  });

  it('should serve view', async () => {
    const res = await chai.request(address).get(`/blog`);
    expect(res.text.indexOf(`ws://localhost:8001`)).to.be.not.eq(-1);

    const res2 = await chai.request(address).get(`/posts/hello`);
    expect(res2.text).to.be.eq('<%= name %>\n{"name":"hello"}');
  });

  it('should stop service', async () => {
    await service.stop();
  });
});
