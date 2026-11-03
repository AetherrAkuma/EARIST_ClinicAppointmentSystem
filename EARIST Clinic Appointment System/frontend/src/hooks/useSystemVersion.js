import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom React Hook: useSystemVersion
 * Polls /api/system/version to detect new Over-The-Air deployments.
 * When the server commit differs from the client's initial session commit,
 * signals that an update is ready and provides a cache-clearing reload function.
 */
export const useSystemVersion = (pollIntervalMs = 60000) => {
  const [initialCommit, setInitialCommit] = useState(null);
  const [latestVersion, setLatestVersion] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const initialLoadedRef = useRef(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`/api/system/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        }
      });
      if (!res.ok) return;

      const data = await res.json();
      if (!data || !data.shortHash) return;

      setLatestVersion(data);

      if (!initialLoadedRef.current) {
        setInitialCommit(data.shortHash);
        initialLoadedRef.current = true;
      } else if (initialCommit && data.shortHash !== initialCommit) {
        setUpdateAvailable(true);
      }
    } catch (err) {
      // Offline or network error - silent failure
    }
  }, [initialCommit]);

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, pollIntervalMs);

    const onFocus = () => checkVersion();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkVersion, pollIntervalMs]);

  const reloadApp = useCallback(() => {
    try {
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
    } catch (e) {
      // Ignore cache clearing errors
    }
    // Hard reload
    window.location.reload(true);
  }, []);

  const dismissUpdate = useCallback(() => {
    setIsDismissed(true);
  }, []);

  return {
    updateAvailable: updateAvailable && !isDismissed,
    latestVersion,
    initialCommit,
    reloadApp,
    dismissUpdate
  };
};
