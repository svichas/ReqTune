import type { Group, TabSelections } from './types';

/** Everything the extension keeps in chrome.storage.local. */
export interface StoredState {
  groups: Group[];
  /** A fresh id with every save of groups, so each open page can tell its own saves from another page's. */
  groupsSaveId?: string;
  /** Set by the background worker when Chrome rejects the rules; absent once they apply. */
  syncError?: string;
}

/**
 * Everything it keeps in chrome.storage.session. Tab ids only last until Chrome restarts, and so does this area, so
 * a picked tab can never come back as a different tab that reuses its id.
 */
export interface SessionState {
  tabSelections: TabSelections;
  /** A fresh id with every save of tab selections, like `groupsSaveId`. */
  tabSelectionsSaveId?: string;
}

interface StorageAreas {
  local: StoredState;
  session: SessionState;
}

export async function getGroups(): Promise<Group[]> {
  const { groups } = await chrome.storage.local.get('groups');
  return (groups as Group[] | undefined) ?? [];
}

export async function getTabSelections(): Promise<TabSelections> {
  const { tabSelections } = await chrome.storage.session.get('tabSelections');
  return (tabSelections as TabSelections | undefined) ?? {};
}

/** What every open page (the side panel in each window, the full page) edits and keeps in step, and its storage area. */
const SHARED = { groups: 'local', tabSelections: 'session' } as const;
type SharedKey = keyof typeof SHARED;
type Shared = Pick<StoredState, 'groups'> & Pick<SessionState, 'tabSelections'>;

// Per value, ids of the saves made from this page whose change events haven't come back yet.
const ownSaves: Record<SharedKey, Set<string>> = { groups: new Set(), tabSelections: new Set() };

/** Stores the value with a fresh `<key>SaveId` beside it, so each page can tell its own saves from another page's. */
function saveShared<K extends SharedKey>(key: K, value: Shared[K]): Promise<void> {
  const saveId = crypto.randomUUID();
  ownSaves[key].add(saveId);
  return chrome.storage[SHARED[key]].set({ [key]: value, [`${key}SaveId`]: saveId });
}

export const saveGroups = (groups: Group[]) => saveShared('groups', groups);
export const saveTabSelections = (tabSelections: TabSelections) => saveShared('tabSelections', tabSelections);

/**
 * Calls `onChange` with the value another open page saved; returns the unsubscribe function. This page's own saves
 * only echo state it already has, possibly older than what was typed since. Chrome reports changes in the order
 * they're stored, so while one of this page's saves is still on its way it will land after, and replace, the other
 * page's: skipping that one keeps both pages on the same, final state.
 */
export function watchOtherSaves<K extends SharedKey>(
  key: K,
  onChange: (value: Shared[K] | undefined) => void,
): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    const saveId = changes[`${key}SaveId`]?.newValue as string | undefined;
    if (area !== SHARED[key] || saveId === undefined || ownSaves[key].delete(saveId)) return;
    if (key in changes && ownSaves[key].size === 0) onChange(changes[key].newValue as Shared[K] | undefined);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export async function getSyncError(): Promise<string | undefined> {
  const { syncError } = await chrome.storage.local.get('syncError');
  return syncError as string | undefined;
}

export function setSyncError(message?: string): Promise<void> {
  return message ? chrome.storage.local.set({ syncError: message }) : chrome.storage.local.remove('syncError');
}

/** Calls `onChange` whenever `key` changes in the `area` storage area; returns the unsubscribe function. */
export function watchKey<A extends keyof StorageAreas, K extends keyof StorageAreas[A] & string>(
  area: A,
  key: K,
  onChange: (value: StorageAreas[A][K] | undefined) => void,
): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName === area && key in changes) onChange(changes[key].newValue as StorageAreas[A][K] | undefined);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
