import { useEffect, useState } from 'react';
import { getPaused, setPaused as savePaused, watchKey } from '../../shared/storage';

/** Whether every group is paused at once, kept in step with the shortcut and every other open page. */
export function usePaused() {
  const [paused, setPausedState] = useState(false);

  useEffect(() => {
    const unwatch = watchKey('local', 'paused', (stored) => setPausedState(stored === true));
    void getPaused().then(setPausedState);
    return unwatch;
  }, []);

  const setPaused = (next: boolean) => {
    setPausedState(next);
    void savePaused(next);
  };

  return [paused, setPaused] as const;
}
