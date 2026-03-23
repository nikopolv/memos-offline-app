import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  IconButton,
  useTheme,
  Text,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemoStore } from '../stores';

type EditorMode = 'create' | 'edit';

export function EditorScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const mode: EditorMode = route.params?.mode || 'create';
  const memoId: string | undefined = route.params?.memoId;
  const initialContent: string = route.params?.initialContent || '';

  const { memos, createMemo, updateMemo } = useMemoStore();
  const existingMemo = memoId ? memos.find((m) => m.id === memoId) : undefined;

  const [content, setContent] = useState(existingMemo?.content || initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const hydratedMemoIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (existingMemo) {
      if (hydratedMemoIdRef.current !== existingMemo.id) {
        setContent(existingMemo.content);
        hydratedMemoIdRef.current = existingMemo.id;
      }
      return;
    }

    hydratedMemoIdRef.current = null;

    if (mode === 'create' && initialContent) {
      setContent(initialContent);
    }
  }, [existingMemo?.id, existingMemo?.content, mode, initialContent]);

  useEffect(() => {
    if (existingMemo) {
      setHasChanges(content !== existingMemo.content);
    } else {
      setHasChanges(content.trim().length > 0);
    }
  }, [content, existingMemo]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          mode="text"
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
          loading={isSaving}
        >
          Save
        </Button>
      ),
    });
  }, [navigation, hasChanges, isSaving]);

  const handleSave = async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      if (mode === 'edit' && memoId) {
        await updateMemo(memoId, content);
      } else {
        await createMemo(content);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const appendToContent = (suffix: string) => {
    setContent((current) => current + suffix);
  };

  const insertTag = (tag: string) => {
    setContent((current) => {
      const separator = current.endsWith(' ') || current === '' ? '' : ' ';
      return current + separator + tag + ' ';
    });
  };

  const normalizeTag = (value: string) => {
    const trimmed = value.trim().replace(/\s+/g, '-').replace(/^#+/, '');
    return trimmed ? `#${trimmed.toLowerCase()}` : '';
  };

  const currentTags = Array.from(
    new Set((content.match(/#\w+/g) || []).map((tag) => tag.toLowerCase()))
  );

  const tagCounts = new Map<string, number>();
  memos.forEach((memo) => {
    const memoTags = memo.content.match(/#\w+/g) || [];
    memoTags.forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
    });
  });

  const suggestedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .filter((tag) => !currentTags.includes(tag))
    .slice(0, 8);

  const quickTags = ['#task', '#idea', '#decision', '#learning'];

  const handleInsertCustomTag = () => {
    const normalizedTag = normalizeTag(customTag);
    if (!normalizedTag) return;

    insertTag(normalizedTag);
    setCustomTag('');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Write your memo... (Markdown supported)"
          multiline
          style={[
            styles.editor,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              color: theme.colors.onSurface,
            },
          ]}
          mode="flat"
          autoFocus={mode === 'create'}
          textColor={theme.colors.onSurface}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          selectionColor={theme.colors.primary}
        />
      </ScrollView>

      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: theme.colors.elevation.level1,
            borderTopColor: theme.colors.outlineVariant,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={styles.customTagRow}>
          <TextInput
            value={customTag}
            onChangeText={setCustomTag}
            mode="outlined"
            dense
            placeholder="Add tag fast"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.customTagInput, { backgroundColor: theme.colors.surface }]}
            onSubmitEditing={handleInsertCustomTag}
            accessibilityLabel="Custom tag input"
            textColor={theme.colors.onSurface}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />
          <Button
            mode="contained"
            compact
            onPress={handleInsertCustomTag}
            disabled={!normalizeTag(customTag)}
            contentStyle={styles.toolbarButtonContent}
          >
            Add tag
          </Button>
        </View>

        <Text variant="labelMedium" style={styles.toolbarLabel}>
          Quick tags
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagButtons}
        >
          {quickTags.map((tag) => (
            <Button
              key={tag}
              mode="contained-tonal"
              compact
              onPress={() => insertTag(tag)}
              style={styles.tagButton}
              contentStyle={styles.toolbarButtonContent}
            >
              {tag}
            </Button>
          ))}
        </ScrollView>

        {(suggestedTags.length > 0 || currentTags.length > 0) && (
          <>
            <Text variant="labelMedium" style={styles.toolbarLabel}>
              Suggested from your memos
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagButtons}
            >
              {currentTags.map((tag) => (
                <Button
                  key={`current-${tag}`}
                  mode="contained"
                  compact
                  disabled
                  style={styles.tagButton}
                  contentStyle={styles.toolbarButtonContent}
                >
                  {tag}
                </Button>
              ))}

              {suggestedTags.map((tag) => (
                <Button
                  key={tag}
                  mode="outlined"
                  compact
                  onPress={() => insertTag(tag)}
                  style={styles.tagButton}
                  contentStyle={styles.toolbarButtonContent}
                >
                  {tag}
                </Button>
              ))}
            </ScrollView>
          </>
        )}

        <View style={styles.formatButtons}>
          <IconButton
            icon="format-bold"
            size={20}
            mode="contained-tonal"
            containerColor={theme.colors.secondaryContainer}
            iconColor={theme.colors.onSecondaryContainer}
            onPress={() => {
              appendToContent('**text**');
            }}
          />
          <IconButton
            icon="format-list-bulleted"
            size={20}
            mode="contained-tonal"
            containerColor={theme.colors.secondaryContainer}
            iconColor={theme.colors.onSecondaryContainer}
            onPress={() => {
              appendToContent('\n- ');
            }}
          />
          <IconButton
            icon="checkbox-marked-outline"
            size={20}
            mode="contained-tonal"
            containerColor={theme.colors.secondaryContainer}
            iconColor={theme.colors.onSecondaryContainer}
            onPress={() => {
              appendToContent('\n- [ ] ');
            }}
          />
          <IconButton
            icon="code-tags"
            size={20}
            mode="contained-tonal"
            containerColor={theme.colors.secondaryContainer}
            iconColor={theme.colors.onSecondaryContainer}
            onPress={() => {
              appendToContent('`code`');
            }}
          />
        </View>
      </View>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.elevation.level1,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <Text variant="bodySmall" style={styles.charCount}>
          {content.length} characters
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  editor: {
    flex: 1,
    minHeight: 300,
    fontSize: 17,
    lineHeight: 26,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  toolbar: {
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  customTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  customTagInput: {
    flex: 1,
  },
  toolbarLabel: {
    paddingHorizontal: 12,
    marginBottom: 6,
    opacity: 0.7,
  },
  toolbarButtonContent: {
    minHeight: 40,
  },
  tagButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  tagButton: {
    borderRadius: 16,
  },
  formatButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 4,
  },
  footer: {
    padding: 8,
    alignItems: 'center',
  },
  charCount: {
    opacity: 0.5,
  },
});
