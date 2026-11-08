import { patternToRegex } from './pattern';
import type { Group, HeaderEntry } from './types';
import { isValidRequestHeader, isValidResponseHeader } from './validation';

/**
 * A header a group would change. `wins` is there when other matching groups change it too: whether this change is
 * made (for a tabs group, from its picked tabs). `overriddenInTabs` takes its place on a URL group's change when a tabs
 * group above changes the header too and stops this one in the tabs that group picked.
 */
export interface HeaderMatch extends HeaderEntry {
  wins?: boolean;
  overriddenInTabs?: boolean;
}

/** A group that would change the request, with the headers it changes: its valid, switched-on ones, names trimmed. */
export interface GroupMatch {
  group: Group;
  /** Empty for a group that blocks: its headers wait unused. */
  headers: HeaderMatch[];
  responseHeaders: HeaderMatch[];
}

export interface UrlMatches {
  /** Groups whose URL patterns match, in list order (their priority), each with the first pattern that matches. */
  byPattern: (GroupMatch & { pattern: string })[];
  /** Groups that target tabs: they change every request from their picked tabs, whatever the URL. */
  byTabs: GroupMatch[];
}

/**
 * Chrome applies rules by priority, and once one has set or appended to a header, lower ones may only append to it;
 * once one has removed it, nothing more.
 */
const alsoApplies = (above: HeaderEntry, below: HeaderEntry) =>
  below.operation === 'append' && above.operation !== 'remove';

/** Marks each header against the same name from groups above it, the request's and the response's apart. */
function weigher() {
  // Lowercased name -> the first change to it among the URL groups, and among the tabs groups above that one. Chrome
  // compares names case-insensitively, by priority across rule sets, so from its picked tabs a tabs group outranks
  // the URL groups below it. Tabs groups only meet in tabs both picked: they aren't weighed against each other.
  const first = new Map<string, HeaderMatch>();
  const firstInTabs = new Map<string, HeaderMatch>();
  return (header: HeaderMatch, byTabs: boolean) => {
    const key = header.name.toLowerCase();
    const above = first.get(key);
    if (above) {
      if (alsoApplies(above, header)) return;
      if (!above.overriddenInTabs) above.wins = true;
      header.wins = false;
    } else if (!byTabs) {
      first.set(key, header);
      const tabsAbove = firstInTabs.get(key);
      if (tabsAbove && !alsoApplies(tabsAbove, header)) {
        tabsAbove.wins = true;
        header.overriddenInTabs = true;
      }
    } else if (!firstInTabs.has(key)) {
      firstInTabs.set(key, header);
    }
  };
}

const usable = (headers: HeaderEntry[], isValid: (header: HeaderEntry) => boolean): HeaderMatch[] =>
  headers.filter((h) => h.enabled !== false && isValid(h)).map((header) => ({ ...header, name: header.name.trim() }));

/**
 * Which enabled groups would change a request to `url`, by the same filters as the worker's rules; null when `url`
 * isn't a full http(s) or ws(s) URL, the only requests the rules apply to. A pattern too complex for Chrome still
 * matches here, though the worker skips it; its card flags it. Tabs groups count as having a picked tab open: callers
 * leave out those that don't. Only a URL is known, so a group's Filters count as matching: callers show them.
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
  const weighRequest = weigher();
  const weighResponse = weigher();
  for (const group of groups) {
    if (!group.enabled) continue;
    const blocks = group.action === 'block';
    const headers = blocks ? [] : usable(group.headers, isValidRequestHeader);
    const responseHeaders = blocks ? [] : usable(group.responseHeaders ?? [], isValidResponseHeader);
    if (!blocks && !headers.length && !responseHeaders.length) continue;
    const byTabs = group.target === 'tabs';
    if (byTabs) {
      result.byTabs.push({ group, headers, responseHeaders });
    } else {
      // href is the canonical form Chrome matches: lowercase punycode host, no default port.
      const pattern = group.patterns.find((p) => {
        const regex = patternToRegex(p);
        return regex !== null && new RegExp(regex, 'i').test(parsed.href);
      });
      if (pattern === undefined) continue;
      result.byPattern.push({ group, pattern, headers, responseHeaders });
    }
    headers.forEach((header) => weighRequest(header, byTabs));
    responseHeaders.forEach((header) => weighResponse(header, byTabs));
  }
  return result;
}
