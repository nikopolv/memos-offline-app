import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useShareIntent } from 'expo-share-intent';
import { AppNavigator } from './src/navigation';
import { AppIcon } from './src/components';
import { useThemeStore } from './src/stores';

export default function App() {
  const systemColorScheme = useColorScheme();
  const { mode, initialize } = useThemeStore();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const theme = isDark ? MD3DarkTheme : MD3LightTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider
        theme={theme}
        settings={{
          icon: ({ color, direction, name, size, testID }) => (
            <AppIcon
              color={color}
              direction={direction}
              name={String(name)}
              size={size}
              testID={testID}
            />
          ),
        }}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AppNavigator
          sharedIntent={hasShareIntent ? shareIntent : null}
          onSharedIntentConsumed={resetShareIntent}
        />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
