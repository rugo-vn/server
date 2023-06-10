import { join } from 'node:path';
import { clone } from 'ramda';
import { API_ROUTES } from '../constants.js';
import { makeResponse, matchRoute } from '../methods.js';

export async function serveApi({ base, mappings, opts = {}, auth }, ctx, next) {
  // routing
  const { path, method, form, query, headers, space } = ctx.args;
  const matched = matchRoute(
    method,
    path,
    API_ROUTES.map((i) => ({ method: 'all', path: join(base || '/', i) }))
  );

  if (!matched) return await next();

  // mapping
  const { asset: assetName, id } = matched.params;

  let address;
  for (const key in mappings) {
    const parts = key.toLowerCase().split('.');
    if (parts.length !== 2) continue;

    if (parts[0] && parts[0] !== assetName.toLowerCase()) continue;

    if (parts[1] && parts[1] !== method.toLowerCase()) continue;

    address = mappings[key];
    break;
  }

  if (!address) return await next();

  // compose
  const args = {
    id,
    data: form,
    cond: query,
    meta: headers,
  };
  let asset, schema;
  for (const item of space.assets || []) {
    if (item.name !== assetName) continue;

    asset = item;
    schema = clone(item);
    delete schema.type;
    delete schema.mount;
    delete schema.perms;
    break;
  }

  if (!asset || !auth) {
    return makeResponse(ctx, {
      body: await this.call(address, args, {
        ...opts,
        schema,
      }),
    });
  }

  const agent = {
    space: space.id,
    asset: asset.name,
    id: id,
    action: method.toLowerCase(),
  };

  await this.call(
    `${auth}.gate`,
    { ...args, agent, perms: asset.perms || [] },
    opts
  );

  return makeResponse(ctx, {
    body: await this.call(address, args, {
      ...opts,
      schema,
    }),
  });
}
