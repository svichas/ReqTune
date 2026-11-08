import type { Group, HeaderEntry } from './types';

const VERSION = 1;
const MAX_BYTES = 1024 * 1024;

const copyHeaders = (headers: HeaderEntry[]) =>
  headers.map(({ name, value, operation, enabled }) => ({ name, value, operation, enabled }));

/**
 * Groups as the file Export saves: pretty-printed `{ "reqtune": 1, "groups": [...] }`, each as it's stored. Ids stay
 * out, since import gives every group a new one, and so do tab picks, which only last a session. Values of request
 * and response headers `isSecret` matches are left empty, and a group that sends one is saved switched off.
 */
export function serializeGroups(groups: Group[], isSecret: (name: string) => boolean): string {
  const secret = (h: HeaderEntry) => isSecret(h.name.trim());
  const strip = (headers: HeaderEntry[]) => copyHeaders(headers).map((h) => (secret(h) ? { ...h, value: '' } : h));
  // Chrome would still send the emptied value, in place of the importer's own cookie or token. A row that's off or
  // removes its header sends none, and a blocking group sends no headers at all.
  const sendsSecret = (group: Group) =>
    group.action !== 'block' &&
    [...group.headers, ...(group.responseHeaders ?? [])].some(
      (h) => h.enabled !== false && h.operation !== 'remove' && h.value !== '' && secret(h),
    );
  const file = {
    reqtune: VERSION,
    groups: groups.map((group) => ({
      name: group.name,
      enabled: group.enabled && !sendsSecret(group),
      patterns: group.patterns,
      headers: strip(group.headers),
      responseHeaders: group.responseHeaders && strip(group.responseHeaders),
      target: group.target,
      action: group.action,
      resourceTypes: group.resourceTypes,
      requestMethods: group.requestMethods,
    })),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/**
 * `reqtune-<group-name>.json`, the name cut down to lowercase letters, digits and dashes. Letters keep their marks
 * (accents, vowel signs), or 'परीक्षण' would come apart.
 */
export const groupFileName = (name: string): string =>
  `reqtune-${name.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'group'}.json`;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
// Absent means set. The worker skips a row with any other operation, which the panel would show as Set.
const OPERATIONS: unknown[] = [undefined, 'set', 'append', 'remove'];
const isHeader = (value: unknown): value is HeaderEntry =>
  isObject(value) &&
  isString(value.name) &&
  isString(value.value) &&
  OPERATIONS.includes(value.operation) &&
  (value.enabled === undefined || typeof value.enabled === 'boolean');
const isHeaders = (value: unknown): value is HeaderEntry[] => Array.isArray(value) && value.every(isHeader);

/**
 * The groups in a file Export saved, each with a fresh id and only the fields ReqTune knows. The file comes from
 * anywhere, so anything else is refused with an Error whose message says why.
 */
export async function parseGroupsFile(file: Blob): Promise<Group[]> {
  if (file.size > MAX_BYTES) throw new Error('The file is over 1 MB, too big to be a ReqTune export.');
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("The file isn't valid JSON.");
  }
  const version = isObject(data) ? data.reqtune : undefined;
  if (typeof version === 'number' && version > VERSION) {
    throw new Error('The file comes from a newer version of ReqTune. Update ReqTune to import it.');
  }
  if (!isObject(data) || version !== VERSION) throw new Error("The file isn't a ReqTune export.");
  if (!Array.isArray(data.groups)) throw new Error('The file has no "groups" list.');
  if (!data.groups.length) throw new Error('The file has no groups to import.');
  return data.groups.map(toGroup);
}

function toGroup(value: unknown, i: number): Group {
  const invalid = (field: string) => new Error(`Group ${i + 1} in the file has an invalid "${field}".`);
  if (!isObject(value)) throw new Error(`Group ${i + 1} in the file isn't valid.`);
  const { name, enabled, patterns, headers, responseHeaders, target, action, resourceTypes, requestMethods } = value;
  if (!isString(name)) throw invalid('name');
  if (typeof enabled !== 'boolean') throw invalid('enabled');
  if (!isStrings(patterns)) throw invalid('patterns');
  if (!isHeaders(headers)) throw invalid('headers');
  if (responseHeaders !== undefined && !isHeaders(responseHeaders)) throw invalid('responseHeaders');
  if (target !== undefined && target !== 'patterns' && target !== 'tabs') throw invalid('target');
  if (action !== undefined && action !== 'headers' && action !== 'block') throw invalid('action');
  // Any text will do: the worker already drops values Chrome doesn't know.
  if (resourceTypes !== undefined && !isStrings(resourceTypes)) throw invalid('resourceTypes');
  if (requestMethods !== undefined && !isStrings(requestMethods)) throw invalid('requestMethods');
  const id = crypto.randomUUID();
  return {
    id,
    name,
    enabled,
    patterns,
    headers: copyHeaders(headers),
    responseHeaders: responseHeaders && copyHeaders(responseHeaders),
    target,
    action,
    resourceTypes,
    requestMethods,
  };
}
