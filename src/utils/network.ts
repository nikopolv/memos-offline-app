import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  
  // Actions
  initialize: () => () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: true,
  isInternetReachable: null,
  connectionType: null,

  initialize: () => {
    // Get initial state
    NetInfo.fetch().then((state) => {
      set({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      set({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });
    });

    return unsubscribe;
  },
}));

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * Wait for network to become available
 */
export function waitForNetwork(timeoutMs = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    let subscription: NetInfoSubscription | null = null;
    
    const timeout = setTimeout(() => {
      subscription?.();
      resolve(false);
    }, timeoutMs);

    subscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        clearTimeout(timeout);
        subscription?.();
        resolve(true);
      }
    });

    // Check immediately
    NetInfo.fetch().then((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        clearTimeout(timeout);
        subscription?.();
        resolve(true);
      }
    });
  });
}
