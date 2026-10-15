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
  /** Apply only to requests from the tabs picked for this group in TabSelections; otherwise from anywhere. */
  limitToTabs?: boolean;
}

/** Group id -> ids of the tabs it is limited to. Only meaningful for groups with `limitToTabs`. */
export type TabSelections = Record<string, number[]>;
