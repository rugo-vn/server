import { join } from 'node:path';

export function secureJoin(...parts) {
  return join(...parts.map((part) => join('/', part)));
}
