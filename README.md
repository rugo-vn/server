# Rugo Server

A server listener for the platform.

## Usage

```js
const server = await createServer(port);
await server.listen();

server.use(async (ctx, next) => { });

console.log(`Server is running at: ${server.address()}`);

await server.close();
```

## API

[Visit API documentation.](./docs/API.md)

## License

MIT