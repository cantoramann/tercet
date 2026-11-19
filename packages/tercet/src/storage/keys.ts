import { InvalidKeyError } from "./types.js";

/**
 * Keys are single path segments: letters (any script), digits, `_`, `-`, and
 * dots that are not leading. No separators, no `..`, no control characters.
 * Every driver validates through this one function, so path traversal and
 * key injection are ruled out in one place rather than per backend.
 */
const KEY = /^[\p{L}\p{N}_-][\p{L}\p{N}_.-]{0,159}$/u;

export function isValidKey(key: string): boolean {
  return KEY.test(key) && !key.includes("..");
}

export function assertValidKey(key: string): string {
  if (!isValidKey(key)) throw new InvalidKeyError(key);
  return key;
}
