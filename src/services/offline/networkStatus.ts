import { useState, useEffect } from 'react';
import { syncManager } from './syncManager';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      syncManager.syncAll();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        syncManager.syncAll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return isOnline;
}
