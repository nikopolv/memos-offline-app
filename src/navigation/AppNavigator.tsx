import React, { useEffect } from 'react';
import { NavigationContainer, LinkingOptions, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import type { ShareIntent } from 'expo-share-intent';

import { useAuthStore } from '../stores';
import { useNetworkStore } from '../utils/network';
import { initDatabase } from '../db';
import { AppIcon } from '../components';
import {
  LoginScreen,
  MemoListScreen,
  EditorScreen,
  SettingsScreen,
} from '../screens';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const linking: LinkingOptions<any> = {
  prefixes: ['memosoffline://'],
  config: {
    screens: {
      Main: {
        screens: {
          Memos: 'memos',
          Settings: 'settings',
        },
      },
      Editor: 'new',
    },
  },
};

const navigationRef = createNavigationContainerRef();

type AppNavigatorProps = {
  sharedIntent?: ShareIntent | null;
  onSharedIntentConsumed?: () => void;
};

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="Memos"
        component={MemoListScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="notebook" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator({
  sharedIntent = null,
  onSharedIntentConsumed,
}: AppNavigatorProps) {
  const theme = useTheme();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const { initialize: initNetwork } = useNetworkStore();

  useEffect(() => {
    async function init() {
      await initDatabase();
      await initialize();
    }
    init();

    const unsubscribeNetwork = initNetwork();
    return () => unsubscribeNetwork();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !sharedIntent || !navigationRef.isReady()) {
      return;
    }

    const sharedContent = [sharedIntent.text, sharedIntent.webUrl]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join('\n')
      .trim();

    if (!sharedContent) {
      onSharedIntentConsumed?.();
      return;
    }

    (navigationRef as any).navigate('Editor', {
      mode: 'create',
      initialContent: sharedContent,
    });

    onSharedIntentConsumed?.();
  }, [isAuthenticated, sharedIntent, onSharedIntentConsumed]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <Stack.Navigator>
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Editor"
              component={EditorScreen}
              options={({ route }) => ({
                title: (route.params as any)?.mode === 'edit' ? 'Edit Memo' : 'New Memo',
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
