import { patternToRegex } from '../shared/pattern';
import type { Group, TabSelections } from '../shared/types';
import { isValidHeaderName, isValidHeaderValue } from '../shared/validation';

// Runs under Vitest without a `chrome` global, so enum values are written as string literals.
// Ids are unique across all returned rules, so callers may split them between Chrome's rule sets.
export function buildRules(
  groups: Group[],
  tabSelections: TabSelections,
  resourceTypes: chrome.declarativeNetRequest.ResourceType[],
): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  groups.forEach((group, index) => {
    if (!group.enabled) return;
    // A limited group with no tabs picked applies nowhere; Chrome would reject its empty tabIds anyway.
    const tabIds = group.limitToTabs ? (tabSelections[group.id] ?? []) : undefined;
    if (tabIds?.length === 0) return;
    const requestHeaders = group.headers
      .map(({ name, value }) => ({ header: name.trim(), operation: 'set' as const, value }))
      .filter(({ header, value }) => isValidHeaderName(header) && isValidHeaderValue(value));
    if (!requestHeaders.length) return;
    for (const pattern of group.patterns) {
      const regexFilter = patternToRegex(pattern);
      if (!regexFilter) continue;
      rules.push({
        id: rules.length + 1,
        // Chrome applies higher priorities first, across all rule sets, and ignores later sets of the same header:
        // earlier groups win.
        priority: groups.length - index,
        action: { type: 'modifyHeaders', requestHeaders },
        condition: { regexFilter, resourceTypes, ...(tabIds && { tabIds }) },
      });
    }
  });
  return rules;
}
