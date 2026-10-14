import { describe, it, expect } from 'vitest';
import { patternToRegex } from './pattern';

const cases: [pattern: string, matches: string[], misses: string[]][] = [
  // Examples from the doc comment
  [
    'example.com',
    ['https://example.com/', 'http://example.com/a?b=c', 'https://EXAMPLE.com', 'wss://example.com:8443/'],
    [
      'https://example.com.evil.com/',
      'https://evil.com/?u=example.com',
      'https://example.com@evil.com/',
      'https://example.com:8080@evil.com/',
      'https://example.com:pw@evil.com/',
      'https://notexample.com/',
      'https://www.example.com/',
      'ftp://example.com/',
    ],
  ],
  [
    '*.example.com/api/*',
    ['https://example.com/api/x', 'https://a.b.example.com/api/v1?id=1', 'http://a.example.com:8080/api/'],
    [
      'https://evilexample.com/api/x',
      'https://example.com/api',
      'https://example.com/v1/api/x',
      'https://a.example.com.evil.com/api/x',
      'https://evil.com/.example.com/api/x',
      'https://evil.com?.example.com/api/x',
      'https://evil.com#.example.com/api/x',
      'https://a.example.com@evil.com/api/x',
    ],
  ],
  [
    'localhost:3000',
    ['http://localhost:3000/', 'ws://localhost:3000/socket', 'http://localhost:3000'],
    ['http://localhost/', 'http://localhost:3001/', 'http://localhost:30001/', 'http://localhost:3000@evil.com/'],
  ],
  [
    'https://api.example.com/v1/*',
    ['https://api.example.com/v1/users'],
    ['http://api.example.com/v1/users', 'wss://api.example.com/v1/x', 'https://api.example.com/v2/users'],
  ],
  [
    '/graphql',
    ['https://any.host/graphql', 'http://localhost:4000/graphql?op=x', 'https://a.com/graphql#f'],
    ['https://a.com/api/graphql', 'https://a.com/graphql2', 'https://a.com/x?next=/graphql'],
  ],
  // Host wildcards
  [
    '*.example.com',
    ['https://example.com/', 'https://a.example.com/', 'https://a.b.example.com:8080/x'],
    ['https://evilexample.com/', 'https://a.example.com.evil.com/', 'https://evil.com/a.example.com'],
  ],
  [
    'api.*.example.com',
    ['https://api.eu.example.com/'],
    ['https://api.example.com/', 'https://api.x/.example.com/', 'https://api.x@a.example.com/'],
  ],
  // Ports
  ['example.com:*', ['https://example.com/', 'https://example.com:8443/'], ['https://example.com.evil.com:8443/']],
  ['*:8080', ['http://anything.test:8080/'], ['http://anything.test/', 'http://anything.test:18080/']],
  // Schemes
  [
    '*://example.com',
    ['http://example.com/', 'https://example.com/', 'ws://example.com/', 'wss://example.com/'],
    ['ftp://example.com/'],
  ],
  ['ws://example.com', ['ws://example.com/'], ['wss://example.com/', 'http://example.com/']],
  // Paths and queries
  [
    'example.com/search',
    ['https://example.com/search', 'https://example.com/search?q=1', 'https://example.com/search#top'],
    ['https://example.com/search/x', 'https://example.com/searching', 'https://example.com/'],
  ],
  [
    'example.com/search?q=*',
    ['https://example.com/search?q=1', 'https://example.com/search?q='],
    ['https://example.com/search', 'https://example.com/search?x=1'],
  ],
  [
    'example.com/search?q=1',
    ['https://example.com/search?q=1', 'https://example.com/search?q=1#top'],
    ['https://example.com/search?q=12', 'https://example.com/search?q=1&x=2'],
  ],
  ['/api/*', ['https://a.com/api/x', 'http://localhost:3000/api/'], ['https://a.com/v1/api/x', 'https://a.com/api']],
  // Metacharacters are literal
  [
    'example.com/v1.0/a+b(c)',
    ['https://example.com/v1.0/a+b(c)'],
    ['https://example.com/v1x0/a+b(c)', 'https://example.com/v1.0/aab(c)', 'https://example.com/v1.0/a+bc'],
  ],
  ['/q?x=$^{1}[a]|\\d', ['https://a.com/q?x=$^{1}[a]|\\d'], ['https://evil.com/?\\d', 'https://a.com/q?x=$^{1}[a]|1']],
  // Pasted surrounding whitespace is ignored
  ['\texample.com/a ', ['https://example.com/a'], ['https://example.com/b']],
];

const invalid = [
  '',
  '   ',
  'example.com /api',
  'ftp://example.com',
  'example.com:abc',
  'https://',
  ':3000',
  'example.com@evil.com',
  'bücher.de',
];

describe('patternToRegex', () => {
  it.each(cases)('%s', (pattern, matches, misses) => {
    const source = patternToRegex(pattern);
    expect(source).toMatch(/^\^/);
    const regex = new RegExp(source!, 'i');
    for (const url of matches) expect(regex.test(url), url).toBe(true);
    for (const url of misses) expect(regex.test(url), url).toBe(false);
  });

  it.each(invalid)('rejects %j', (pattern) => {
    expect(patternToRegex(pattern)).toBeNull();
  });
});
