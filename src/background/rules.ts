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

/**
 * The rules within Chrome's cap on regex rules, past which it refuses the whole update. They come in priority order, so
 * the lowest-priority patterns are the ones left out.
 */
export function withinRegexLimit(rules: chrome.declarativeNetRequest.Rule[], max: number) {
  let regexes = 0;
  return rules.filter((rule) => !rule.condition.regexFilter || ++regexes <= max);
}

/** One regex matching any of the valid patterns, or null when fewer than two are valid. */
export function combinedRegex(patterns: string[]): string | null {
  const regexes = patterns.map(patternToRegex).filter((regex) => regex !== null);
  return regexes.length > 1 ? regexes.map((regex) => `(?:${regex})`).join('|') : null;
}

// Runs under Vitest without a `chrome` global, so enum values are written as string literals.
// Ids are unique across all returned rules, so callers may split them between Chrome's rule sets.
// `split` names groups whose patterns Chrome refused as one combinedRegex: they get a rule per pattern again.
export function buildRules(
  groups: Group[],
  tabSelections: TabSelections,
  resourceTypes: chrome.declarativeNetRequest.ResourceType[],
  split: ReadonlySet<string> = new Set(),
): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  groups.forEach((group, index) => {
    if (!group.enabled) return;
    const requestHeaders = headerInfos(group.headers, isValidRequestHeader);
    const responseHeaders = headerInfos(group.responseHeaders ?? [], isValidResponseHeader);
    const block = group.action === 'block';
    if (!block && !requestHeaders.length && !responseHeaders.length) return;
    // Picked filters narrow the rule; none leaves every request, as before (Chrome rejects empty lists). Values
    // Chrome doesn't know are dropped: one would fail the whole update.
    const types = resourceTypes.filter((type) => group.resourceTypes?.includes(type));
    const methods = (['connect', 'delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'other'] as const).filter(
      (method) => group.requestMethods?.includes(method),
    );
    const rule = (condition: chrome.declarativeNetRequest.RuleCondition): chrome.declarativeNetRequest.Rule => ({
      id: rules.length + 1,
      // Chrome applies higher priorities first, across all rule sets, and ignores later sets of the same header:
      // earlier groups win. Blocks are checked before any header is set, so a block wins wherever its group sits.
      priority: groups.length - index,
      // Chrome rejects an empty list, so whichever of the two has nothing to change is left out.
      action: block
        ? { type: 'block' }
        : {
            type: 'modifyHeaders',
            ...(requestHeaders.length && { requestHeaders }),
            ...(responseHeaders.length && { responseHeaders }),
          },
      condition: {
        ...condition,
        resourceTypes: types.length ? types : resourceTypes,
        ...(methods.length ? { requestMethods: methods } : {}),
      },
    });
    if (group.target === 'tabs') {
      // No URL filter: every request from the picked tabs. With none picked the group applies nowhere, and Chrome
      // would reject an empty tabIds anyway.
      const tabIds = tabSelections[group.id] ?? [];
      if (tabIds.length) rules.push(rule({ tabIds }));
      return;
    }
    // Chrome lets appends add up, even from one extension, so with a rule per pattern a URL that two patterns match
    // would get each append twice. A set or a remove applies once whatever, so other groups keep a rule per pattern.
    const appends = !block && [...requestHeaders, ...responseHeaders].some((h) => h.operation === 'append');
    const combined = appends && !split.has(group.id) ? combinedRegex(group.patterns) : null;
    for (const regexFilter of combined ? [combined] : group.patterns.map(patternToRegex)) {
      if (regexFilter) rules.push(rule({ regexFilter }));
    }
  });
  return rules;
}

/**
 * buildRules' rules minus those whose regex Chrome refuses, as one would fail the whole update: over its size limit or,
 * from `regex:`, not RE2. A group whose patterns Chrome refused as one combinedRegex gets a rule per pattern again, so
 * it only loses the patterns Chrome can't take on their own. `built` counts the rules before any were left out.
 */
export async function supportedRules(
  groups: Group[],
  tabSelections: TabSelections,
  resourceTypes: chrome.declarativeNetRequest.ResourceType[],
  isSupported: (regex: string) => Promise<boolean>,
) {
  const refusedIn = async (rules: chrome.declarativeNetRequest.Rule[]) => {
    const regexes = [...new Set(rules.flatMap((rule) => rule.condition.regexFilter ?? []))];
    const supported = await Promise.all(regexes.map(isSupported));
    return new Set(regexes.filter((_, i) => !supported[i]));
  };
  let rules = buildRules(groups, tabSelections, resourceTypes);
  let refused = await refusedIn(rules);
  const split = new Set(groups.filter((g) => refused.has(combinedRegex(g.patterns) ?? '')).map((g) => g.id));
  if (split.size) {
    rules = buildRules(groups, tabSelections, resourceTypes, split);
    refused = await refusedIn(rules);
  }
  return { built: rules.length, supported: rules.filter((rule) => !refused.has(rule.condition.regexFilter ?? '')) };
}
