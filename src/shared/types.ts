/** A header changed on every request, or response, its group matches. */
export interface HeaderEntry {
  name: string;
  /** Kept for a Remove too, though not sent, so switching back restores it. */
  value: string;
  /** Replace the header (the default), add the value to it, or drop it. */
  operation?: 'set' | 'append' | 'remove';
  /** Off keeps the header in its group without sending it; absent means on. */
  enabled?: boolean;
}

/** URL patterns plus the headers applied to requests matching any of them, and to their responses. */
export interface Group {
  id: string;
  name: string;
  enabled: boolean;
  /** Wildcard URL patterns, e.g. `*.example.com/api/*`; syntax in pattern.ts. */
  patterns: string[];
  headers: HeaderEntry[];
  /** Set on the responses to those requests; absent means none. */
  responseHeaders?: HeaderEntry[];
  /**
   * Which requests get the headers: those matching `patterns`, from any tab (the default), or every request from the
   * tabs picked for the group in TabSelections, whatever its URL. Never both.
   */
  target?: 'patterns' | 'tabs';
}

/** Group id -> ids of the tabs picked for it; only used while its `target` is 'tabs'. */
export type TabSelections = Record<string, number[]>;
