import { describe, expect, it } from 'vitest';
import type { HeaderEntry } from './types';
import { canAppendRequestHeader, isValidRequestHeader } from './validation';

describe('canAppendRequestHeader', () => {
  it.each(['accept-language', 'Cookie', 'USER-AGENT', 'X-Forwarded-For'])('allows %s', (name) =>
    expect(canAppendRequestHeader(name)).toBe(true),
  );

  it.each(['Authorization', 'X-Custom', 'Referer', 'cookie2', ''])('refuses %j', (name) =>
    expect(canAppendRequestHeader(name)).toBe(false),
  );
});

describe('isValidRequestHeader', () => {
  it.each<[string, HeaderEntry]>([
    ['a set, the default', { name: ' X-Token ', value: 'a' }],
    ['a set with an empty value', { name: 'X-Token', value: '', operation: 'set' }],
    ['an append Chrome allows', { name: 'Accept-Language', value: 'fr', operation: 'append' }],
    ['a remove with an empty value', { name: 'Cookie', value: '', operation: 'remove' }],
    ['a remove whose unsent value has a line break', { name: 'Cookie', value: 'a\nb', operation: 'remove' }],
  ])('accepts %s', (_, header) => expect(isValidRequestHeader(header)).toBe(true));

  it.each<[string, HeaderEntry]>([
    ['an invalid name', { name: 'Bad Name', value: 'a' }],
    ['an empty name, even on a remove', { name: ' ', value: '', operation: 'remove' }],
    ['a value with a line break', { name: 'X-Token', value: 'a\r\nb' }],
    ['an append Chrome refuses', { name: 'Authorization', value: 'a', operation: 'append' }],
    ['an append with a line break', { name: 'Cookie', value: 'a\nb', operation: 'append' }],
  ])('rejects %s', (_, header) => expect(isValidRequestHeader(header)).toBe(false));
});
