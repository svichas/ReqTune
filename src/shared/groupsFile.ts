import type { Group, HeaderEntry } from './types';

const VERSION = 1;
const MAX_BYTES = 1024 * 1024;

/**
 * Groups as the file Export saves: pretty-printed `{ "reqtune": 1, "groups": [...] }`. Ids stay out, since import
 * gives every group a new one, and so do tab picks, which only last a session. Values of headers `isSecret` matches
 * are left empty.
 */
export function serializeGroups(groups: Group[], isSecret: (name: string) => boolean = () => false): string {
  const file = {
    reqtune: VERSION,
    groups: groups.map(({ name, enabled, patterns, headers, target }) => ({
      name,
      enabled,
      patterns,
      headers: headers.map((h) => ({ name: h.name, value: isSecret(h.name.trim()) ? '' : h.value })),
      target,
    })),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** `reqtune-<group-name>.json`, the name cut down to lowercase letters, digits and dashes. */
export const groupFileName = (name: string): string =>
  `reqtune-${name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'group'}.json`;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isHeader = (value: unknown): value is HeaderEntry =>
  isObject(value) && isString(value.name) && isString(value.value);

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
  const { name, enabled, patterns, headers, target } = value;
  if (!isString(name)) throw invalid('name');
  if (typeof enabled !== 'boolean') throw invalid('enabled');
  if (!Array.isArray(patterns) || !patterns.every(isString)) throw invalid('patterns');
  if (!Array.isArray(headers) || !headers.every(isHeader)) throw invalid('headers');
  if (target !== undefined && target !== 'patterns' && target !== 'tabs') throw invalid('target');
  const id = crypto.randomUUID();
  return { id, name, enabled, patterns, headers: headers.map((h) => ({ name: h.name, value: h.value })), target };
}
