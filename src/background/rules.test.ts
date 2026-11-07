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
const block = (id: number, priority: number, condition: object) => ({
  id,
  priority,
  action: { type: 'block' },
  condition: { ...condition, resourceTypes },
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

  it("keeps groups saved by 0.1.3's \"Selected tabs\" on their URL patterns", () => {
    // 0.1.3 limited a group to patterns *and* tabs with `limitToTabs`. Read as targeting tabs, its headers (often a
    // token) would start going to every site those tabs talk to; on patterns they stay with the sites named.
    const legacy = { ...group(['api.example.com'], [{ name: 'X-Token', value: 't' }]), limitToTabs: true } as Group;
    expect(buildRules([legacy], { '': [3] }, resourceTypes)).toEqual([rule(1, 1, 'api.example.com', 'X-Token', 't')]);
  });

  it('blocks what a blocking group targets, by pattern or tab, with no headers needed', () => {
    const groups: Group[] = [
      { ...group(['ads.example.com', 'not valid', '/collect'], []), action: 'block' },
      { ...group(['ignored.com'], [{ name: 'X-Token', value: 't' }]), id: 'tabs', target: 'tabs', action: 'block' },
      { ...group(['nothing.com'], []), id: 'nothing-picked', target: 'tabs', action: 'block' },
      { ...group(['disabled.com'], [], false), action: 'block' },
    ];
    expect(buildRules(groups, { tabs: [3, 7] }, resourceTypes)).toEqual([
      block(1, 4, { regexFilter: patternToRegex('ads.example.com') }),
      block(2, 4, { regexFilter: patternToRegex('/collect') }),
      block(3, 3, { tabIds: [3, 7] }),
    ]);
  });

  it('gives blocking groups the same order-based priority as header groups', () => {
    const header = { name: 'X-Token', value: 't' };
    const groups: Group[] = [
      group(['a.com'], [header]),
      { ...group(['a.com'], [header]), action: 'block' },
      { ...group(['b.com'], [header]), action: 'headers' },
    ];
    expect(buildRules(groups, {}, resourceTypes)).toEqual([
      rule(1, 3, 'a.com', 'X-Token', 't'),
      block(2, 2, { regexFilter: patternToRegex('a.com') }),
      rule(3, 1, 'b.com', 'X-Token', 't'),
    ]);
  });
});
