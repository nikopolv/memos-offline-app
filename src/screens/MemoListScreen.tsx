import React, { useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  Searchbar,
  Text,
  Card,
  IconButton,
  Chip,
  useTheme,
  Snackbar,
  Button,
} from 'react-native-paper';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { useMemoStore } from '../stores';
import { useNetworkStore } from '../utils/network';
import { fullSync, getSyncStatus } from '../sync';
import { Memo } from '../types';
import { AppIcon, MarkdownPreview, TagFilter, renderPaperIcon } from '../components';

interface SyncBannerState {
  pendingCount: number;
  failedCount: number;
  errorMessage: string | null;
}

function toggleTaskCheckbox(content: string, lineIndex: number) {
  const lines = content.split('\n');
  const targetLine = lines[lineIndex];

  if (typeof targetLine !== 'string') {
    return content;
  }

  const updatedLine = targetLine.replace(
    /^(\s*[-*+]\s+\[)( |x|X)(\]\s+.*)$/,
    (_, start: string, checked: string, end: string) => `${start}${checked.trim().toLowerCase() === 'x' ? ' ' : 'x'}${end}`
  );

  if (updatedLine === targetLine) {
    return content;
  }

  lines[lineIndex] = updatedLine;
  return lines.join('\n');
}

export function MemoListScreen() {
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
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
    updateMemo,
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
  const attemptedBootstrapSyncRef = React.useRef(false);

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

  const handleToggleTask = useCallback(
    async (memo: Memo, lineIndex: number) => {
      const nextContent = toggleTaskCheckbox(memo.content, lineIndex);

      if (nextContent === memo.content) {
        return;
      }

      await updateMemo(memo.id, nextContent, memo.pinned);
      await refreshSyncBanner();
    },
    [refreshSyncBanner, updateMemo]
  );

  const filteredMemos = getFilteredMemos();
  const showInitialSkeleton = isLoading && memos.length === 0;
  const listBottomPadding = tabBarHeight + 36;
  const syncIconName =
    isSyncing
      ? 'sync'
      : !isConnected
        ? 'wifi-off'
        : syncBanner.failedCount > 0 || syncBanner.errorMessage
          ? 'alert-circle'
          : syncBanner.pendingCount > 0
            ? 'cloud-upload'
            : 'sync';
  const syncIconColor =
    isSyncing || syncBanner.pendingCount > 0
      ? theme.colors.primary
      : !isConnected || syncBanner.failedCount > 0 || syncBanner.errorMessage
        ? theme.colors.error
        : theme.colors.onSurfaceVariant;
  const syncLabel = isSyncing
    ? 'Syncing changes'
    : !isConnected
      ? syncBanner.pendingCount > 0
        ? `${syncBanner.pendingCount} changes waiting for connection`
        : 'Offline'
      : syncBanner.failedCount > 0 || syncBanner.errorMessage
        ? 'Sync needs attention'
        : syncBanner.pendingCount > 0
          ? `${syncBanner.pendingCount} changes ready to sync`
          : 'All changes synced';
  const syncAction =
    !isConnected || isSyncing
      ? undefined
      : syncBanner.pendingCount > 0 || syncBanner.failedCount > 0 || syncBanner.errorMessage
        ? runSync
        : handleRefresh;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityLabel={syncLabel}
          accessibilityRole="button"
          disabled={!syncAction}
          hitSlop={8}
          onPress={syncAction}
          style={({ pressed }) => [styles.headerSyncButton, { opacity: pressed ? 0.72 : 1 }]}
        >
          <AppIcon name={syncIconName} size={18} color={syncIconColor} />
        </Pressable>
      ),
    });
  }, [navigation, syncAction, syncIconColor, syncIconName, syncLabel]);

  useEffect(() => {
    if (memos.length > 0) {
      attemptedBootstrapSyncRef.current = false;
      return;
    }

    if (
      attemptedBootstrapSyncRef.current ||
      isLoading ||
      isSyncing ||
      !isConnected
    ) {
      return;
    }

    attemptedBootstrapSyncRef.current = true;
    void runSync();
  }, [isConnected, isLoading, isSyncing, memos.length, runSync]);

  const renderMemoItem = ({ item }: { item: Memo }) => (
    <MemoCard
      memo={item}
      activeTag={filterTag}
      onPress={() => handleEditMemo(item)}
      onDelete={() => deleteMemo(item.id)}
      onTogglePin={() => togglePin(item.id)}
      onToggleTask={(lineIndex) => void handleToggleTask(item, lineIndex)}
      onTagPress={setFilterTag}
    />
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search memos..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[
          styles.searchbar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        inputStyle={styles.searchInput}
        icon={renderPaperIcon('magnify')}
        clearIcon={renderPaperIcon('close')}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        accessibilityLabel="Search memos"
      />

      <TagFilter />

      {showInitialSkeleton ? (
        <FlatList
          data={Array.from({ length: 5 }, (_, index) => `skeleton-${index}`)}
          keyExtractor={(item) => item}
          renderItem={() => <MemoCardSkeleton />}
          contentContainerStyle={[styles.list, { paddingBottom: listBottomPadding }]}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          data={filteredMemos}
          keyExtractor={(item) => item.id}
          renderItem={renderMemoItem}
          contentContainerStyle={[styles.list, { paddingBottom: listBottomPadding }]}
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
  onToggleTask: (lineIndex: number) => void;
  onTagPress: (tag: string | null) => void;
}

interface MemoListEmptyStateProps {
  filterTag: string | null;
  isConnected: boolean;
  onClearFilters: () => void;
  onCreateMemo: () => void;
  onSyncNow: () => void;
  searchQuery: string;
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

function MemoCard({
  memo,
  activeTag,
  onPress,
  onDelete,
  onTogglePin,
  onToggleTask,
  onTagPress,
}: MemoCardProps) {
  const theme = useTheme();
  const swipeableRef = React.useRef<Swipeable | null>(null);
  const swipeGestureActiveRef = React.useRef(false);
  const taskToggleActiveRef = React.useRef(false);
  const [isSwipeOpen, setIsSwipeOpen] = React.useState(false);

  // Extract tags from content
  const tags = memo.content.match(/#\w+/g) || [];

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <Button
        mode="contained-tonal"
        compact
        style={styles.swipeButton}
        onPress={() => {
          swipeableRef.current?.close();
          onTogglePin();
        }}
      >
        {memo.pinned ? 'Unpin' : 'Pin'}
      </Button>
      <Button
        mode="contained"
        compact
        buttonColor={theme.colors.error}
        textColor={theme.colors.onError}
        style={styles.swipeButton}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        Delete
      </Button>
    </View>
  );

  const handleToggleTask = (lineIndex: number) => {
    taskToggleActiveRef.current = true;
    onToggleTask(lineIndex);

    setTimeout(() => {
      taskToggleActiveRef.current = false;
    }, 0);
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      onSwipeableWillOpen={() => {
        swipeGestureActiveRef.current = true;
        setIsSwipeOpen(true);
      }}
      onSwipeableWillClose={() => {
        swipeGestureActiveRef.current = true;
      }}
      onSwipeableClose={() => {
        setTimeout(() => {
          swipeGestureActiveRef.current = false;
          setIsSwipeOpen(false);
        }, 0);
      }}
    >
      <Card
        style={styles.card}
        onPress={() => {
          if (isSwipeOpen || swipeGestureActiveRef.current || taskToggleActiveRef.current) {
            return;
          }

          onPress();
        }}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardMeta}>
              {memo.pinned && (
                <IconButton
                  icon={renderPaperIcon('pin')}
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

          <MarkdownPreview content={memo.content} onToggleTask={handleToggleTask} />

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
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  searchInput: {
    fontSize: 16,
    minHeight: 48,
  },
  headerSyncButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    marginRight: 6,
    width: 32,
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
