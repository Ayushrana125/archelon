import { useCallback } from 'react';

// Global cache — persists across re-renders, cleared on page refresh
const globalCache = {};

export function useCache() {

  const get = useCallback((key) => {
    return globalCache[key] ?? null;
  }, []);

  const set = useCallback((key, data) => {
    globalCache[key] = data;
  }, []);

  const invalidate = useCallback((key) => {
    delete globalCache[key];
  }, []);

  const invalidatePrefix = useCallback((prefix) => {
    Object.keys(globalCache).forEach(k => {
      if (k.startsWith(prefix)) delete globalCache[k];
    });
  }, []);

  return { get, set, invalidate, invalidatePrefix };
}
