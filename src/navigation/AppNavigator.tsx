import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useAuthStore } from '../stores';
import { useNetworkStore } from '../utils/network';
import { initDatabase } from '../db';
import {
  LoginScreen,
  MemoListScreen,
  EditorScreen,
  SettingsScreen,
} from '../screens';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
            <MaterialCommunityIcons name="notebook" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
