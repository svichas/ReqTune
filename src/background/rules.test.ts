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
const rule = (id: number, priority: number, pattern: string, header: string, value: string, tabIds?: number[]) => ({
  id,
  priority,
  action: { type: 'modifyHeaders', requestHeaders: [{ header, operation: 'set', value }] },
  condition: { regexFilter: patternToRegex(pattern), resourceTypes, ...(tabIds && { tabIds }) },
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

  it('limits a group to its picked tabs only when it is set to', () => {
    const header = { name: 'X-Token', value: 't' };
    const groups = [
      { ...group(['limited.com', 'limited.org'], [header]), id: 'limited', limitToTabs: true },
      { ...group(['nothing-picked.com'], [header]), id: 'nothing-picked', limitToTabs: true },
      { ...group(['never-picked.com'], [header]), id: 'never-picked', limitToTabs: true },
      { ...group(['all-tabs.com'], [header]), id: 'all-tabs', limitToTabs: false },
    ];
    const rules = buildRules(groups, { limited: [3, 7], 'nothing-picked': [], 'all-tabs': [3] }, resourceTypes);
    expect(rules).toEqual([
      rule(1, 4, 'limited.com', 'X-Token', 't', [3, 7]),
      rule(2, 4, 'limited.org', 'X-Token', 't', [3, 7]),
      rule(3, 1, 'all-tabs.com', 'X-Token', 't'),
    ]);
    // Absent, not undefined: Chrome only accepts tabIds in session rules.
    expect(rules[2].condition).not.toHaveProperty('tabIds');
  });
});
