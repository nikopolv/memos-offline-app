import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeClient, MemosClient } from '../api';

const STORAGE_KEYS = {
  SERVER_URL: 'memos_server_url',
  TOKEN: 'memos_token',
};

interface AuthState {
  serverUrl: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  client: MemosClient | null;

  // Actions
  initialize: () => Promise<void>;
  login: (serverUrl: string, token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  serverUrl: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  client: null,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      const serverUrl = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);

      if (serverUrl && token) {
        const client = initializeClient({ baseUrl: serverUrl, token });
        const isValid = await client.testConnection();

        if (isValid) {
          set({
            serverUrl,
            token,
            isAuthenticated: true,
            client,
            isLoading: false,
          });
          return;
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false, error: 'Failed to initialize auth' });
    }
  },

  login: async (serverUrl: string, token: string) => {
    try {
      set({ isLoading: true, error: null });

      // Normalize URL
      const trimmedUrl = serverUrl.trim();
      const urlWithProtocol = /^https?:\/\//i.test(trimmedUrl)
        ? trimmedUrl
        : `https://${trimmedUrl}`;
      const normalizedUrl = urlWithProtocol.replace(/\/+$/, '');

      // Test connection
      const client = initializeClient({ baseUrl: normalizedUrl, token });
      const isValid = await client.testConnection();

      if (!isValid) {
        set({ isLoading: false, error: 'Invalid server URL or token' });
        return false;
      }

      // Save credentials
      await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, normalizedUrl);
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);

      set({
        serverUrl: normalizedUrl,
        token,
        isAuthenticated: true,
        client,
        isLoading: false,
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SERVER_URL);
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);

      set({
        serverUrl: null,
        token: null,
        isAuthenticated: false,
        client: null,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
