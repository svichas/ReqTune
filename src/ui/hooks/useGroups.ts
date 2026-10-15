import { useEffect, useState } from 'react';
import { getGroups, getTabSelections, saveGroups, saveTabSelections, watchOtherSaves } from '../../shared/storage';
import type { Group, TabSelections } from '../../shared/types';

/** The stored groups and tab selections, kept in step with any other open panel or full page. */
export function useGroups() {
  const [groups, setGroupsState] = useState<Group[]>([]);
  const [tabSelections, setTabSelectionsState] = useState<TabSelections>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unwatch = [
      watchOtherSaves('groups', (stored) => setGroupsState(stored ?? [])),
      watchOtherSaves('tabSelections', (stored) => setTabSelectionsState(stored ?? {})),
    ];
    void Promise.all([getGroups(), getTabSelections()]).then(([storedGroups, storedSelections]) => {
      setGroupsState(storedGroups);
      setTabSelectionsState(storedSelections);
      setLoading(false);
    });
    return () => unwatch.forEach((stop) => stop());
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
