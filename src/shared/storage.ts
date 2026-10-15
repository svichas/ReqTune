import type { Group } from './types';

/** Everything the extension keeps in chrome.storage.local. */
export interface StoredState {
  groups: Group[];
  /** A fresh id with every save of groups, so each open page can tell its own saves from another page's. */
  groupsSaveId?: string;
  /** Set by the background worker when Chrome rejects the rules; absent once they apply. */
  syncError?: string;
}

export async function getGroups(): Promise<Group[]> {
  const { groups } = await chrome.storage.local.get('groups');
  return (groups as Group[] | undefined) ?? [];
}

// Ids of the saves made from this page whose change events haven't come back yet.
const ownSaves = new Set<string>();

export function saveGroups(groups: Group[]): Promise<void> {
  const groupsSaveId = crypto.randomUUID();
  ownSaves.add(groupsSaveId);
  return chrome.storage.local.set({ groups, groupsSaveId });
}

/**
 * Calls `onChange` with the groups another open page (a panel in another window, or the full page) saved; returns the
 * unsubscribe function. This page's own saves only echo state it already has, possibly older than what was typed
 * since. Chrome reports changes in the order they're stored, so while one of this page's saves is still on its way it
 * will land after, and replace, the other page's: skipping that one keeps both pages on the same, final state.
 */
export function watchOtherGroupSaves(onChange: (groups: Group[]) => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    const saveId = changes.groupsSaveId?.newValue as string | undefined;
    if (area !== 'local' || saveId === undefined || ownSaves.delete(saveId)) return;
    if (changes.groups && ownSaves.size === 0) onChange((changes.groups.newValue as Group[] | undefined) ?? []);
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

/** Calls `onChange` whenever `key` changes in local storage; returns the unsubscribe function. */
export function watchKey<K extends keyof StoredState>(
  key: K,
  onChange: (value: StoredState[K] | undefined) => void,
): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && key in changes) onChange(changes[key].newValue as StoredState[K] | undefined);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
