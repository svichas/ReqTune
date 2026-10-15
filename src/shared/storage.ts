import type { Group, TabSelections } from './types';

/** Everything the extension keeps in chrome.storage.local. */
export interface StoredState {
  groups: Group[];
  /** Set by the background worker when Chrome rejects the rules; absent once they apply. */
  syncError?: string;
}

/**
 * Everything it keeps in chrome.storage.session. Tab ids only last until Chrome restarts, and so does this area, so
 * a picked tab can never come back as a different tab that reuses its id.
 */
export interface SessionState {
  tabSelections: TabSelections;
}

interface StorageAreas {
  local: StoredState;
  session: SessionState;
}

export async function getGroups(): Promise<Group[]> {
  const { groups } = await chrome.storage.local.get('groups');
  return (groups as Group[] | undefined) ?? [];
}

export function saveGroups(groups: Group[]): Promise<void> {
  return chrome.storage.local.set({ groups });
}

export async function getTabSelections(): Promise<TabSelections> {
  const { tabSelections } = await chrome.storage.session.get('tabSelections');
  return (tabSelections as TabSelections | undefined) ?? {};
}

export function saveTabSelections(tabSelections: TabSelections): Promise<void> {
  return chrome.storage.session.set({ tabSelections });
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
