import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  List,
  Button,
  Text,
  Divider,
  useTheme,
} from 'react-native-paper';
import { renderPaperIcon } from '../components';
import { useAuthStore, useThemeStore, ThemeMode } from '../stores';
import { useNetworkStore } from '../utils/network';
import { getSyncStatus, fullSync } from '../sync';

export function SettingsScreen() {
  const theme = useTheme();
  const { serverUrl, logout } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const { isConnected } = useNetworkStore();

  const [syncStatus, setSyncStatus] = useState({
    pendingCount: 0,
    failedCount: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingSyncStatus, setIsLoadingSyncStatus] = useState(true);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    setIsLoadingSyncStatus(true);
    try {
      const status = await getSyncStatus();
      setSyncStatus({
        pendingCount: status.pendingCount,
        failedCount: status.failedCount,
      });
    } finally {
      setIsLoadingSyncStatus(false);
    }
  };

  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await fullSync();
      if (result.success) {
        Alert.alert('Sync Complete', `Synced ${result.synced} items`);
      } else {
        Alert.alert('Sync Partial', `Synced ${result.synced}, failed ${result.failed}`);
      }
      await loadSyncStatus();
    } catch (error) {
      Alert.alert('Sync Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to disconnect? Your local memos will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const modeDescription: Record<ThemeMode, string> = {
    system: 'Follow system',
    light: 'Light',
    dark: 'Dark',
  };

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>Connection</List.Subheader>
        
        <List.Item
          title="Server"
          description={serverUrl || 'Not connected'}
          left={(props) => <List.Icon {...props} icon={renderPaperIcon('server')} />}
        />
        
        <List.Item
          title="Status"
          description={isConnected ? 'Online' : 'Offline'}
          left={(props) => (
            <List.Icon
              {...props}
              icon={renderPaperIcon(isConnected ? 'wifi' : 'wifi-off')}
              color={isConnected ? theme.colors.primary : theme.colors.error}
            />
          )}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Sync</List.Subheader>
        
        <List.Item
          title="Pending Changes"
          description={
            isLoadingSyncStatus
              ? 'Loading sync status...'
              : `${syncStatus.pendingCount} items waiting to sync`
          }
          left={(props) => <List.Icon {...props} icon={renderPaperIcon('cloud-upload')} />}
        />
        
        {syncStatus.failedCount > 0 && (
          <List.Item
            title="Failed Items"
            description={`${syncStatus.failedCount} items failed to sync`}
            left={(props) => (
              <List.Icon
                {...props}
                icon={renderPaperIcon('alert-circle')}
                color={theme.colors.error}
              />
            )}
          />
        )}
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSync}
            loading={isSyncing}
            disabled={isSyncing || isLoadingSyncStatus || !isConnected}
            icon={renderPaperIcon('sync')}
          >
            Sync Now
          </Button>
        </View>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Appearance</List.Subheader>

        <List.Item
          title="Theme"
          description={modeDescription[mode]}
          left={(props) => <List.Icon {...props} icon={renderPaperIcon('theme-light-dark')} />}
        />

        <View style={styles.themeButtons}>
          <Button
            mode={mode === 'system' ? 'contained' : 'outlined'}
            onPress={() => setMode('system')}
            compact
          >
            System
          </Button>
          <Button
            mode={mode === 'light' ? 'contained' : 'outlined'}
            onPress={() => setMode('light')}
            compact
          >
            Light
          </Button>
          <Button
            mode={mode === 'dark' ? 'contained' : 'outlined'}
            onPress={() => setMode('dark')}
            compact
          >
            Dark
          </Button>
        </View>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>About</List.Subheader>
        
        <List.Item
          title="Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon={renderPaperIcon('information')} />}
        />
        
        <List.Item
          title="Memos"
          description="Open-source note-taking app"
          left={(props) => <List.Icon {...props} icon={renderPaperIcon('notebook')} />}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            icon={renderPaperIcon('logout')}
            textColor={theme.colors.error}
          >
            Disconnect
          </Button>
        </View>
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonContainer: {
    padding: 16,
  },
  themeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
