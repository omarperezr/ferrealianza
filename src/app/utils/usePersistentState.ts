import { useEffect, useState } from 'react';

/**
 * Like useState, but persists the value in localStorage under `key` so it
 * survives page reloads and new sessions on the same device. Used to remember
 * the user's chosen "order by" and filters between visits.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch {
      /* ignore corrupt/unavailable storage */
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: ignore */
    }
  }, [key, value]);

  return [value, setValue];
}
