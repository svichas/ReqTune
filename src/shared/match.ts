import { patternToRegex } from './pattern';
import type { Group, HeaderEntry } from './types';
import { isValidRequestHeader, isValidResponseHeader } from './validation';

/**
 * A header change a group would make, marked when other matching groups change the same header:
 * - `wins`: Chrome makes it wherever the group applies, and it stops another group's change. False: never made.
 * - `partly`: made for some kinds of request but not others, as the groups' Filters differ.
 * - `overriddenInTabs`: a URL group's change, made elsewhere but stopped in a tabs group's picked tabs.
 * - `onlyInTabs`: a URL group's change, stopped elsewhere but made in a tabs group's picked tabs.
 */
export interface HeaderMatch extends HeaderEntry {
  wins?: boolean;
  partly?: boolean;
  overriddenInTabs?: boolean;
  onlyInTabs?: boolean;
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
  /** A URL group that blocks every request to the URL, whatever its kind; Chrome then changes no header. */
  blockedBy?: Group;
}

/** A kind of request, only as fine as the groups' Filters tell apart: '' is any value none of them names. */
interface Kind {
  type: string;
  /** Absent on a WebSocket request: Chrome matches methods on HTTP requests only. */
  method?: string;
}

// shortcut: a filter value Chrome doesn't know (only a newer version's file has one) counts here as a real one, though
// the worker drops it; handle it if such files show up.
function requestKinds(groups: Group[], webSocket: boolean): Kind[] {
  if (webSocket) return [{ type: 'websocket' }];
  const types = new Set(groups.flatMap((group) => group.resourceTypes ?? []));
  types.delete('websocket');
  const methods = [...new Set(groups.flatMap((group) => group.requestMethods ?? [])), ''];
  return [...types, ''].flatMap((type) => methods.map((method) => ({ type, method })));
}

const takes = ({ resourceTypes, requestMethods }: Group, { type, method }: Kind) =>
  (!resourceTypes?.length || resourceTypes.includes(type)) &&
  (!requestMethods?.length || (method !== undefined && requestMethods.includes(method)));

/**
 * Chrome applies rules by priority, and the first change to a header decides what may follow: after a set or an
 * append, only appends; after a remove, nothing.
 */
const alsoApplies = (first: HeaderEntry, later: HeaderEntry) =>
  later.operation === 'append' && first.operation !== 'remove';

/** Which of `changes`, in priority order, Chrome makes, and which of those stop another. */
function decide(changes: HeaderMatch[]) {
  const first = new Map<string, HeaderMatch>();
  const made = new Set<HeaderMatch>();
  const stopping = new Set<HeaderMatch>();
  for (const change of changes) {
    const key = change.name.toLowerCase();
    const decider = first.get(key);
    if (!decider) first.set(key, change);
    else if (!alsoApplies(decider, change)) {
      stopping.add(decider);
      continue;
    }
    made.add(change);
  }
  return { made, stopping };
}

/**
 * Marks one list of headers (the request's or the response's) by working out, for each kind of request, what Chrome
 * makes outside any picked tab, where only URL groups apply, and in each tabs group's picked tabs, where that group
 * does too, in its place. Tabs groups only meet in tabs both picked, which can't be told here: each is weighed alone.
 */
function mark(ordered: GroupMatch[], tabsMatches: Set<GroupMatch>, kinds: Kind[], list: 'headers' | 'responseHeaders') {
  const fromTabs = new Set([...tabsMatches].flatMap((match) => match[list]));
  const tally = new Map<HeaderMatch, { made: number; stopped: number; stops: boolean; inTabs: Set<string> }>();
  const urlMatches = ordered.filter((match) => !tabsMatches.has(match));
  const inTabsOf = (tabs: GroupMatch) => ordered.filter((match) => match === tabs || !tabsMatches.has(match));
  const places = [urlMatches, ...[...tabsMatches].map(inTabsOf)];
  kinds.forEach((kind) => {
    let elsewhere = new Set<HeaderMatch>();
    places.forEach((place, i) => {
      const changes = place.filter(({ group }) => takes(group, kind)).flatMap((match) => match[list]);
      const { made, stopping } = decide(changes);
      if (i === 0) elsewhere = made;
      for (const change of changes) {
        const counts = tally.get(change) ?? { made: 0, stopped: 0, stops: false, inTabs: new Set() };
        tally.set(change, counts);
        if (stopping.has(change)) counts.stops = true;
        // Home is where the change is judged: outside picked tabs for a URL group's, its own tabs for a tabs group's.
        if (i === 0 || fromTabs.has(change)) counts[made.has(change) ? 'made' : 'stopped']++;
        else if (made.has(change) !== elsewhere.has(change)) counts.inTabs.add(made.has(change) ? 'made' : 'stopped');
      }
    });
  });
  for (const [change, { made, stopped, stops, inTabs }] of tally) {
    if (!made) {
      if (inTabs.has('made')) change.onlyInTabs = true;
      else change.wins = false;
    } else if (stopped) change.partly = true;
    else if (inTabs.has('stopped')) change.overriddenInTabs = true;
    else if (stops) change.wins = true;
  }
}

const usable = (headers: HeaderEntry[], isValid: (header: HeaderEntry) => boolean): HeaderMatch[] =>
  headers.filter((h) => h.enabled !== false && isValid(h)).map((header) => ({ ...header, name: header.name.trim() }));

/**
 * Which enabled groups would change a request to `url`, by the same filters as the worker's rules; null when `url`
 * isn't a full http(s) or ws(s) URL, the only requests the rules apply to. A pattern too complex for Chrome still
 * matches here, though the worker skips it; its card flags it. Tabs groups count as having a picked tab open: callers
 * leave out those that don't. Only the URL is known, so marks cover every kind of request a group's Filters take.
 */
export function matchGroups(groups: Group[], url: string): UrlMatches | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^(https?|wss?):$/.test(parsed.protocol)) return null;

  const enabled = groups.filter((group) => group.enabled);
  const kinds = requestKinds(enabled, parsed.protocol.startsWith('ws'));
  const result: UrlMatches = { byPattern: [], byTabs: [] };
  const ordered: GroupMatch[] = [];
  const tabsMatches = new Set<GroupMatch>();
  for (const group of enabled) {
    // A group whose Filters take no request this URL can make, say an XHR-only one for a wss:// URL, changes nothing.
    if (!kinds.some((kind) => takes(group, kind))) continue;
    const blocks = group.action === 'block';
    const headers = blocks ? [] : usable(group.headers, isValidRequestHeader);
    const responseHeaders = blocks ? [] : usable(group.responseHeaders ?? [], isValidResponseHeader);
    if (!blocks && !headers.length && !responseHeaders.length) continue;
    const match = { group, headers, responseHeaders };
    if (group.target === 'tabs') {
      result.byTabs.push(match);
      tabsMatches.add(match);
    } else {
      // href is the canonical form Chrome matches: lowercase punycode host, no default port.
      const pattern = group.patterns.find((p) => {
        const regex = patternToRegex(p);
        return regex !== null && new RegExp(regex, 'i').test(parsed.href);
      });
      if (pattern === undefined) continue;
      result.byPattern.push({ ...match, pattern });
      if (blocks && !result.blockedBy && kinds.every((kind) => takes(group, kind))) result.blockedBy = group;
    }
    ordered.push(match);
  }
  mark(ordered, tabsMatches, kinds, 'headers');
  mark(ordered, tabsMatches, kinds, 'responseHeaders');
  return result;
}
