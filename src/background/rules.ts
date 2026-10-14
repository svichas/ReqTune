import { patternToRegex } from '../shared/pattern';
import type { Group } from '../shared/types';
import { isValidHeaderName, isValidHeaderValue } from '../shared/validation';

// Runs under Vitest without a `chrome` global, so enum values are written as string literals.
export function buildRules(
  groups: Group[],
  resourceTypes: chrome.declarativeNetRequest.ResourceType[],
): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  groups.forEach((group, index) => {
    if (!group.enabled) return;
    const requestHeaders = group.headers
      .map(({ name, value }) => ({ header: name.trim(), operation: 'set' as const, value }))
      .filter(({ header, value }) => isValidHeaderName(header) && isValidHeaderValue(value));
    if (!requestHeaders.length) return;
    for (const pattern of group.patterns) {
      const regexFilter = patternToRegex(pattern);
      if (!regexFilter) continue;
      rules.push({
        id: rules.length + 1,
        // Chrome applies higher priorities first and ignores later sets of the same header: earlier groups win.
        priority: groups.length - index,
        action: { type: 'modifyHeaders', requestHeaders },
        condition: { regexFilter, resourceTypes },
      });
    }
  });
  return rules;
}
