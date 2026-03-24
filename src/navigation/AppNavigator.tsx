import React, { useEffect } from 'react';
import {
  NavigationContainer,
  LinkingOptions,
  createNavigationContainerRef,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import type { ShareIntent } from 'expo-share-intent';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

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

function EmptyScreen() {
  return null;
}

function CreateTabButton({
  accessibilityState,
  onPress,
}: {
  accessibilityState?: { selected?: boolean };
  onPress?: () => void;
}) {
  const theme = useTheme();
  const isSelected = accessibilityState?.selected ?? false;

  return (
    <Pressable
      accessibilityLabel="Create memo"
      accessibilityRole="button"
      onPress={onPress}
      style={styles.createTabPressable}
    >
      <View
        style={[
          styles.createTabButton,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.shadow,
          },
          isSelected ? styles.createTabButtonSelected : undefined,
        ]}
      >
        <AppIcon name="plus" size={24} color={theme.colors.onPrimary} />
      </View>
      <Text style={[styles.createTabLabel, { color: theme.colors.onSurfaceVariant }]}>New</Text>
    </Pressable>
  );
}

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          minHeight: 56,
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.elevation.level2,
          borderTopColor: theme.colors.outlineVariant,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 6,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
          height: 52,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontSize: 18,
          fontWeight: '700',
        },
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
        name="CreateMemo"
        component={EmptyScreen}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.navigate('Editor', { mode: 'create' });
          },
        })}
        options={{
          title: 'New',
          headerShown: false,
          tabBarButton: (props) => (
            <CreateTabButton
              accessibilityState={props.accessibilityState}
              onPress={props.onPress}
            />
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

const styles = StyleSheet.create({
  createTabPressable: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginTop: -10,
  },
  createTabButton: {
    alignItems: 'center',
    borderRadius: 24,
    elevation: 4,
    height: 48,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    width: 48,
  },
  createTabButtonSelected: {
    transform: [{ scale: 0.98 }],
  },
  createTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});

export function AppNavigator({
  sharedIntent = null,
  onSharedIntentConsumed,
}: AppNavigatorProps) {
  const theme = useTheme();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const { initialize: initNetwork } = useNetworkStore();
  const navigationTheme = theme.dark
    ? {
        ...NavigationDarkTheme,
        colors: {
          ...NavigationDarkTheme.colors,
          background: theme.colors.background,
          border: theme.colors.outlineVariant,
          card: theme.colors.background,
          notification: theme.colors.error,
          primary: theme.colors.primary,
          text: theme.colors.onSurface,
        },
      }
    : {
        ...NavigationDefaultTheme,
        colors: {
          ...NavigationDefaultTheme.colors,
          background: theme.colors.background,
          border: theme.colors.outlineVariant,
          card: theme.colors.background,
          notification: theme.colors.error,
          primary: theme.colors.primary,
          text: theme.colors.onSurface,
        },
      };

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
    <NavigationContainer linking={linking} ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.background, height: 52 },
          headerTintColor: theme.colors.onSurface,
          headerTitleStyle: { color: theme.colors.onSurface, fontSize: 18, fontWeight: '700' },
        }}
      >
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
