import type { HeaderEntry } from './types';

// Chrome rejects the whole rule update if one header name isn't an RFC 9110 token or a value holds NUL/CR/LF.
const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

// The only request headers Chrome lets a rule append to. Its docs call the list case-sensitive, so rules send these
// names lowercased.
const APPENDABLE = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'access-control-request-headers',
  'cache-control',
  'connection',
  'content-language',
  'cookie',
  'forwarded',
  'if-match',
  'if-none-match',
  'keep-alive',
  'range',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'user-agent',
  'via',
  'want-digest',
  'x-forwarded-for',
]);

/** Expects an already-trimmed name. */
export const isValidHeaderName = (name: string): boolean => TOKEN.test(name);

export const isValidHeaderValue = (value: string): boolean => !/[\0\r\n]/.test(value);

/** Expects an already-trimmed name, in any case. */
export const canAppendRequestHeader = (name: string): boolean => APPENDABLE.has(name.toLowerCase());

/** Whether Chrome accepts the header in a rule. Remove sends no value, so it never needs a valid one. */
export function isValidRequestHeader({ name, value, operation = 'set' }: HeaderEntry): boolean {
  const header = name.trim();
  if (!isValidHeaderName(header)) return false;
  switch (operation) {
    case 'set':
      return isValidHeaderValue(value);
    case 'append':
      return isValidHeaderValue(value) && canAppendRequestHeader(header);
    case 'remove':
      return true;
  }
}
