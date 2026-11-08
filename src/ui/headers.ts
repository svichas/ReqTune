/** Request headers people commonly set; offered as suggestions in the header name field. */
export const COMMON_HEADERS = [
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Content-Type',
  'Cookie',
  'DNT',
  'Forwarded',
  'If-Modified-Since',
  'If-None-Match',
  'Origin',
  'Pragma',
  'Proxy-Authorization',
  'Range',
  'Referer',
  'Save-Data',
  'Sec-GPC',
  'traceparent',
  'tracestate',
  'Upgrade-Insecure-Requests',
  'User-Agent',
  'X-API-Key',
  'X-Correlation-ID',
  'X-CSRF-Token',
  'X-Forwarded-For',
  'X-Forwarded-Host',
  'X-Forwarded-Proto',
  'X-Real-IP',
  'X-Request-ID',
  'X-Requested-With',
];

// Picked in November 2026, in the reduced forms browsers send today.
const USER_AGENTS = [
  {
    label: 'Chrome on Windows',
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
  },
  {
    label: 'Chrome on macOS',
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
  },
  {
    label: 'Safari on iPhone',
    value:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1',
  },
  {
    label: 'Chrome on Android',
    value: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Mobile Safari/537.36',
  },
  {
    label: 'Firefox on Windows',
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:159.0) Gecko/20100101 Firefox/159.0',
  },
  {
    label: 'Googlebot (smartphone)',
    value:
      'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.39 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
  {
    label: 'Bingbot',
    value:
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
  },
  { label: 'curl', value: 'curl/8.23.0' },
];

/** Ready-made values the value field offers for a header, by name in any case; only User-Agent has any. */
export const valuePresets = (name: string) => (name.toLowerCase() === 'user-agent' ? USER_AGENTS : []);

// Names whose values usually carry credentials. A bare `key` must be a whole name part, so X-Monkey stays visible.
const SECRET = /auth|token|secret|passw|cookie|session|credential|api-?key|signature|jwt|bearer|csrf|xsrf|(^|[-_])key([-_]|$)/i;

/** Whether a header's value stays hidden until the user reveals it. */
export const isSecretHeader = (name: string): boolean => SECRET.test(name);
