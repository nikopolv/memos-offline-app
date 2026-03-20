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
import { useMemoStore } from '../stores';

type EditorMode = 'create' | 'edit';

export function EditorScreen() {
  const theme = useTheme();
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
  }, [navigation, hasChanges, isSaving, content]);

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

  // Quick tag buttons - Type tags first, then project tags
  const typeTags = ['#task', '#idea', '#decision', '#learning'];
  const projectTags = ['#logmore', '#routamo', '#goner', '#jydev', '#loggs', '#bov', '#polarnest'];

  const appendToContent = (suffix: string) => {
    setContent((current) => current + suffix);
  };

  const insertTag = (tag: string) => {
    setContent((current) => {
      const separator = current.endsWith(' ') || current === '' ? '' : ' ';
      return current + separator + tag + ' ';
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Write your memo... (Markdown supported)"
          multiline
          style={styles.editor}
          mode="flat"
          autoFocus={mode === 'create'}
          textColor={theme.colors.onSurface}
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
      </ScrollView>

      <View style={styles.toolbar}>
        {/* Type tags row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagButtons}
        >
          {typeTags.map((tag) => (
            <Button
              key={tag}
              mode="contained-tonal"
              compact
              onPress={() => insertTag(tag)}
              style={styles.tagButton}
            >
              {tag}
            </Button>
          ))}
        </ScrollView>
        
        {/* Project tags row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagButtons}
        >
          {projectTags.map((tag) => (
            <Button
              key={tag}
              mode="outlined"
              compact
              onPress={() => insertTag(tag)}
              style={styles.tagButton}
            >
              {tag}
            </Button>
          ))}
        </ScrollView>

        <View style={styles.formatButtons}>
          <IconButton
            icon="format-bold"
            size={20}
            onPress={() => {
              appendToContent('**text**');
            }}
          />
          <IconButton
            icon="format-list-bulleted"
            size={20}
            onPress={() => {
              appendToContent('\n- ');
            }}
          />
          <IconButton
            icon="checkbox-marked-outline"
            size={20}
            onPress={() => {
              appendToContent('\n- [ ] ');
            }}
          />
          <IconButton
            icon="code-tags"
            size={20}
            onPress={() => {
              appendToContent('`code`');
            }}
          />
        </View>
      </View>

      <View style={styles.footer}>
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
  },
  editor: {
    flex: 1,
    minHeight: 300,
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    backgroundColor: 'transparent',
  },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    padding: 8,
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
  },
  footer: {
    padding: 8,
    alignItems: 'center',
  },
  charCount: {
    opacity: 0.5,
  },
});
