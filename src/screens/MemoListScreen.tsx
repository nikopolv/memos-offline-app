import React, { useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  FAB,
  Searchbar,
  Text,
  Card,
  IconButton,
  Chip,
  useTheme,
  ActivityIndicator,
  Snackbar,
  Button,
  Surface,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemoStore } from '../stores';
import { useNetworkStore } from '../utils/network';
import { fullSync, getSyncStatus } from '../sync';
import { Memo } from '../types';
import { TagFilter } from '../components';

interface SyncBannerState {
  pendingCount: number;
  failedCount: number;
  errorMessage: string | null;
}

export function MemoListScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    memos,
    isLoading,
    searchQuery,
    filterTag,
    setSearchQuery,
    setFilterTag,
    loadMemos,
    getFilteredMemos,
    deleteMemo,
    togglePin,
    error,
    clearError,
  } = useMemoStore();
  const { isConnected } = useNetworkStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);
  const [syncBanner, setSyncBanner] = React.useState<SyncBannerState>({
    pendingCount: 0,
    failedCount: 0,
    errorMessage: null,
  });

  const refreshSyncBanner = useCallback(async (errorMessage?: string | null) => {
    const status = await getSyncStatus();
    setSyncBanner({
      pendingCount: status.pendingCount,
      failedCount: status.failedCount,
      errorMessage: errorMessage ?? null,
    });
  }, []);

  const loadMemosWithSyncBanner = useCallback(async () => {
    await loadMemos();
    await refreshSyncBanner();
  }, [loadMemos, refreshSyncBanner]);

  useEffect(() => {
    loadMemosWithSyncBanner();
  }, [loadMemosWithSyncBanner]);

  useFocusEffect(
    useCallback(() => {
      loadMemosWithSyncBanner();
    }, [loadMemosWithSyncBanner])
  );

  const runSync = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setRefreshError(null);

    try {
      const result = await fullSync();
      const errorMessage = result.errors[0] ?? null;

      await loadMemos();
      await refreshSyncBanner(errorMessage);

      if (!result.success && errorMessage) {
        setRefreshError(errorMessage);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync changes';
      await loadMemos();
      await refreshSyncBanner(message);
      setRefreshError(message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, loadMemos, refreshSyncBanner]);

  const handleRefresh = useCallback(async () => {
    if (refreshing || isSyncing) return;

    setRefreshing(true);
    setRefreshError(null);

    try {
      if (isConnected) {
        await runSync();
      } else {
        await loadMemosWithSyncBanner();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh memos';
      setRefreshError(message);
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, isSyncing, loadMemosWithSyncBanner, refreshing, runSync]);

  const handleCreateMemo = () => {
    navigation.navigate('Editor', { mode: 'create' });
  };

  const handleEditMemo = (memo: Memo) => {
    navigation.navigate('Editor', { mode: 'edit', memoId: memo.id });
  };

  const filteredMemos = getFilteredMemos();
  const showInitialSkeleton = isLoading && memos.length === 0;

  const renderMemoItem = ({ item }: { item: Memo }) => (
    <MemoCard
      memo={item}
      activeTag={filterTag}
      onPress={() => handleEditMemo(item)}
      onDelete={() => deleteMemo(item.id)}
      onTogglePin={() => togglePin(item.id)}
      onTagPress={setFilterTag}
    />
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search memos..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
        accessibilityLabel="Search memos"
      />

      <SyncStatusBanner
        failedCount={syncBanner.failedCount}
        isConnected={isConnected}
        isSyncing={isSyncing}
        onRetry={runSync}
        pendingCount={syncBanner.pendingCount}
        syncError={syncBanner.errorMessage}
      />

      <TagFilter />

      {showInitialSkeleton ? (
        <FlatList
          data={Array.from({ length: 5 }, (_, index) => `skeleton-${index}`)}
          keyExtractor={(item) => item}
          renderItem={() => <MemoCardSkeleton />}
          contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          data={filteredMemos}
          keyExtractor={(item) => item.id}
          renderItem={renderMemoItem}
          contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <MemoListEmptyState
              filterTag={filterTag}
              isConnected={isConnected}
              onClearFilters={() => {
                setSearchQuery('');
                setFilterTag(null);
              }}
              onCreateMemo={handleCreateMemo}
              onSyncNow={runSync}
              searchQuery={searchQuery}
            />
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 8 }]}
        onPress={handleCreateMemo}
        accessibilityLabel="Create memo"
      />

      <Snackbar
        visible={Boolean(error)}
        onDismiss={clearError}
        duration={4000}
        action={{ label: 'Dismiss', onPress: clearError }}
      >
        {error}
      </Snackbar>

      <Snackbar
        visible={Boolean(refreshError)}
        onDismiss={() => setRefreshError(null)}
        duration={4000}
        action={{ label: 'Dismiss', onPress: () => setRefreshError(null) }}
      >
        {refreshError}
      </Snackbar>
    </View>
  );
}

interface MemoCardProps {
  memo: Memo;
  activeTag: string | null;
  onPress: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onTagPress: (tag: string | null) => void;
}

interface SyncStatusBannerProps {
  failedCount: number;
  isConnected: boolean;
  isSyncing: boolean;
  onRetry: () => void;
  pendingCount: number;
  syncError: string | null;
}

interface MemoListEmptyStateProps {
  filterTag: string | null;
  isConnected: boolean;
  onClearFilters: () => void;
  onCreateMemo: () => void;
  onSyncNow: () => void;
  searchQuery: string;
}

function SyncStatusBanner({
  failedCount,
  isConnected,
  isSyncing,
  onRetry,
  pendingCount,
  syncError,
}: SyncStatusBannerProps) {
  const theme = useTheme();

  if (isSyncing) {
    return (
      <Surface style={[styles.syncBanner, { backgroundColor: theme.colors.secondaryContainer }]}>
        <View style={styles.syncBannerHeader}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSecondaryContainer }}>
            Syncing changes…
          </Text>
          <ActivityIndicator animating size="small" color={theme.colors.onSecondaryContainer} />
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer }}>
          Pulling the latest memos and uploading local edits.
        </Text>
      </Surface>
    );
  }

  if (!isConnected) {
    return (
      <Surface style={[styles.syncBanner, { backgroundColor: theme.colors.errorContainer }]}>
        <Text variant="titleSmall" style={{ color: theme.colors.onErrorContainer }}>
          Offline
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
          {pendingCount > 0
            ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync when connection returns.`
            : 'Changes will sync automatically when connection returns.'}
        </Text>
      </Surface>
    );
  }

  if (failedCount > 0 || syncError) {
    return (
      <Surface style={[styles.syncBanner, { backgroundColor: theme.colors.errorContainer }]}>
        <View style={styles.syncBannerHeader}>
          <Text variant="titleSmall" style={{ color: theme.colors.onErrorContainer }}>
            Sync needs attention
          </Text>
          <Button
            compact
            mode="contained-tonal"
            onPress={onRetry}
            textColor={theme.colors.onErrorContainer}
          >
            Retry
          </Button>
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
          {syncError ?? `${failedCount} change${failedCount === 1 ? '' : 's'} hit the retry limit.`}
        </Text>
      </Surface>
    );
  }

  if (pendingCount > 0) {
    return (
      <Surface style={[styles.syncBanner, { backgroundColor: theme.colors.primaryContainer }]}>
        <View style={styles.syncBannerHeader}>
          <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer }}>
            {pendingCount} change{pendingCount === 1 ? '' : 's'} ready to sync
          </Text>
          <Button compact mode="contained-tonal" onPress={onRetry}>
            Sync now
          </Button>
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
          Local edits are saved. Run sync now or pull to refresh.
        </Text>
      </Surface>
    );
  }

  return (
    <Surface style={[styles.syncBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        All changes synced.
      </Text>
    </Surface>
  );
}

function MemoListEmptyState({
  filterTag,
  isConnected,
  onClearFilters,
  onCreateMemo,
  onSyncNow,
  searchQuery,
}: MemoListEmptyStateProps) {
  const hasFilters = Boolean(searchQuery || filterTag);

  if (hasFilters) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="titleMedium" style={styles.emptyText}>
          No matching memos
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtext}>
          Clear the current search or tag filter to get back to your full list.
        </Text>
        <Button mode="outlined" style={styles.emptyAction} onPress={onClearFilters}>
          Clear filters
        </Button>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="titleMedium" style={styles.emptyText}>
          No offline memos yet
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtext}>
          Create a memo now and it will sync automatically when you are back online.
        </Text>
        <Button mode="contained" style={styles.emptyAction} onPress={onCreateMemo}>
          Create offline memo
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.emptyContainer}>
      <Text variant="titleMedium" style={styles.emptyText}>
        No memos yet
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtext}>
        Start a new memo or pull from the server if this account already has content.
      </Text>
      <Button mode="contained" style={styles.emptyAction} onPress={onCreateMemo}>
        Create memo
      </Button>
      <Button mode="text" onPress={onSyncNow}>
        Sync now
      </Button>
    </View>
  );
}

function MemoCardSkeleton() {
  const theme = useTheme();

  return (
    <Card style={styles.card} accessibilityLabel="Loading memo">
      <Card.Content>
        <View style={styles.skeletonHeader}>
          <View
            style={[
              styles.skeletonChip,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />
        </View>
        <View
          style={[
            styles.skeletonLinePrimary,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        />
        <View
          style={[
            styles.skeletonLineSecondary,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        />
        <View
          style={[
            styles.skeletonLineTertiary,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        />
        <View style={styles.skeletonTagRow}>
          <View
            style={[
              styles.skeletonTag,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />
          <View
            style={[
              styles.skeletonTag,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />
        </View>
      </Card.Content>
    </Card>
  );
}

function MemoCard({ memo, activeTag, onPress, onDelete, onTogglePin, onTagPress }: MemoCardProps) {
  const theme = useTheme();

  // Extract tags from content
  const tags = memo.content.match(/#\w+/g) || [];

  // Get preview (first 150 chars, without tags)
  const preview = memo.content
    .replace(/#\w+/g, '')
    .trim()
    .substring(0, 150);

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <Button
        mode="contained-tonal"
        compact
        style={styles.swipeButton}
        onPress={onTogglePin}
      >
        {memo.pinned ? 'Unpin' : 'Pin'}
      </Button>
      <Button
        mode="contained"
        compact
        buttonColor={theme.colors.error}
        textColor={theme.colors.onError}
        style={styles.swipeButton}
        onPress={onDelete}
      >
        Delete
      </Button>
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Card style={styles.card} onPress={onPress}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardMeta}>
              {memo.pinned && (
                <IconButton
                  icon="pin"
                  size={16}
                  iconColor={theme.colors.primary}
                  style={styles.pinIcon}
                />
              )}
              {memo.syncStatus === 'pending' && (
                <Chip compact style={styles.syncChip}>
                  Pending
                </Chip>
              )}
            </View>
          </View>

          <Text variant="bodyMedium" numberOfLines={4}>
            {preview}
          </Text>

          {tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {tags.slice(0, 5).map((tag, index) => {
                const tagName = tag.replace('#', '').toLowerCase();
                const isActive = activeTag === tagName;

                return (
                  <Chip
                    key={index}
                    compact
                    selected={isActive}
                    mode={isActive ? 'flat' : 'outlined'}
                    style={styles.tag}
                    textStyle={styles.tagText}
                    onPress={() => onTagPress(isActive ? null : tagName)}
                  >
                    {tag}
                  </Chip>
                );
              })}
            </View>
          )}

          <Text variant="bodySmall" style={styles.timestamp}>
            {new Date(memo.updatedAt).toLocaleDateString()}
          </Text>
        </Card.Content>
      </Card>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  searchInput: {
    fontSize: 16,
  },
  syncBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
  },
  syncBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    opacity: 0.7,
  },
  emptySubtext: {
    opacity: 0.5,
    marginTop: 8,
  },
  emptyAction: {
    marginTop: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },
  skeletonChip: {
    width: 72,
    height: 28,
    borderRadius: 999,
  },
  skeletonLinePrimary: {
    height: 14,
    borderRadius: 999,
    width: '92%',
    marginBottom: 10,
  },
  skeletonLineSecondary: {
    height: 14,
    borderRadius: 999,
    width: '78%',
    marginBottom: 10,
  },
  skeletonLineTertiary: {
    height: 14,
    borderRadius: 999,
    width: '64%',
    marginBottom: 16,
  },
  skeletonTagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonTag: {
    width: 64,
    height: 24,
    borderRadius: 999,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
  },
  swipeActions: {
    marginBottom: 12,
    justifyContent: 'center',
    gap: 8,
    paddingLeft: 8,
  },
  swipeButton: {
    borderRadius: 8,
  },
  pinIcon: {
    margin: 0,
  },
  syncChip: {
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 4,
  },
  tag: {
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
  },
  timestamp: {
    marginTop: 12,
    opacity: 0.5,
  },
});
