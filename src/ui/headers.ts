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

/** Response headers people commonly set; offered as suggestions in the response header name field. */
export const COMMON_RESPONSE_HEADERS = [
  'Access-Control-Allow-Origin',
  'Access-Control-Allow-Methods',
  'Access-Control-Allow-Headers',
  'Access-Control-Allow-Credentials',
  'Access-Control-Expose-Headers',
  'Cache-Control',
  'Content-Security-Policy',
  'Content-Type',
  'Cross-Origin-Resource-Policy',
  'Permissions-Policy',
  'Referrer-Policy',
  'Set-Cookie',
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'X-Frame-Options',
];

// Names whose values usually carry credentials. A bare `key` must be a whole name part, so X-Monkey stays visible.
const SECRET = /auth|token|secret|passw|cookie|session|credential|api-?key|signature|jwt|bearer|csrf|xsrf|(^|[-_])key([-_]|$)/i;

/** Whether a header's value stays hidden until the user reveals it. */
export const isSecretHeader = (name: string): boolean => SECRET.test(name);
