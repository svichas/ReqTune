import { canOverlap, isRegexPattern, patternToRegex } from '../shared/pattern';
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

// Chrome lets appends add up, even from one extension's rules, so a URL that two of a group's rules match would get
// each append twice. A set or a remove applies once however many rules match.
const appends = (group: Group) =>
  group.action !== 'block' &&
  [
    ...headerInfos(group.headers, isValidRequestHeader),
    ...headerInfos(group.responseHeaders ?? [], isValidResponseHeader),
  ].some((header) => header.operation === 'append');

/**
 * One regex for patterns that share a rule. Factoring out a shared `^scheme://` start keeps it within Chrome's size cap
 * far more often; only wildcard patterns are factored, as a raw `regex:` one may have a top-level `|` it would change.
 */
function combine(patterns: string[]): string {
  const regexes = patterns.map((pattern) => patternToRegex(pattern)!);
  const start = /^\^[^:]*:\/\//.exec(regexes[0])?.[0];
  if (start && !patterns.some(isRegexPattern) && regexes.every((regex) => regex.startsWith(start))) {
    return `${start}(?:${regexes.map((regex) => regex.slice(start.length)).join('|')})`;
  }
  return regexes.map((regex) => `(?:${regex})`).join('|');
}

/**
 * The regexes of a group's URL rules. Without `refused` (regexes Chrome won't take), one per valid pattern, to check
 * them one by one. With it, one per pattern Chrome takes, except that in a group that appends, patterns that can match
 * one URL share a rule if Chrome takes them as one regex; `repeats` says some couldn't.
 */
export function ruleRegexes(group: Group, refused?: ReadonlySet<string>) {
  const patterns = group.patterns.filter((pattern) => {
    const regex = patternToRegex(pattern);
    return regex !== null && !refused?.has(regex);
  });
  const regex = (pattern: string) => patternToRegex(pattern)!;
  if (!refused || !appends(group)) return { regexes: patterns.map(regex), repeats: false };
  // Patterns that can meet, directly or through others, go together.
  const clusters: string[][] = [];
  for (const pattern of patterns) {
    const meeting = clusters.filter((cluster) => cluster.some((other) => canOverlap(pattern, other)));
    clusters.push([...meeting.flat(), pattern]);
    for (const cluster of meeting) clusters.splice(clusters.indexOf(cluster), 1);
  }
  let repeats = false;
  const regexes = clusters.flatMap((cluster) => {
    if (cluster.length === 1) return [regex(cluster[0])];
    const combined = combine(cluster);
    if (!refused.has(combined)) return [combined];
    repeats = true;
    return cluster.map(regex);
  });
  return { regexes, repeats };
}

// Runs under Vitest without a `chrome` global, so enum values are written as string literals.
// Ids are unique across all returned rules, so callers may split them between Chrome's rule sets.
// `refused` is ruleRegexes': leave it out to get a rule per valid pattern, to check them one by one.
export function buildRules(
  groups: Group[],
  tabSelections: TabSelections,
  resourceTypes: chrome.declarativeNetRequest.ResourceType[],
  refused?: ReadonlySet<string>,
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
    for (const regexFilter of ruleRegexes(group, refused).regexes) rules.push(rule({ regexFilter }));
  });
  return rules;
}

/**
 * The rules to install, by asking Chrome about each regex first: one it refuses would fail the whole update, over its
 * size limit or, from `regex:`, not RE2. Patterns are asked about one by one, and only then the combinations of those
 * Chrome takes. `skipped` counts patterns Chrome refused; `repeats` lists groups whose appends may still add up.
 */
export async function supportedRules(
  groups: Group[],
  tabSelections: TabSelections,
  resourceTypes: chrome.declarativeNetRequest.ResourceType[],
  isSupported: (regex: string) => Promise<boolean>,
) {
  const answers = new Map<string, Promise<boolean>>();
  const refused = new Set<string>();
  const ask = (rules: chrome.declarativeNetRequest.Rule[]) =>
    Promise.all(
      rules.flatMap((rule) => rule.condition.regexFilter ?? []).map(async (regex) => {
        if (!answers.has(regex)) answers.set(regex, isSupported(regex));
        if (!(await answers.get(regex))) refused.add(regex);
      }),
    );
  const single = buildRules(groups, tabSelections, resourceTypes);
  await ask(single);
  await ask(buildRules(groups, tabSelections, resourceTypes, refused));
  return {
    rules: buildRules(groups, tabSelections, resourceTypes, refused),
    skipped: single.filter((rule) => refused.has(rule.condition.regexFilter ?? '')).length,
    repeats: groups.filter((group) => group.enabled && group.target !== 'tabs' && ruleRegexes(group, refused).repeats),
  };
}
