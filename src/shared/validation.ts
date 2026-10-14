// Chrome rejects the whole rule update if one header name isn't an RFC 9110 token or a value holds NUL/CR/LF.
const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

/** Expects an already-trimmed name. */
export const isValidHeaderName = (name: string): boolean => TOKEN.test(name);

export const isValidHeaderValue = (value: string): boolean => !/[\0\r\n]/.test(value);
