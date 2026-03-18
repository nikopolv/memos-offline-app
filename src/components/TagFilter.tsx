import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import { useMemoStore } from '../stores';

export function TagFilter() {
  const theme = useTheme();
  const { memos, filterTag, setFilterTag } = useMemoStore();

  // Extract all unique tags from memos
  const tags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    
    memos.forEach((memo) => {
      const memoTags = memo.content.match(/#\w+/g) || [];
      memoTags.forEach((tag) => {
        const normalizedTag = tag.toLowerCase();
        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
      });
    });

    // Sort by count descending
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [memos]);

  if (tags.length === 0) {
    return null;
  }

  const handleTagPress = (tag: string) => {
    const tagName = tag.replace('#', '');
    if (filterTag === tagName) {
      setFilterTag(null); // Deselect
    } else {
      setFilterTag(tagName);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filterTag && (
          <Chip
            mode="flat"
            onPress={() => setFilterTag(null)}
            style={[styles.chip, styles.clearChip]}
            icon="close"
          >
            Clear
          </Chip>
        )}
        
        {tags.map(({ tag, count }) => {
          const tagName = tag.replace('#', '');
          const isSelected = filterTag === tagName;
          
          return (
            <Chip
              key={tag}
              mode={isSelected ? 'flat' : 'outlined'}
              selected={isSelected}
              onPress={() => handleTagPress(tag)}
              style={[
                styles.chip,
                isSelected && { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              {tag} ({count})
            </Chip>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    marginRight: 4,
  },
  clearChip: {
    marginRight: 8,
  },
});
