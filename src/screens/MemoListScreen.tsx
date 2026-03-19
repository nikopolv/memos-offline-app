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
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { useMemoStore } from '../stores';
import { useNetworkStore } from '../utils/network';
import { fullSync } from '../sync';
import { Memo } from '../types';
import { TagFilter } from '../components';

export function MemoListScreen() {
  const theme = useTheme();
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
  const [refreshError, setRefreshError] = React.useState<string | null>(null);

  useEffect(() => {
    loadMemos();
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    setRefreshError(null);

    try {
      if (isConnected) {
        await fullSync();
      }
      await loadMemos();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh memos';
      setRefreshError(message);
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, loadMemos, refreshing]);

  const handleCreateMemo = () => {
    navigation.navigate('Editor', { mode: 'create' });
  };

  const handleEditMemo = (memo: Memo) => {
    navigation.navigate('Editor', { mode: 'edit', memoId: memo.id });
  };

  const filteredMemos = getFilteredMemos();

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

  if (isLoading && memos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search memos..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {!isConnected && (
        <View style={[styles.offlineBanner, { backgroundColor: theme.colors.errorContainer }]}>
          <Text style={{ color: theme.colors.onErrorContainer }}>
            Offline — changes will sync when connected
          </Text>
        </View>
      )}

      <TagFilter />

      <FlatList
        data={filteredMemos}
        keyExtractor={(item) => item.id}
        renderItem={renderMemoItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="titleMedium" style={styles.emptyText}>
              {searchQuery || filterTag ? 'No matching memos' : 'No memos yet'}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {searchQuery || filterTag
                ? 'Try clearing search or tag filters'
                : 'Start by creating your first memo'}
            </Text>

            {searchQuery || filterTag ? (
              <Button
                mode="outlined"
                style={styles.emptyAction}
                onPress={() => {
                  setSearchQuery('');
                  setFilterTag(null);
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button
                mode="contained"
                style={styles.emptyAction}
                onPress={handleCreateMemo}
              >
                Create memo
              </Button>
            )}
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreateMemo}
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
  offlineBanner: {
    padding: 8,
    alignItems: 'center',
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
