import { useEffect, useState } from 'react';
import { getSyncError, watchKey } from '../../shared/storage';

/** The background worker's last "Chrome rejected the rules" message, or undefined once the rules apply. */
export function useSyncError(): string | undefined {
  const [error, setError] = useState<string>();

  useEffect(() => {
    const unwatch = watchKey('local', 'syncError', setError);
    void getSyncError().then(setError);
    return unwatch;
  }, []);

  return error;
}
