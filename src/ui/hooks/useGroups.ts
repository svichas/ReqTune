import { useEffect, useState } from 'react';
import { getGroups, saveGroups } from '../../shared/storage';
import type { Group } from '../../shared/types';

// shortcut: two open panels don't live-sync; subscribe via watchKey with a write-echo guard if that's ever needed
export function useGroups() {
  const [groups, setGroupsState] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getGroups().then((stored) => {
      setGroupsState(stored);
      setLoading(false);
    });
  }, []);

  const setGroups = (next: Group[]) => {
    setGroupsState(next);
    void saveGroups(next);
  };

  return { groups, setGroups, loading };
}
