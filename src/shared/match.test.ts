import { describe, it, expect } from 'vitest';
import { type HeaderMatch, matchGroups } from './match';
import type { Group, HeaderEntry } from './types';

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
        { group: groups[0], pattern: '*.example.com', headers: [{ name: 'X-Env', value: 'staging' }], responseHeaders: [] },
        { group: groups[4], pattern: '/V1/*', headers: [{ name: 'X-Debug', value: '1' }], responseHeaders: [] },
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
        { group: groups[1], pattern: 'example.com', headers: [{ name: 'X-Env', value: 'a', overriddenInTabs: true }], responseHeaders: [] },
        { group: groups[2], pattern: '/api/*', headers: [{ name: 'x-env', value: 'b', wins: false }], responseHeaders: [] },
      ],
      byTabs: [{ group: groups[0], headers: [{ name: 'X-Env', value: 'tab', wins: true }], responseHeaders: [] }],
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
      byPattern: [{ group: groups[0], pattern: 'example.com', headers: [{ name: 'X-Env', value: 'a', wins: true }], responseHeaders: [] }],
      byTabs: [
        { group: groups[1], headers: [{ name: 'x-env', value: 'tab', wins: false }, { name: 'X-Tab', value: '1' }], responseHeaders: [] },
        { group: groups[2], headers: [{ name: 'X-Tab', value: '2' }], responseHeaders: [] },
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
      byPattern: [{ group: groups[3], pattern: 'example.com', headers: [{ name: 'X-Token', value: 't' }], responseHeaders: [] }],
      byTabs: [{ group: groups[0], headers: [{ name: 'X-Tab', value: '1' }], responseHeaders: [] }],
    });
  });

  it('follows Chrome on operations: below a set or an append only appends still apply, and below a remove nothing', () => {
    const header = (name: string, value: string, operation: HeaderEntry['operation']) => ({ name, value, operation });
    const groups: Group[] = [
      { ...group('a', ['example.com'], []), headers: [header('Cookie', 'a=1', 'set'), header('Accept-Language', '', 'remove')] },
      {
        ...group('b', ['example.com'], []),
        headers: [header('cookie', 'b=2', 'append'), header('Cookie', 'c=3', 'set'), header('accept-language', 'el', 'append')],
      },
      { ...group('c', ['example.com'], []), headers: [header('Accept', 'x', 'append'), header('accept', 'y', 'remove')] },
    ];
    expect(matchGroups(groups, 'https://example.com/')?.byPattern.map((match) => match.headers)).toEqual([
      [
        { name: 'Cookie', value: 'a=1', operation: 'set', wins: true },
        { name: 'Accept-Language', value: '', operation: 'remove', wins: true },
      ],
      [
        { name: 'cookie', value: 'b=2', operation: 'append' },
        { name: 'Cookie', value: 'c=3', operation: 'set', wins: false },
        { name: 'accept-language', value: 'el', operation: 'append', wins: false },
      ],
      [
        { name: 'Accept', value: 'x', operation: 'append', wins: true },
        { name: 'accept', value: 'y', operation: 'remove', wins: false },
      ],
    ]);
  });

  it('leaves out switched-off headers and appends Chrome refuses, and weighs response headers apart', () => {
    const groups: Group[] = [
      {
        ...group('a', ['example.com'], []),
        headers: [
          { name: 'X-Off', value: '1', enabled: false },
          { name: 'X-Custom', value: '1', operation: 'append' },
          { name: 'X-Env', value: 'a' },
        ],
        responseHeaders: [{ name: 'X-Custom', value: '2', operation: 'append' }],
      },
      { ...group('b', ['example.com'], []), responseHeaders: [{ name: 'X-Env', value: 'b' }] },
    ];
    expect(matchGroups(groups, 'https://example.com/')?.byPattern).toEqual([
      {
        group: groups[0],
        pattern: 'example.com',
        headers: [{ name: 'X-Env', value: 'a' }],
        responseHeaders: [{ name: 'X-Custom', value: '2', operation: 'append' }],
      },
      { group: groups[1], pattern: 'example.com', headers: [], responseHeaders: [{ name: 'X-Env', value: 'b' }] },
    ]);
  });

  it('lists a blocking group without its headers, which neither win nor lose against others', () => {
    const groups = [
      group('block', ['example.com'], [['X-Env', 'blocked']], { action: 'block' }),
      group('block-empty', ['example.com'], [], { action: 'block' }),
      group('a', ['example.com'], [['X-Env', 'a']]),
    ];
    expect(matchGroups(groups, 'https://example.com/')?.byPattern).toEqual([
      { group: groups[0], pattern: 'example.com', headers: [], responseHeaders: [] },
      { group: groups[1], pattern: 'example.com', headers: [], responseHeaders: [] },
      { group: groups[2], pattern: 'example.com', headers: [{ name: 'X-Env', value: 'a' }], responseHeaders: [] },
    ]);
  });

  it("doesn't mark a URL group's append overridden in the tabs of a tabs group above that sets the header", () => {
    const groups: Group[] = [
      group('tabs', [], [['Cookie', 'tab=1']], { target: 'tabs' }),
      { ...group('a', ['example.com'], []), headers: [{ name: 'Cookie', value: 'a=1', operation: 'append' }] },
    ];
    expect(matchGroups(groups, 'https://example.com/')).toEqual({
      byPattern: [
        {
          group: groups[1],
          pattern: 'example.com',
          headers: [{ name: 'Cookie', value: 'a=1', operation: 'append' }],
          responseHeaders: [],
        },
      ],
      byTabs: [{ group: groups[0], headers: [{ name: 'Cookie', value: 'tab=1' }], responseHeaders: [] }],
    });
  });

  it("agrees with Chrome's rule for every mix of operations across up to three URL and tabs groups", () => {
    // In one place the first change to a name decides: after a set or an append only appends follow, after a remove
    // nothing. Outside picked tabs only URL groups apply; in a tabs group's picked tabs, it does too.
    const chrome = (changes: HeaderEntry[]) =>
      new Set(changes.filter((c, i) => i === 0 || (c.operation === 'append' && changes[0].operation !== 'remove')));
    const shown = (h: HeaderMatch) =>
      h.onlyInTabs ? 'only in tabs' : h.wins === false ? 'overridden' : h.overriddenInTabs ? 'overridden in tabs' : 'made';
    const ops = ['set', 'append', 'remove'] as const;
    const rows = [...ops.map((a) => [a]), ...ops.flatMap((a) => ops.map((b) => [a, b]))];
    const mismatches: string[] = [];
    let setups = 0;
    for (const n of [1, 2, 3]) {
      for (let bits = 0; bits < 2 ** n; bits++) {
        const targets = Array.from({ length: n }, (_, i): Group['target'] => ((bits >> i) & 1 ? 'tabs' : 'patterns'));
        let combos: (typeof rows)[] = [[]];
        for (let i = 0; i < n; i++) combos = combos.flatMap((combo) => rows.map((row) => [...combo, row]));
        for (const combo of combos) {
          setups++;
          const groups = targets.map((target, g) => ({
            ...group(`g${g}`, ['example.com'], [], { target }),
            headers: combo[g].map((operation, r) => ({ name: r ? 'cookie' : 'Cookie', value: `${g}.${r}`, operation })),
          }));
          const result = matchGroups(groups, 'https://example.com/')!;
          const shownFor = new Map([...result.byPattern, ...result.byTabs].map((m) => [m.group, m.headers]));
          const tabsGroups = groups.filter((g) => g.target === 'tabs');
          const place = (tabs?: Group) => chrome(groups.filter((g) => g.target !== 'tabs' || g === tabs).flatMap((g) => g.headers));
          const elsewhere = place();
          const inTabs = new Map(tabsGroups.map((tabs) => [tabs, place(tabs)]));
          for (const g of groups) {
            g.headers.forEach((h, r) => {
              let expected: string;
              if (g.target === 'tabs') expected = inTabs.get(g)!.has(h) ? 'made' : 'overridden';
              else if (elsewhere.has(h)) expected = tabsGroups.some((t) => !inTabs.get(t)!.has(h)) ? 'overridden in tabs' : 'made';
              else expected = tabsGroups.some((t) => inTabs.get(t)!.has(h)) ? 'only in tabs' : 'overridden';
              const actual = shown(shownFor.get(g)![r]);
              if (actual !== expected) mismatches.push(`${targets} ${combo.join('|')}: ${h.value} ${actual}, not ${expected}`);
            });
          }
        }
      }
    }
    expect(setups).toBe(24 + 576 + 13824);
    expect(mismatches).toEqual([]);
  });

  it("marks a URL group's change that Chrome makes only in a tabs group's picked tabs", () => {
    const groups: Group[] = [
      { ...group('tabs', [], [], { target: 'tabs' }), headers: [{ name: 'Cookie', value: 's=1' }] },
      { ...group('strip', ['example.com'], []), headers: [{ name: 'Cookie', value: '', operation: 'remove' }] },
      { ...group('debug', ['example.com'], []), headers: [{ name: 'Cookie', value: 'debug=1', operation: 'append' }] },
    ];
    expect(matchGroups(groups, 'https://example.com/')?.byPattern.map((match) => match.headers)).toEqual([
      [{ name: 'Cookie', value: '', operation: 'remove', overriddenInTabs: true }],
      [{ name: 'Cookie', value: 'debug=1', operation: 'append', onlyInTabs: true }],
    ]);
  });

  it('weighs groups only on the requests their Filters both take, and leaves out those that take none', () => {
    const groups: Group[] = [
      group('pages', ['example.com'], [['Accept', 'text/html']], { resourceTypes: ['main_frame'] }),
      group('api', ['example.com'], [['Accept', 'application/json']], { resourceTypes: ['xmlhttprequest'] }),
      {
        ...group('strip-pages', ['example.com'], [], { resourceTypes: ['main_frame'] }),
        headers: [{ name: 'X-Env', value: '', operation: 'remove' }],
      },
      group('all', ['example.com'], [['X-Env', 'all']]),
      group('posts', ['example.com'], [['X-Post', '1']], { requestMethods: ['post'] }),
      group('websockets', ['example.com'], [['X-Ws', '1']], { resourceTypes: ['websocket'] }),
    ];
    const headers = (url: string) =>
      matchGroups(groups, url)?.byPattern.map((match) => [match.group.id, match.headers]);
    expect(headers('https://example.com/')).toEqual([
      ['pages', [{ name: 'Accept', value: 'text/html' }]],
      ['api', [{ name: 'Accept', value: 'application/json' }]],
      ['strip-pages', [{ name: 'X-Env', value: '', operation: 'remove', wins: true }]],
      ['all', [{ name: 'X-Env', value: 'all', partly: true }]],
      ['posts', [{ name: 'X-Post', value: '1' }]],
    ]);
    // A ws(s) URL is a WebSocket request, which Chrome never matches by method.
    expect(headers('wss://example.com/socket')).toEqual([
      ['all', [{ name: 'X-Env', value: 'all' }]],
      ['websockets', [{ name: 'X-Ws', value: '1' }]],
    ]);
  });

  it('names a URL group that blocks every request to the URL', () => {
    const groups = [
      group('a', ['example.com'], [['X-Env', 'a']]),
      group('xhr-block', ['example.com'], [], { action: 'block', resourceTypes: ['xmlhttprequest'] }),
      group('block', ['example.com'], [], { action: 'block' }),
    ];
    expect(matchGroups(groups, 'https://example.com/')?.blockedBy).toBe(groups[2]);
    expect(matchGroups(groups.slice(0, 2), 'https://example.com/')?.blockedBy).toBeUndefined();
  });
});
