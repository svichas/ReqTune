import { patternToRegex } from './pattern';
import type { Group, HeaderEntry } from './types';
import { isValidHeaderName, isValidHeaderValue } from './validation';

/**
 * A header a group would set. `wins` is there when other matching groups set it too: whether this value is sent (for a
 * tabs group, from its picked tabs). `overriddenInTabs` takes its place on a URL group's value when a tabs group above
 * sets the header too: requests from the tabs that group picked get its value instead.
 */
export interface HeaderMatch extends HeaderEntry {
  wins?: boolean;
  overriddenInTabs?: boolean;
}

/** A group that would change the request, with the headers it sends: its valid ones, names trimmed. */
export interface GroupMatch {
  group: Group;
  headers: HeaderMatch[];
}

export interface UrlMatches {
  /** Groups whose URL patterns match, in list order (their priority), each with the first pattern that matches. */
  byPattern: (GroupMatch & { pattern: string })[];
  /** Groups that target tabs: they change every request from their picked tabs, whatever the URL. */
  byTabs: GroupMatch[];
}

/**
 * Which enabled groups would change a request to `url`, by the same filters as the worker's rules; null when `url`
 * isn't a full http(s) or ws(s) URL, the only requests the rules apply to. A pattern too complex for Chrome still
 * matches here, though the worker skips it; its card flags it. Tabs groups count as having a picked tab open: callers
 * leave out those that don't.
 */
export function matchGroups(groups: Group[], url: string): UrlMatches | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^(https?|wss?):$/.test(parsed.protocol)) return null;

  const result: UrlMatches = { byPattern: [], byTabs: [] };
  // Lowercased name -> the first header to set it among the URL groups, and among the tabs groups above that one.
  // Chrome compares names case-insensitively and skips later sets, by priority across rule sets, so from its picked
  // tabs a tabs group outranks the URL groups below it. Tabs groups only meet in tabs both picked: they aren't weighed
  // against each other.
  const firstSets = new Map<string, HeaderMatch>();
  const tabSets = new Map<string, HeaderMatch>();
  for (const group of groups) {
    if (!group.enabled) continue;
    const headers: HeaderMatch[] = group.headers
      .map((header) => ({ ...header, name: header.name.trim() }))
      .filter(({ name, value }) => isValidHeaderName(name) && isValidHeaderValue(value));
    if (!headers.length) continue;
    const byTabs = group.target === 'tabs';
    if (byTabs) {
      result.byTabs.push({ group, headers });
    } else {
      // href is the canonical form Chrome matches: lowercase punycode host, no default port.
      const pattern = group.patterns.find((p) => {
        const regex = patternToRegex(p);
        return regex !== null && new RegExp(regex, 'i').test(parsed.href);
      });
      if (pattern === undefined) continue;
      result.byPattern.push({ group, pattern, headers });
    }
    for (const header of headers) {
      const key = header.name.toLowerCase();
      const first = firstSets.get(key);
      if (first) {
        if (!first.overriddenInTabs) first.wins = true;
        header.wins = false;
      } else if (!byTabs) {
        firstSets.set(key, header);
        const above = tabSets.get(key);
        if (above) {
          above.wins = true;
          header.overriddenInTabs = true;
        }
      } else if (!tabSets.has(key)) {
        tabSets.set(key, header);
      }
    }
  }
  return result;
}
