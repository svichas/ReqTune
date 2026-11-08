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
  {
    id: 'all',
    name: 'Every field',
    enabled: true,
    patterns: ['regex:^https://(api|admin)\\.example\\.com/v[0-9]+/'],
    headers: [
      { name: 'Accept-Language', value: 'el', operation: 'append' },
      { name: 'X-Old', value: 'kept', operation: 'remove', enabled: false },
      { name: 'X-New', value: '1', operation: 'set', enabled: true },
    ],
    responseHeaders: [{ name: 'Access-Control-Allow-Origin', value: '*' }],
    action: 'block',
    resourceTypes: ['xmlhttprequest', 'main_frame'],
    requestMethods: ['post'],
  },
];

const file = (data: unknown) => new Blob([typeof data === 'string' ? data : JSON.stringify(data)]);
const withoutIds = (list: Group[]) => list.map(({ id, ...rest }) => rest);
const valid = { name: 'G', enabled: true, patterns: ['a.com'], headers: [{ name: 'X-A', value: '1' }] };
const [header] = valid.headers;

describe('serializeGroups', () => {
  it('writes every field a group sets but its id, as stored', () => {
    expect(JSON.parse(serializeGroups(groups, () => false)).groups).toEqual(withoutIds(groups));
  });

  it('writes pretty-printed JSON of the known fields only: no ids, tab picks or leftovers', () => {
    const legacy = { ...groups[1], limitToTabs: true } as Group;
    const text = serializeGroups([legacy], () => false);
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
    expect(serializeGroups(groups, () => false)).toContain('Bearer secret');
  });

  it('saves a group switched off once it loses a value, and only then', () => {
    const blank = { ...groups[0], headers: [{ name: 'Authorization', value: '' }] };
    const [lost, kept] = JSON.parse(serializeGroups([groups[0], blank], isSecretHeader)).groups;
    expect(lost.enabled).toBe(false);
    expect(kept.enabled).toBe(true);
  });

  it.each<[string, Partial<Group>, boolean]>([
    ['a response header', { headers: [], responseHeaders: [{ name: 'Set-Cookie', value: 'id=1' }] }, false],
    ['a header that is off', { headers: [{ name: 'Cookie', value: 'id=1', enabled: false }] }, true],
    ['a Remove row', { headers: [{ name: 'Cookie', value: 'id=1', operation: 'remove' }] }, true],
    ['a blocking group', { headers: [{ name: 'Cookie', value: 'id=1' }], action: 'block' }, true],
  ])('leaves out the secret value of %s, and switches its group off only if it sends it', (_, patch, on) => {
    const text = serializeGroups([{ ...groups[0], ...patch }], isSecretHeader);
    expect(text).not.toContain('id=1');
    expect(JSON.parse(text).groups[0].enabled).toBe(on);
  });
});

describe('parseGroupsFile', () => {
  it('reads back what serializeGroups wrote, with fresh ids', async () => {
    const imported = await parseGroupsFile(file(serializeGroups(groups, () => false)));
    expect(withoutIds(imported)).toEqual(withoutIds(groups));
    const ids = imported.map((g) => g.id);
    expect(new Set(ids).size).toBe(groups.length);
    expect(ids).not.toContain('api');
  });

  it('keeps only the fields ReqTune knows', async () => {
    const [group] = await parseGroupsFile(
      file({
        reqtune: 1,
        groups: [
          {
            ...valid,
            id: 'old',
            limitToTabs: true,
            headers: [{ ...header, note: 'x' }],
            responseHeaders: [{ ...header, enabled: false, note: 'x' }],
            extra: {},
          },
        ],
      }),
    );
    expect(group).toEqual({ ...valid, id: group.id, responseHeaders: [{ ...header, enabled: false }] });
    expect(group.id).not.toBe('old');
  });

  const padded = JSON.stringify({ reqtune: 1, groups: [valid] }) + ' '.repeat(1024 * 1024);
  const withGroup = (patch: object) => file({ reqtune: 1, groups: [valid, { ...valid, ...patch }] });

  it("keeps filter values Chrome doesn't know, which the worker skips", async () => {
    const filters = { resourceTypes: ['script', 'not_a_type'], requestMethods: ['POST'] };
    const [, group] = await parseGroupsFile(withGroup(filters));
    expect(group).toMatchObject(filters);
  });

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
    ['an unknown header operation', withGroup({ headers: [{ ...header, operation: 'prepend' }] }), 'invalid "headers"'],
    ['a header switch that is not a boolean', withGroup({ headers: [{ ...header, enabled: 0 }] }), 'invalid "headers"'],
    ['response headers that are not a list', withGroup({ responseHeaders: header }), 'invalid "responseHeaders"'],
    [
      'an unknown response header operation',
      withGroup({ responseHeaders: [{ ...header, operation: 'delete' }] }),
      'invalid "responseHeaders"',
    ],
    ['an unknown target', withGroup({ target: 'everything' }), 'invalid "target"'],
    ['an unknown action', withGroup({ action: 'redirect' }), 'invalid "action"'],
    ['resource types that are not text', withGroup({ resourceTypes: ['script', 1] }), 'invalid "resourceTypes"'],
    ['request methods that are not a list', withGroup({ requestMethods: 'post' }), 'invalid "requestMethods"'],
  ])('rejects %s', async (_, blob, message) => {
    await expect(parseGroupsFile(blob)).rejects.toThrow(message);
  });
});

describe('groupFileName', () => {
  it.each([
    ['Staging API', 'reqtune-staging-api.json'],
    [' a/b: c* ', 'reqtune-a-b-c.json'],
    ['Δοκιμή 2', 'reqtune-δοκιμή-2.json'],
    ['परीक्षण API', 'reqtune-परीक्षण-api.json'],
    ['', 'reqtune-group.json'],
    ['***', 'reqtune-group.json'],
  ])('%j -> %s', (name, fileName) => expect(groupFileName(name)).toBe(fileName));
});
