import type { Group } from './types';

/** Everything the extension keeps in chrome.storage.local. */
export interface StoredState {
  groups: Group[];
  /** Set by the background worker when Chrome rejects the rules; absent once they apply. */
  syncError?: string;
}

export async function getGroups(): Promise<Group[]> {
  const { groups } = await chrome.storage.local.get('groups');
  return (groups as Group[] | undefined) ?? [];
}

export function saveGroups(groups: Group[]): Promise<void> {
  return chrome.storage.local.set({ groups });
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
