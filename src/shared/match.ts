import { patternToRegex } from './pattern';
import type { Group, HeaderEntry } from './types';
import { isValidHeaderName, isValidHeaderValue } from './validation';

/** A header a group would set. `wins` is there when other matching groups set it too: whether this value is sent. */
export interface HeaderMatch extends HeaderEntry {
  wins?: boolean;
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
 * matches here, though the worker skips it; its card flags it.
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
  // Lowercased name -> the first header to set it. Chrome compares names case-insensitively and skips later sets.
  const firstSets = new Map<string, HeaderMatch>();
  for (const group of groups) {
    if (!group.enabled) continue;
    const headers: HeaderMatch[] = group.headers
      .map((header) => ({ ...header, name: header.name.trim() }))
      .filter(({ name, value }) => isValidHeaderName(name) && isValidHeaderValue(value));
    if (!headers.length) continue;
    if (group.target === 'tabs') {
      result.byTabs.push({ group, headers });
      continue;
    }
    // href is the canonical form Chrome matches: lowercase punycode host, no default port.
    const pattern = group.patterns.find((p) => {
      const regex = patternToRegex(p);
      return regex !== null && new RegExp(regex, 'i').test(parsed.href);
    });
    if (pattern === undefined) continue;
    result.byPattern.push({ group, pattern, headers });
    for (const header of headers) {
      const key = header.name.toLowerCase();
      const first = firstSets.get(key);
      if (first) {
        first.wins = true;
        header.wins = false;
      } else {
        firstSets.set(key, header);
      }
    }
  }
  return result;
}
