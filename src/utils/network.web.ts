// Web-compatible network detection
import { create } from 'zustand';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  
  initialize: () => () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isInternetReachable: null,
  connectionType: null,

  initialize: () => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const handleOnline = () => {
      set({ isConnected: true, isInternetReachable: true });
    };

    const handleOffline = () => {
      set({ isConnected: false, isInternetReachable: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    set({ 
      isConnected: navigator.onLine,
      isInternetReachable: navigator.onLine 
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
}));

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Wait for network to become available
 */
export function waitForNetwork(timeoutMs = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || navigator.onLine) {
      resolve(true);
      return;
    }

    const timeout = setTimeout(() => {
      window.removeEventListener('online', handleOnline);
      resolve(false);
    }, timeoutMs);

    const handleOnline = () => {
      clearTimeout(timeout);
      window.removeEventListener('online', handleOnline);
      resolve(true);
    };

    window.addEventListener('online', handleOnline);
  });
}
