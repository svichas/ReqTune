/** A request header set on every request its group matches. */
export interface HeaderEntry {
  name: string;
  value: string;
}

/** URL patterns plus the headers applied to requests matching any of them. */
export interface Group {
  id: string;
  name: string;
  enabled: boolean;
  /** Wildcard URL patterns, e.g. `*.example.com/api/*`; syntax in pattern.ts. */
  patterns: string[];
  headers: HeaderEntry[];
  /**
   * Which requests get the headers: those matching `patterns`, from any tab (the default), or every request from the
   * tabs picked for the group in TabSelections, whatever its URL. Never both.
   */
  target?: 'patterns' | 'tabs';
  /** Set `headers` on those requests (the default), or block them; a blocking group keeps its headers, unused. */
  action?: 'headers' | 'block';
}

/** Group id -> ids of the tabs picked for it; only used while its `target` is 'tabs'. */
export type TabSelections = Record<string, number[]>;
