import { useEffect, useState } from 'react';
import { getGroups, saveGroups, watchOtherGroupSaves } from '../../shared/storage';
import type { Group } from '../../shared/types';

/** The stored groups, kept in step with any other open panel or full page. */
export function useGroups() {
  const [groups, setGroupsState] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unwatch = watchOtherGroupSaves(setGroupsState);
    void getGroups().then((stored) => {
      setGroupsState(stored);
      setLoading(false);
    });
    return unwatch;
  }, []);

  const setGroups = (next: Group[]) => {
    setGroupsState(next);
    void saveGroups(next);
  };

  return { groups, setGroups, loading };
}
