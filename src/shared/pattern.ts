// A host wildcard never crosses into the userinfo, path, query or fragment.
const HOST_STAR = '[^/?#@]*';

/** Escapes regex metacharacters, then expands each `*` into `star`. */
const toRegex = (text: string, star: string) => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', star);

/** Whether a pattern is `regex:` and a raw regex rather than wildcard syntax. */
export const isRegexPattern = (pattern: string) => pattern.trim().startsWith('regex:');

/** A `regex:` pattern's regex, or null when it's empty or Chrome would surely refuse it. */
function rawRegex(source: string): string | null {
  // Chrome needs ASCII, and RE2 has no lookarounds or backreferences. Other escapes are dropped before looking, so a
  // literal `\(?=` or `\\1` passes; the worker's isRegexSupported check catches whatever else RE2 rejects.
  if (!source || /[^\x00-\x7f]/.test(source) || /\(\?<?[=!]|\\[1-9]/.test(source.replace(/\\[^1-9]/g, ''))) return null;
  try {
    new RegExp(source);
    return source;
  } catch {
    return null;
  }
}

/**
 * Converts a user URL pattern into an RE2 regex for a declarativeNetRequest `regexFilter`.
 * Returns null when the pattern is empty or invalid.
 *
 * Syntax: `[scheme://]host[:port][/path]`, anchored at the start of the URL
 * - `*` is a wildcard: inside the host it never crosses `/`; inside the path it matches anything.
 * - A leading `*.` also matches the bare domain: `*.example.com` covers example.com and every subdomain.
 * - Scheme is optional and must be http, https, ws, wss or `*`; omitted or `*://` means any of them.
 * - Port is optional: omitted or `:*` means any port.
 * - Path is optional: omitted means every path. A given path must match in full; the query string
 *   is ignored unless the pattern itself contains `?`.
 * - A path-only pattern (`/api/*`) matches on any host.
 * - Surrounding whitespace is ignored; whitespace inside makes the pattern invalid.
 * Examples: `example.com`, `*.example.com/api/*`, `localhost:3000`, `https://api.example.com/v1/*`, `/graphql`.
 *
 * Or `regex:` and a raw regex, passed on as written after the prefix, trimmed, and anchored only where it says so:
 * `regex:^https://(api|admin)\.example\.com/v[0-9]+/`.
 */
export function patternToRegex(input: string): string | null {
  const pattern = input.trim();
  if (isRegexPattern(pattern)) return rawRegex(pattern.slice('regex:'.length).trim());
  // Besides inner whitespace, reject non-ASCII: Chrome refuses a regexFilter that isn't ASCII.
  if (/[^\x21-\x7e]/.test(pattern)) return null;
  const match = /^(?:(\*|https?|wss?):\/\/)?([^/?#:@]*)(?::(\*|\d+))?(\/.*)?$/i.exec(pattern);
  // Only a path-only pattern may omit the host.
  if (!match || (!match[2] && pattern[0] !== '/')) return null;
  const [, scheme = '*', host, port = '*', path] = match;

  const schemeRe = scheme === '*' ? '(https?|wss?)' : scheme;
  const hostRe = host.startsWith('*.')
    ? `(${HOST_STAR}\\.)?${toRegex(host.slice(2), HOST_STAR)}`
    : toRegex(host || '*', HOST_STAR);
  const portRe = port === '*' ? '(:\\d+)?' : `:${port}`;
  // Whatever follows must start a new URL part, so `example.com` can't match `example.com.evil.com`
  // nor `/api` match `/apix`; a pattern with `?` must match the query in full too.
  const restRe = path ? toRegex(path, '.*') + (path.includes('?') ? '(#|$)' : '([?#]|$)') : '([/?#]|$)';
  return `^${schemeRe}://${hostRe}${portRe}${restRe}`;
}
