# Rugo Server

A server listener for the platform.

## Settings

```js
const settings = {
  server: {
    port: /* port for server mount to */,
    routes: [ /* routing list */
      {
        method: /* method of http, based on KoaJS */,
        path: /* path to route, based on KoaJS */,
        action: /* address to service's action */,
      }
    ],
    args: {
      /* custom args to bind to other actions */
    },
    static: /* if provided, it will service this directory */,
  }
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

## Common

### Output Args

Output using when call other actions:

- `method`
- `path`
- `params`
- `form` body of request, which include text and FileCursor.
- `query`
- `headers`
- `cookies`

Or you can bind custom args by settings above.

### Response

**`200 OK` text response**

Each service's action defined in routes should have response with below format:

```js
{
  data: /* response data */,
  meta: {
    headers: {
      [field]: value, // string value
    },
    cookies: {
      [name]: value, // as string
      /* or */
      [name]: { value, ...opts }, // as object with opts
    }
  }
}
```

**Binary response**

```js
{
  data: /* File Cursor */,
}
```

## License

MIT