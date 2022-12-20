# Rugo Server

A server listener for the platform.

## Concept

Each request received, the server will follow these steps:

- Logging.
- Determine space by `headers['x-space-id']`.

## Settings

```js
const settings = {
  server: {
    port: /* port for server mount to */,
    secret: /* secret for sign cookies */,
    space: /* action to get space or default space object */,
    routes: /* global routes of application */,
  }
}
```

## Defines

### Space

```js
const space = {
  id: /* if of space, unique, read-only */,
  name: /* name to display in some condition, unique */,
  routes: /* local routes of space */,
}
```

### Route

```js
const route = {
  method: /* default is get */,
  path: /* path to match, using path-to-regexp to parse */,
  handlers: /* array of handlers */,
  handler: /* direct handle object */,
  input: /* input for direct handler */,
  output: /* output for direct handler */,
}
```

**`method`**

- `get`
- `put`
- `post`
- `patch`
- `delete`
- `all`
- `use` is a custom method, which match `all` with `/the/original/path` and `/the/original/path/(.*)`. `(.*)` will be a next `path`.

### Handler

```js
const handler = {
  name: /* name of handler, if not define, it will call an action */,
  input: { /* input for handler */
    'dst.object.path': '_.src.object.path' /* dst is to handler or action, src is from server */,
  },
  output: { /* output for handler */
    'dst.object.path': '_.src.object.path' /* dst is to server, src is from return of handler or action */, 
  },
}
```

**`src`**

```js
const src = {
  method: /* original request method */,
  path: /* original request path */,
  params: /* from path-to-regexp */,
  query: /* querystring */,
  headers: /* headers */,
  cookies: /* parsed from cookie header */,
  form: /* from koa-body */,
  space: /* optional */,
}
```

**`dst`**

```js
const dst = {
  status: /* status code */,
  headers: { /* key-value headers */
    [field]: value, // string value
  },
  cookies: { /* key-value cookies */
    [name]: value, // as string
    /* or */
    [name]: { value, ...opts }, // as object with opts
  },
  body: /* response body */,
}
```

- After exec a handler, server will check the return is response or not, if true, response.
- If not, it will merge the return with the `_` in `src`. When the return have existed keys in `src`, it will be overwrited. For example, we have `_.path` in the input, but when output, we assign `_.path` with a new value. So, in the next round of handler, the `_.path` in the input will be that new value.
- All headers, cookies should be in lowercase.

**`local handlers`**:

`alias`

- Map input to output. Using for fixed request.

`redirect`

- Input:
  + `to`
  + `code`
- Output: `[response]`

`serve`

- Input:
  + `from`
  + `path`
- Output: `[response]`

## License

MIT