import { describe, it, expect } from 'vitest';
import { matchGroups } from './match';
import type { Group } from './types';

const group = (id: string, patterns: string[], headers: [string, string][], extra: Partial<Group> = {}): Group => ({
  id,
  name: id,
  enabled: true,
  patterns,
  headers: headers.map(([name, value]) => ({ name, value })),
  ...extra,
});

describe('matchGroups', () => {
  it.each(['', 'example.com/api', 'localhost:3000', 'ftp://example.com/', 'chrome://extensions', 'https://'])(
    'rejects %j',
    (url) => expect(matchGroups([group('a', ['/*'], [['X-A', '1']])], url)).toBeNull(),
  );

  it('lists the enabled groups whose patterns match, with the first pattern that matches and the headers they send', () => {
    const groups = [
      group('a', ['not valid', 'other.com', '*.example.com', 'api.example.com/*'], [
        [' X-Env ', 'staging'],
        ['Bad Name', 'x'],
        ['X-Bad-Value', 'line\nbreak'],
      ]),
      group('off', ['example.com'], [['X-Off', '1']], { enabled: false }),
      group('no-headers', ['api.example.com'], [[' ', 'x']]),
      group('miss', ['example.org', 'api.example.com:443'], [['X-Miss', '1']]),
      group('b', ['/V1/*'], [['X-Debug', '1']]),
    ];
    // Matched like Chrome: on the canonical URL, without its default port, and case-insensitively.
    expect(matchGroups(groups, ' HTTPS://API.Example.com:443/v1/users?id=1 ')).toEqual({
      byPattern: [
        { group: groups[0], pattern: '*.example.com', headers: [{ name: 'X-Env', value: 'staging' }] },
        { group: groups[4], pattern: '/V1/*', headers: [{ name: 'X-Debug', value: '1' }] },
      ],
      byTabs: [],
    });
  });

  it('marks the header that wins when several set it: the first in list order, names compared case-insensitively', () => {
    const groups = [
      group('a', ['example.com'], [['X-Token', 'a'], ['X-A', '1']]),
      group('b', ['/api/*'], [['x-token', 'b'], ['X-B', '2'], ['X-B', '3']]),
    ];
    expect(matchGroups(groups, 'https://example.com/api/x')?.byPattern.map((match) => match.headers)).toEqual([
      [{ name: 'X-Token', value: 'a', wins: true }, { name: 'X-A', value: '1' }],
      [
        { name: 'x-token', value: 'b', wins: false },
        { name: 'X-B', value: '2', wins: true },
        { name: 'X-B', value: '3', wins: false },
      ],
    ]);
  });

  it('lets a tabs group above a URL group win in its picked tabs, and the URL group everywhere else', () => {
    const groups = [
      group('tabs', [], [['X-Env', 'tab']], { target: 'tabs' }),
      group('a', ['example.com'], [['X-Env', 'a']]),
      group('b', ['/api/*'], [['x-env', 'b']]),
    ];
    expect(matchGroups(groups, 'https://example.com/api/x')).toEqual({
      byPattern: [
        { group: groups[1], pattern: 'example.com', headers: [{ name: 'X-Env', value: 'a', overriddenInTabs: true }] },
        { group: groups[2], pattern: '/api/*', headers: [{ name: 'x-env', value: 'b', wins: false }] },
      ],
      byTabs: [{ group: groups[0], headers: [{ name: 'X-Env', value: 'tab', wins: true }] }],
    });
  });

  it('lets a URL group above a tabs group win in its picked tabs too', () => {
    const groups = [
      group('a', ['example.com'], [['X-Env', 'a']]),
      group('tabs', [], [['x-env', 'tab'], ['X-Tab', '1']], { target: 'tabs' }),
      // Tabs groups only meet in tabs both picked, so neither X-Tab gets a mark.
      group('more-tabs', [], [['X-Tab', '2']], { target: 'tabs' }),
    ];
    expect(matchGroups(groups, 'https://example.com/')).toEqual({
      byPattern: [{ group: groups[0], pattern: 'example.com', headers: [{ name: 'X-Env', value: 'a', wins: true }] }],
      byTabs: [
        { group: groups[1], headers: [{ name: 'x-env', value: 'tab', wins: false }, { name: 'X-Tab', value: '1' }] },
        { group: groups[2], headers: [{ name: 'X-Tab', value: '2' }] },
      ],
    });
  });

  it('lists groups that target tabs apart, whatever the URL and their patterns', () => {
    const groups = [
      group('tabs', ['elsewhere.com'], [['X-Tab', '1']], { target: 'tabs' }),
      group('tabs-off', [], [['X-Tab', '2']], { target: 'tabs', enabled: false }),
      group('tabs-no-headers', [], [['', '']], { target: 'tabs' }),
      group('patterns', ['example.com'], [['X-Token', 't']], { target: 'patterns' }),
    ];
    expect(matchGroups(groups, 'wss://example.com/socket')).toEqual({
      byPattern: [{ group: groups[3], pattern: 'example.com', headers: [{ name: 'X-Token', value: 't' }] }],
      byTabs: [{ group: groups[0], headers: [{ name: 'X-Tab', value: '1' }] }],
    });
  });
});
