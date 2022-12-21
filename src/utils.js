import { match } from 'path-to-regexp';
import { clone, mergeDeepLeft, path } from 'ramda';
import { FileCursor } from '@rugo-vn/service';
import objectPath from 'object-path';
import defaultBody from 'http-status';

export const matchRoute = (method, path, routes) => {
  const reqMethod = method.toLowerCase();
  const reqUrl = path;

  for (const route of routes) {
    const routeMethod = (route.method || 'get').toLowerCase();
    if (routeMethod !== 'all' && routeMethod !== reqMethod) { continue; }

    const fn = match(route.path, { decode: decodeURIComponent });
    const rel = fn(reqUrl);

    if (!rel) { continue; }

    return {
      route,
      params: mergeDeepLeft(rel.params, route.params || {})
    };
  }
};

export const generateObject = (cfg, src) => {
  const next = {};

  for (const key in cfg) {
    let value = cfg[key];

    if (value === '_') value = src;

    if (typeof value === 'string' && value.indexOf('_.') === 0) { value = objectPath.get({ _: src }, value); }

    objectPath.set(next, key, value);
  }

  return next;
};

const isResponse = (data = {}) => {
  if (path(['headers', 'location'], data)) { return data.status || 307; }

  if (data.body && !data.status) { return 200; }

  return data.status;
};

export const makeResponse = function (ctx, res) {
  const code = isResponse(res);

  if (!code) { return false; }

  ctx.status = code;

  if (res.body instanceof FileCursor) {
    ctx.body = res.body.toStream();
  } else {
    ctx.body = res.body || defaultBody[code] || '';
  }

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
};
