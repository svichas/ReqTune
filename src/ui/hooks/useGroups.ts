import { useEffect, useState } from 'react';
import { getGroups, getTabSelections, saveGroups, saveTabSelections } from '../../shared/storage';
import type { Group, TabSelections } from '../../shared/types';

// shortcut: two open panels don't live-sync; subscribe via watchKey with a write-echo guard if that's ever needed
export function useGroups() {
  const [groups, setGroupsState] = useState<Group[]>([]);
  const [tabSelections, setTabSelectionsState] = useState<TabSelections>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([getGroups(), getTabSelections()]).then(([storedGroups, storedSelections]) => {
      setGroupsState(storedGroups);
      setTabSelectionsState(storedSelections);
      setLoading(false);
    });
  }, []);

  const setGroups = (next: Group[]) => {
    setGroupsState(next);
    void saveGroups(next);
  };

  const setTabSelections = (next: TabSelections) => {
    setTabSelectionsState(next);
    void saveTabSelections(next);
  };

  return { groups, setGroups, tabSelections, setTabSelections, loading };
}
