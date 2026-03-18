import React, { useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
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
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useMemoStore, useAuthStore } from '../stores';
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
    setSearchQuery,
    loadMemos,
    getFilteredMemos,
    deleteMemo,
    togglePin,
  } = useMemoStore();
  const { isConnected } = useNetworkStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    loadMemos();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isConnected) {
      await fullSync();
    }
    await loadMemos();
    setRefreshing(false);
  }, [isConnected, loadMemos]);

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
      onPress={() => handleEditMemo(item)}
      onDelete={() => deleteMemo(item.id)}
      onTogglePin={() => togglePin(item.id)}
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
              No memos yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Tap + to create your first memo
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreateMemo}
      />
    </View>
  );
}

interface MemoCardProps {
  memo: Memo;
  onPress: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

function MemoCard({ memo, onPress, onDelete, onTogglePin }: MemoCardProps) {
  const theme = useTheme();
  
  // Extract tags from content
  const tags = memo.content.match(/#\w+/g) || [];
  
  // Get preview (first 150 chars, without tags)
  const preview = memo.content
    .replace(/#\w+/g, '')
    .trim()
    .substring(0, 150);

  return (
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
          <View style={styles.cardActions}>
            <IconButton
              icon={memo.pinned ? 'pin-off' : 'pin'}
              size={20}
              onPress={onTogglePin}
            />
            <IconButton
              icon="delete-outline"
              size={20}
              onPress={onDelete}
            />
          </View>
        </View>

        <Text variant="bodyMedium" numberOfLines={4}>
          {preview}
        </Text>

        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.slice(0, 5).map((tag, index) => (
              <Chip
                key={index}
                compact
                style={styles.tag}
                textStyle={styles.tagText}
              >
                {tag}
              </Chip>
            ))}
          </View>
        )}

        <Text variant="bodySmall" style={styles.timestamp}>
          {new Date(memo.updatedAt).toLocaleDateString()}
        </Text>
      </Card.Content>
    </Card>
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
