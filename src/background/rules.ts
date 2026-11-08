import { patternToRegex } from '../shared/pattern';
import type { Group, HeaderEntry, TabSelections } from '../shared/types';
import { isValidRequestHeader, isValidResponseHeader } from '../shared/validation';

/** The entries that are on and valid, as Chrome header operations. */
const headerInfos = (headers: HeaderEntry[], isValid: (header: HeaderEntry) => boolean) =>
  headers
    .filter((h) => h.enabled !== false && isValid(h))
    .map(({ name, value, operation = 'set' }) => {
      const header = name.trim();
      // Chrome rejects a value on remove, and documents its append allowlist as lowercase and case-sensitive.
      if (operation === 'remove') return { header, operation };
      return { header: operation === 'append' ? header.toLowerCase() : header, operation, value };
    });

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
    const requestHeaders = headerInfos(group.headers, isValidRequestHeader);
    const responseHeaders = headerInfos(group.responseHeaders ?? [], isValidResponseHeader);
    if (!requestHeaders.length && !responseHeaders.length) return;
    const rule = (condition: chrome.declarativeNetRequest.RuleCondition): chrome.declarativeNetRequest.Rule => ({
      id: rules.length + 1,
      // Chrome applies higher priorities first, across all rule sets, and ignores later sets of the same header:
      // earlier groups win.
      priority: groups.length - index,
      // Chrome rejects an empty list, so whichever of the two has nothing to change is left out.
      action: {
        type: 'modifyHeaders',
        ...(requestHeaders.length && { requestHeaders }),
        ...(responseHeaders.length && { responseHeaders }),
      },
      condition: { ...condition, resourceTypes },
    });
    if (group.target === 'tabs') {
      // No URL filter: every request from the picked tabs. With none picked the group applies nowhere, and Chrome
      // would reject an empty tabIds anyway.
      const tabIds = tabSelections[group.id] ?? [];
      if (tabIds.length) rules.push(rule({ tabIds }));
      return;
    }
    for (const pattern of group.patterns) {
      const regexFilter = patternToRegex(pattern);
      if (regexFilter) rules.push(rule({ regexFilter }));
    }
  });
  return rules;
}
