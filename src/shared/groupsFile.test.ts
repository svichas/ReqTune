import { describe, expect, it } from 'vitest';
import { isSecretHeader } from '../ui/headers';
import { groupFileName, parseGroupsFile, serializeGroups } from './groupsFile';
import type { Group } from './types';

const groups: Group[] = [
  {
    id: 'api',
    name: 'API',
    enabled: true,
    patterns: ['*.example.com/api/*', 'localhost:3000'],
    headers: [
      { name: ' Authorization ', value: 'Bearer secret' },
      { name: 'X-Debug', value: '1' },
    ],
  },
  {
    id: 'tab',
    name: 'This tab',
    enabled: false,
    patterns: [''],
    headers: [{ name: 'X-Env', value: 'qa' }],
    target: 'tabs',
  },
];

const file = (data: unknown) => new Blob([typeof data === 'string' ? data : JSON.stringify(data)]);
const withoutIds = (list: Group[]) => list.map(({ id, ...rest }) => rest);
const valid = { name: 'G', enabled: true, patterns: ['a.com'], headers: [{ name: 'X-A', value: '1' }] };

describe('serializeGroups', () => {
  it('writes pretty-printed JSON of the known fields only: no ids, tab picks or leftovers', () => {
    const legacy = { ...groups[1], limitToTabs: true } as Group;
    const text = serializeGroups([legacy]);
    expect(text).toMatch(/^{\n {2}"reqtune": 1,\n {2}"groups": \[\n/);
    expect(JSON.parse(text)).toEqual({
      reqtune: 1,
      groups: [{ name: 'This tab', enabled: false, patterns: [''], headers: [{ name: 'X-Env', value: 'qa' }], target: 'tabs' }],
    });
  });

  it('leaves secret values empty when given a secret test', () => {
    const [api] = JSON.parse(serializeGroups(groups, isSecretHeader)).groups;
    expect(api.headers).toEqual([
      { name: ' Authorization ', value: '' },
      { name: 'X-Debug', value: '1' },
    ]);
    expect(serializeGroups(groups)).toContain('Bearer secret');
  });
});

describe('parseGroupsFile', () => {
  it('reads back what serializeGroups wrote, with fresh ids', async () => {
    const imported = await parseGroupsFile(file(serializeGroups(groups)));
    expect(withoutIds(imported)).toEqual(withoutIds(groups));
    const ids = imported.map((g) => g.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids).not.toContain('api');
  });

  it('keeps only the fields ReqTune knows', async () => {
    const [group] = await parseGroupsFile(
      file({
        reqtune: 1,
        groups: [{ ...valid, id: 'old', limitToTabs: true, headers: [{ name: 'X-A', value: '1', note: 'x' }], extra: {} }],
      }),
    );
    expect(group).toEqual({ ...valid, id: group.id });
    expect(group.id).not.toBe('old');
  });

  const padded = JSON.stringify({ reqtune: 1, groups: [valid] }) + ' '.repeat(1024 * 1024);
  const withGroup = (patch: object) => file({ reqtune: 1, groups: [valid, { ...valid, ...patch }] });

  it.each<[string, Blob, string]>([
    ['a file over 1 MB, even valid JSON', new Blob([padded]), 'over 1 MB'],
    ['invalid JSON', file('{"reqtune": 1,'), "isn't valid JSON"],
    ['JSON that is not an object', file([valid]), "isn't a ReqTune export"],
    ['a missing version', file({ groups: [valid] }), "isn't a ReqTune export"],
    ['an unknown version', file({ reqtune: '1', groups: [valid] }), "isn't a ReqTune export"],
    ['a newer version', file({ reqtune: 2, groups: [valid] }), 'newer version'],
    ['no groups list', file({ reqtune: 1, groups: { 0: valid } }), 'no "groups" list'],
    ['an empty groups list', file({ reqtune: 1, groups: [] }), 'no groups'],
    ['a group that is not an object', file({ reqtune: 1, groups: [valid, 'G'] }), "Group 2 in the file isn't valid"],
    ['a name that is not text', withGroup({ name: 1 }), 'Group 2 in the file has an invalid "name"'],
    ['a missing enabled', withGroup({ enabled: undefined }), 'invalid "enabled"'],
    ['patterns that are not text', withGroup({ patterns: ['a.com', null] }), 'invalid "patterns"'],
    ['headers that are not a list', withGroup({ headers: { name: 'X-A', value: '1' } }), 'invalid "headers"'],
    ['a header without a value', withGroup({ headers: [{ name: 'X-A' }] }), 'invalid "headers"'],
    ['an unknown target', withGroup({ target: 'everything' }), 'invalid "target"'],
  ])('rejects %s', async (_, blob, message) => {
    await expect(parseGroupsFile(blob)).rejects.toThrow(message);
  });
});

describe('groupFileName', () => {
  it.each([
    ['Staging API', 'reqtune-staging-api.json'],
    [' a/b: c* ', 'reqtune-a-b-c.json'],
    ['Δοκιμή 2', 'reqtune-δοκιμή-2.json'],
    ['', 'reqtune-group.json'],
    ['***', 'reqtune-group.json'],
  ])('%j -> %s', (name, fileName) => expect(groupFileName(name)).toBe(fileName));
});
