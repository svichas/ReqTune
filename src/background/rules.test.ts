import { describe, it, expect } from 'vitest';
import { patternToRegex } from '../shared/pattern';
import type { Group, HeaderEntry } from '../shared/types';
import { buildRules } from './rules';

const resourceTypes = ['main_frame', 'xmlhttprequest'] as chrome.declarativeNetRequest.ResourceType[];
const group = (patterns: string[], headers: HeaderEntry[], enabled = true): Group => ({
  id: '',
  name: '',
  enabled,
  patterns,
  headers,
});
const rule = (id: number, priority: number, pattern: string, header: string, value: string) => ({
  id,
  priority,
  action: { type: 'modifyHeaders', requestHeaders: [{ header, operation: 'set', value }] },
  condition: { regexFilter: patternToRegex(pattern), resourceTypes },
});

describe('buildRules', () => {
  it('builds one rule per valid pattern of each enabled group, earlier groups first', () => {
    const groups = [
      group(['a.com', 'not valid', '/api/*'], [
        { name: ' X-Token ', value: 'a' },
        { name: 'Bad Name', value: 'b' },
        { name: 'X-Bad-Value', value: 'line\nbreak' },
      ]),
      group(['disabled.com'], [{ name: 'X-Token', value: 'disabled' }], false),
      group(['no-headers.com'], [{ name: ' ', value: 'x' }]),
      group(['b.com'], [{ name: 'X-Token', value: 'b' }]),
    ];
    expect(buildRules(groups, {}, resourceTypes)).toEqual([
      rule(1, 4, 'a.com', 'X-Token', 'a'),
      rule(2, 4, '/api/*', 'X-Token', 'a'),
      rule(3, 1, 'b.com', 'X-Token', 'b'),
    ]);
  });

  it('sets response headers in the same rule, leaving out a list with nothing valid to set', () => {
    const set = (header: string, value: string) => [{ header, operation: 'set', value }];
    const groups: Group[] = [
      group(['request.com'], [{ name: 'X-Token', value: 'r' }]),
      {
        ...group(['response.com'], [{ name: '', value: '' }]),
        responseHeaders: [
          { name: ' Access-Control-Allow-Origin ', value: '*' },
          { name: 'Bad Name', value: 'x' },
        ],
      },
      {
        ...group(['both.com'], [{ name: 'X-Token', value: 'b' }]),
        responseHeaders: [{ name: 'Set-Cookie', value: 'id=1' }],
      },
      { ...group(['neither.com'], []), responseHeaders: [{ name: 'X-Bad-Value', value: 'line\nbreak' }] },
    ];
    // Strict, so a left-out list can't be an undefined key either; Chrome rejects the whole update over an empty one.
    expect(buildRules(groups, {}, resourceTypes).map((r) => r.action)).toStrictEqual([
      { type: 'modifyHeaders', requestHeaders: set('X-Token', 'r') },
      { type: 'modifyHeaders', responseHeaders: set('Access-Control-Allow-Origin', '*') },
      { type: 'modifyHeaders', requestHeaders: set('X-Token', 'b'), responseHeaders: set('Set-Cookie', 'id=1') },
    ]);
  });

  it('appends to any response header, and skips response headers switched off', () => {
    const groups: Group[] = [
      {
        ...group(['a.com'], []),
        responseHeaders: [
          { name: 'Set-Cookie', value: 'b=2', operation: 'append' },
          { name: 'X-Frame-Options', value: 'DENY', operation: 'remove' },
          { name: 'X-Off', value: 'x', enabled: false },
        ],
      },
    ];
    expect(buildRules(groups, {}, resourceTypes).map((r) => r.action)).toStrictEqual([
      {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'set-cookie', operation: 'append', value: 'b=2' },
          { header: 'X-Frame-Options', operation: 'remove' },
        ],
      },
    ]);
  });

  it('skips headers switched off; headers saved before the switch existed stay on', () => {
    const groups = [
      group(['off.com'], [{ name: 'X-Token', value: 'off', enabled: false }]),
      group(['on.com'], [{ name: 'X-Token', value: 'on', enabled: true }]),
      group(['saved.com'], [{ name: 'X-Token', value: 'saved' }]),
      group(['mixed.com'], [
        { name: 'X-Paused', value: 'p', enabled: false },
        { name: 'X-Token', value: 'mixed' },
      ]),
    ];
    expect(buildRules(groups, {}, resourceTypes)).toEqual([
      rule(1, 3, 'on.com', 'X-Token', 'on'),
      rule(2, 2, 'saved.com', 'X-Token', 'saved'),
      rule(3, 1, 'mixed.com', 'X-Token', 'mixed'),
    ]);
  });

  it('sends each header with its operation, appended names lowercased and removals without a value', () => {
    const groups = [
      group(['a.com'], [
        { name: 'X-Token', value: 'a' },
        { name: 'X-Set', value: 'b', operation: 'set' },
        { name: ' Cookie ', value: 'c=1', operation: 'append' },
        { name: 'Referer', value: 'not sent', operation: 'remove' },
        // Chrome only appends to its allowlist, and would reject the whole update over this one.
        { name: 'X-Custom', value: 'd', operation: 'append' },
        { name: 'Origin', value: '', operation: 'remove', enabled: false },
      ]),
      group(['b.com'], [{ name: 'Authorization', value: 'e', operation: 'append' }]),
    ];
    const rules = buildRules(groups, {}, resourceTypes);
    expect(rules).toHaveLength(1);
    expect(rules[0].action.requestHeaders).toStrictEqual([
      { header: 'X-Token', operation: 'set', value: 'a' },
      { header: 'X-Set', operation: 'set', value: 'b' },
      { header: 'cookie', operation: 'append', value: 'c=1' },
      { header: 'Referer', operation: 'remove' },
    ]);
  });

  it('targets either URL patterns or every request from the picked tabs, never both', () => {
    const header = { name: 'X-Token', value: 't' };
    const groups: Group[] = [
      { ...group(['ignored.com'], [header]), id: 'tabs', target: 'tabs' },
      { ...group(['nothing.com'], [header]), id: 'nothing-picked', target: 'tabs' },
      { ...group(['never.com'], [header]), id: 'never-picked', target: 'tabs' },
      { ...group(['patterns.com'], [header]), id: 'patterns', target: 'patterns' },
    ];
    const rules = buildRules(groups, { tabs: [3, 7], 'nothing-picked': [], patterns: [3] }, resourceTypes);
    expect(rules).toEqual([
      {
        id: 1,
        priority: 4,
        action: { type: 'modifyHeaders', requestHeaders: [{ header: 'X-Token', operation: 'set', value: 't' }] },
        condition: { tabIds: [3, 7], resourceTypes },
      },
      rule(2, 1, 'patterns.com', 'X-Token', 't'),
    ]);
    // A tabs group matches every URL; a patterns group every tab. Chrome only accepts tabIds in session rules.
    expect(rules[0].condition).not.toHaveProperty('regexFilter');
    expect(rules[1].condition).not.toHaveProperty('tabIds');
  });

  it("limits a group's rules to its picked resource types and methods", () => {
    const header = { name: 'X-Token', value: 't' };
    const groups: Group[] = [
      {
        ...group(['api.com'], [header]),
        resourceTypes: ['xmlhttprequest', 'not_a_type'],
        requestMethods: ['post', 'put', 'POST'],
      },
      { ...group([], [header]), id: 'tabs', target: 'tabs', requestMethods: ['get'] },
    ];
    expect(buildRules(groups, { tabs: [3] }, resourceTypes).map((rule) => rule.condition)).toEqual([
      { regexFilter: patternToRegex('api.com'), resourceTypes: ['xmlhttprequest'], requestMethods: ['post', 'put'] },
      { tabIds: [3], resourceTypes, requestMethods: ['get'] },
    ]);
  });

  it('applies to every resource type and method while a group picks none', () => {
    const header = { name: 'X-Token', value: 't' };
    const groups: Group[] = [
      group(['a.com'], [header]),
      { ...group(['b.com'], [header]), resourceTypes: [], requestMethods: [] },
      // Only values Chrome doesn't know: it would reject them, so the group keeps every type and method.
      { ...group(['c.com'], [header]), resourceTypes: ['not_a_type'], requestMethods: ['POST'] },
    ];
    const rules = buildRules(groups, {}, resourceTypes);
    expect(rules).toEqual([
      rule(1, 3, 'a.com', 'X-Token', 't'),
      rule(2, 2, 'b.com', 'X-Token', 't'),
      rule(3, 1, 'c.com', 'X-Token', 't'),
    ]);
    for (const { condition } of rules) expect(condition).not.toHaveProperty('requestMethods');
  });

  it("keeps groups saved by 0.1.3's \"Selected tabs\" on their URL patterns", () => {
    // 0.1.3 limited a group to patterns *and* tabs with `limitToTabs`. Read as targeting tabs, its headers (often a
    // token) would start going to every site those tabs talk to; on patterns they stay with the sites named.
    const legacy = { ...group(['api.example.com'], [{ name: 'X-Token', value: 't' }]), limitToTabs: true } as Group;
    expect(buildRules([legacy], { '': [3] }, resourceTypes)).toEqual([rule(1, 1, 'api.example.com', 'X-Token', 't')]);
  });
});
