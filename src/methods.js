import defaultBody from 'http-status';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { flatten, mergeDeepLeft, path } from 'ramda';
import { match } from 'path-to-regexp';
import { secureJoin } from './path.js';

export function matchRoute(method, path, routes) {
  const reqMethod = method.toLowerCase();
  const reqUrl = path;

  for (const route of routes) {
    const routeMethod = (route.method || 'get').toLowerCase();
    if (routeMethod !== 'all' && routeMethod !== reqMethod) {
      continue;
    }

    const fn = match(route.path, { decode: decodeURIComponent });
    const rel = fn(reqUrl);

    if (!rel) {
      continue;
    }

    return {
      route,
      params: mergeDeepLeft(rel.params, route.params || {}),
    };
  }
}

export function matchExt(e) {
  e = e.replace(/\./g, '\\.');
  return (p) => new RegExp(`${e}$`, 'gi').test(p);
}

export function isResponse(data = {}) {
  if (path(['headers', 'location'], data)) {
    return data.status || 307;
  }

  if (data.body && !data.status) {
    return 200;
  }

  return data.status;
}

export function makeResponse(ctx, res) {
  const code = isResponse(res);

  if (!code) {
    return false;
  }

  ctx.status = code;
  ctx.body = res.body || defaultBody[code] || '';
  ctx.set(res.headers || {});

  for (const key in res.cookies) {
    const value = res.cookies[key];

    if (typeof value === 'string') {
      ctx.cookies.set(key, value);
      continue;
    }

    if (typeof value === 'object' && value.value !== undefined) {
      const opts = clone(value);
      delete opts.value;
      ctx.cookies.set(key, value.value, opts);
    }
  }

  return true;
}

export function deepScanDir(dir) {
  const ls = readdirSync(dir);
  return flatten(
    ls.map((name) => {
      const entry = join(dir, name);

      if (statSync(entry).isDirectory())
        return deepScanDir(entry).map((childName) => join(name, childName));

      return name;
    })
  );
}

export function readAllList(root, ls) {
  const map = {};
  for (const filePath of ls)
    map[filePath] = readFileSync(secureJoin(root, filePath)).toString();

  return map;
}

export function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}
