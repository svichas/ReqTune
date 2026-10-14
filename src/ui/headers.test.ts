import { describe, expect, it } from 'vitest';
import { isSecretHeader } from './headers';

describe('isSecretHeader', () => {
  it.each([
    'Authorization',
    'proxy-authorization',
    'Cookie',
    'X-Api-Key',
    'apikey',
    'X_API_KEY',
    'X-Auth-Token',
    'X-CSRF-Token',
    'X-Session-Id',
    'Sec-WebSocket-Key',
    'X-Client-Secret',
    'X-Hub-Signature',
  ])('hides %s', (name) => expect(isSecretHeader(name)).toBe(true));

  it.each(['User-Agent', 'Accept-Language', 'X-Request-ID', 'X-Forwarded-For', 'Keep-Alive', 'X-Monkey', 'Content-Type', ''])(
    'shows %j',
    (name) => expect(isSecretHeader(name)).toBe(false),
  );
});
