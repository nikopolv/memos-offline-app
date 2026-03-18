import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'memos_theme_mode';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  isLoading: boolean;
  initialize: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  isLoading: true,

  initialize: async () => {
    try {
      const storedMode = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedMode === 'system' || storedMode === 'light' || storedMode === 'dark') {
        set({ mode: storedMode, isLoading: false });
        return;
      }
    } catch (error) {
      console.error('Theme initialization error:', error);
    }

    set({ isLoading: false });
  },

  setMode: async (mode: ThemeMode) => {
    set({ mode });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.error('Theme persistence error:', error);
    }
  },
}));
