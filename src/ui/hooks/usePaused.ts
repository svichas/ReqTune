import { useEffect, useState } from 'react';
import { getPaused, watchKey } from '../../shared/storage';

/** Whether every group is paused at once, kept in step with the shortcut and every other open page. */
export function usePaused(): boolean {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const unwatch = watchKey('local', 'paused', (stored) => setPaused(stored === true));
    void getPaused().then(setPaused);
    return unwatch;
  }, []);

  return paused;
}
