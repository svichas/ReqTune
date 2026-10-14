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
}
