import { createHash } from 'node:crypto';

export function normalizeAccessCode(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

export function hashAccessCode(value: string) {
  return createHash('sha256').update(normalizeAccessCode(value), 'utf8').digest('hex');
}
