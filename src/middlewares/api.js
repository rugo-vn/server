import { join } from 'node:path';
import { API_ROUTES } from '../constants.js';
import { makeResponse, matchRoute } from '../methods.js';

export async function serveApi({ base, mappings }, ctx, next) {
  // routing
  const { path, method, form, query, headers, space } = ctx.args;
  const matched = matchRoute(
    method,
    path,
    API_ROUTES.map((i) => ({ method: 'all', path: join(base || '/', i) }))
  );

  if (!matched) return await next();

  // mapping
  const { asset, id } = matched.params;

  let address;
  for (const key in mappings) {
    const parts = key.toLowerCase().split('.');
    if (parts.length !== 2) continue;

    if (parts[0] && parts[0] !== asset.toLowerCase()) continue;

    if (parts[1] && parts[1] !== method.toLowerCase()) continue;

    address = mappings[key];
    break;
  }

  if (!address) return await next();

  // compose
  let schema;
  for (const item of space.assets || []) {
    if (item.name !== asset) continue;

    schema = item;
    break;
  }

  const res = await this.call(
    address,
    {
      id,
      data: form,
      cond: query,
      meta: headers,
    },
    { schema }
  );

  return makeResponse(ctx, { body: res });
}
