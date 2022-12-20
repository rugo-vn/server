import { FileCursor } from '@rugo-vn/service';
import { existsSync, statSync } from 'fs';
import { join, resolve } from 'path';

export const alias = (args) => args;

export const redirect = async ({ code, to }) => {
  return {
    status: code || 307,
    headers: {
      location: to
    }
  };
};

export const serve = async ({ from, path: filePath = '' }) => {
  let location = resolve(from);
  location = join(location, filePath);

  if (!existsSync(location)) { return; }

  if (statSync(location).isDirectory()) {
    location = join(location, 'index.html');
  }

  if (!existsSync(location)) { return; }

  return {
    body: FileCursor(location)
  };
};
