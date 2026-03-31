import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Pressable,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import {
  TextInput,
  Button,
  IconButton,
  useTheme,
  Text,
  Surface,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, renderPaperIcon } from '../components';
import { useMemoStore } from '../stores';

type EditorMode = 'create' | 'edit';
type TextSelection = { start: number; end: number };

function getAutoNumberedListContinuation(
  previousContent: string,
  nextContent: string,
  selection: TextSelection
) {
  if (selection.start !== selection.end) {
    return null;
  }

  if (nextContent.length !== previousContent.length + 1) {
    return null;
  }

  if (nextContent[selection.start] !== '\n') {
    return null;
  }

  if (nextContent.slice(0, selection.start) !== previousContent.slice(0, selection.start)) {
    return null;
  }

  if (nextContent.slice(selection.start + 1) !== previousContent.slice(selection.start)) {
    return null;
  }

  const lineStart = previousContent.lastIndexOf('\n', selection.start - 1) + 1;
  const currentLine = previousContent.slice(lineStart, selection.start);
  const match = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);

  if (!match) {
    return null;
  }

  const [, indentation, currentNumber] = match;
  const nextPrefix = `${indentation}${Number(currentNumber) + 1}. `;
  const insertionPoint = selection.start + 1;
  const updatedContent =
    nextContent.slice(0, insertionPoint) + nextPrefix + nextContent.slice(insertionPoint);
  const nextSelection = {
    start: insertionPoint + nextPrefix.length,
    end: insertionPoint + nextPrefix.length,
  };

  return {
    content: updatedContent,
    selection: nextSelection,
  };
}

function getAutoBulletListContinuation(
  previousContent: string,
  nextContent: string,
  selection: TextSelection
) {
  if (selection.start !== selection.end) {
    return null;
  }

  if (nextContent.length !== previousContent.length + 1) {
    return null;
  }

  if (nextContent[selection.start] !== '\n') {
    return null;
  }

  if (nextContent.slice(0, selection.start) !== previousContent.slice(0, selection.start)) {
    return null;
  }

  if (nextContent.slice(selection.start + 1) !== previousContent.slice(selection.start)) {
    return null;
  }

  const lineStart = previousContent.lastIndexOf('\n', selection.start - 1) + 1;
  const currentLine = previousContent.slice(lineStart, selection.start);
  const match = currentLine.match(/^(\s*)-\s(.*)$/);

  if (!match) {
    return null;
  }

  const [, indentation] = match;
  const nextPrefix = `${indentation}- `;
  const insertionPoint = selection.start + 1;
  const updatedContent =
    nextContent.slice(0, insertionPoint) + nextPrefix + nextContent.slice(insertionPoint);
  const nextSelection = {
    start: insertionPoint + nextPrefix.length,
    end: insertionPoint + nextPrefix.length,
  };

  return {
    content: updatedContent,
    selection: nextSelection,
  };
}

function getAutoTaskListContinuation(
  previousContent: string,
  nextContent: string,
  selection: TextSelection
) {
  if (selection.start !== selection.end) {
    return null;
  }

  if (nextContent.length !== previousContent.length + 1) {
    return null;
  }

  if (nextContent[selection.start] !== '\n') {
    return null;
  }

  if (nextContent.slice(0, selection.start) !== previousContent.slice(0, selection.start)) {
    return null;
  }

  if (nextContent.slice(selection.start + 1) !== previousContent.slice(selection.start)) {
    return null;
  }

  const lineStart = previousContent.lastIndexOf('\n', selection.start - 1) + 1;
  const currentLine = previousContent.slice(lineStart, selection.start);
  const match = currentLine.match(/^(\s*)-\s\[(?: |x|X)\]\s(.*)$/);

  if (!match) {
    return null;
  }

  const [, indentation] = match;
  const nextPrefix = `${indentation}- [ ] `;
  const insertionPoint = selection.start + 1;
  const updatedContent =
    nextContent.slice(0, insertionPoint) + nextPrefix + nextContent.slice(insertionPoint);
  const nextSelection = {
    start: insertionPoint + nextPrefix.length,
    end: insertionPoint + nextPrefix.length,
  };

  return {
    content: updatedContent,
    selection: nextSelection,
  };
}

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
  const [controlledSelection, setControlledSelection] = useState<TextSelection | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isPinned, setIsPinned] = useState(existingMemo?.pinned ?? false);
  const [hasChanges, setHasChanges] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [dockHeight, setDockHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const hydratedMemoIdRef = useRef<string | null>(null);
  const selectionRef = useRef<TextSelection>({
    start: (existingMemo?.content || initialContent).length,
    end: (existingMemo?.content || initialContent).length,
  });
  const hasVisualViewport = Platform.OS === 'web' && typeof window !== 'undefined' && 'visualViewport' in window;

  const updateContent = (nextContent: string, nextSelection?: TextSelection) => {
    setContent(nextContent);
    const resolvedSelection = nextSelection ?? {
      start: nextContent.length,
      end: nextContent.length,
    };
    selectionRef.current = resolvedSelection;
    setControlledSelection(resolvedSelection);
  };

  const insertSnippet = (snippet: string, cursorOffset = snippet.length) => {
    const { start, end } = selectionRef.current;
    const nextContent = content.slice(0, start) + snippet + content.slice(end);
    const nextCursor = start + cursorOffset;

    updateContent(nextContent, {
      start: nextCursor,
      end: nextCursor,
    });
  };

  const insertLinePrefix = (prefix: string) => {
    const { start, end } = selectionRef.current;
    const needsLeadingNewline = start > 0 && content[start - 1] !== '\n';
    const snippet = `${needsLeadingNewline ? '\n' : ''}${prefix}`;
    insertSnippet(snippet);
  };

  const handleMeasuredHeight =
    (setter: React.Dispatch<React.SetStateAction<number>>) => (event: LayoutChangeEvent) => {
      const nextHeight = Math.ceil(event.nativeEvent.layout.height);
      setter((current) => (current === nextHeight ? current : nextHeight));
    };

  useEffect(() => {
    if (existingMemo) {
      if (hydratedMemoIdRef.current !== existingMemo.id) {
        updateContent(existingMemo.content);
        setIsPinned(existingMemo.pinned);
        hydratedMemoIdRef.current = existingMemo.id;
      }
      return;
    }

    hydratedMemoIdRef.current = null;
    setIsPinned(false);

    if (mode === 'create' && initialContent) {
      updateContent(initialContent);
    }
  }, [existingMemo?.id, existingMemo?.content, mode, initialContent]);

  useEffect(() => {
    if (existingMemo) {
      setHasChanges(content !== existingMemo.content || isPinned !== existingMemo.pinned);
    } else {
      setHasChanges(content.trim().length > 0 || isPinned);
    }
  }, [content, existingMemo, isPinned]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (!hasVisualViewport) {
        return;
      }

      const viewport = window.visualViewport;
      if (!viewport) {
        return;
      }

      const updateViewportOffset = () => {
        const keyboardHeight = Math.max(
          0,
          Math.round(window.innerHeight - viewport.height - viewport.offsetTop)
        );
        setKeyboardOffset(keyboardHeight > 40 ? keyboardHeight : 0);
      };

      updateViewportOffset();
      viewport.addEventListener('resize', updateViewportOffset);
      viewport.addEventListener('scroll', updateViewportOffset);
      window.addEventListener('resize', updateViewportOffset);

      return () => {
        viewport.removeEventListener('resize', updateViewportOffset);
        viewport.removeEventListener('scroll', updateViewportOffset);
        window.removeEventListener('resize', updateViewportOffset);
      };
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardOffset(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [hasVisualViewport]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel={isPinned ? 'Unpin memo' : 'Pin memo'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIsPinned((current) => !current)}
            style={({ pressed }) => [
              styles.headerPinButton,
              { opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <AppIcon
              name="pin"
              size={18}
              color={isPinned ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
          </Pressable>
          <Button
            mode="text"
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
            loading={isSaving}
          >
            Save
          </Button>
        </View>
      ),
    });
  }, [navigation, hasChanges, isPinned, isSaving, theme.colors.onSurfaceVariant, theme.colors.primary]);

  const handleSave = async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      if (mode === 'edit' && memoId) {
        await updateMemo(memoId, content, isPinned);
      } else {
        await createMemo(content, isPinned);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const appendToContent = (suffix: string) => {
    insertSnippet(suffix);
  };

  const insertTag = (tag: string) => {
    const separator = content.endsWith(' ') || content === '' ? '' : ' ';
    updateContent(content + separator + tag + ' ');
  };

  const handleContentChange = (nextContent: string) => {
    const continuation =
      getAutoNumberedListContinuation(content, nextContent, selectionRef.current) ||
      getAutoTaskListContinuation(content, nextContent, selectionRef.current) ||
      getAutoBulletListContinuation(content, nextContent, selectionRef.current);

    if (continuation) {
      updateContent(continuation.content, continuation.selection);
      return;
    }

    setContent(nextContent);
  };

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    const nextSelection = event.nativeEvent.selection;
    selectionRef.current = nextSelection;

    if (
      controlledSelection &&
      controlledSelection.start === nextSelection.start &&
      controlledSelection.end === nextSelection.end
    ) {
      setControlledSelection(undefined);
    }
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
  const compactDockTags = useMemo(() => {
    const tags = quickTags.concat(suggestedTags);
    return Array.from(new Set(tags)).slice(0, 4);
  }, [quickTags, suggestedTags]);

  const handleInsertCustomTag = () => {
    const normalizedTag = normalizeTag(customTag);
    if (!normalizedTag) return;

    insertTag(normalizedTag);
    setCustomTag('');
    setIsTagSheetOpen(false);
  };

  const handleQuickTagPress = (tag: string) => {
    insertTag(tag);
  };

  const handleInsertCheckbox = () => {
    insertLinePrefix('- [ ] ');
  };

  const handleInsertCodeBlock = () => {
    const { start } = selectionRef.current;
    const needsLeadingNewline = start > 0 && content[start - 1] !== '\n';
    const snippet = `${needsLeadingNewline ? '\n' : ''}\`\`\`\n\n\`\`\``;
    const cursorOffset = (needsLeadingNewline ? 1 : 0) + 4;
    insertSnippet(snippet, cursorOffset);
  };

  const handleInsertAttachment = () => {
    const snippet = '![attachment](https://)';
    insertSnippet(snippet, snippet.indexOf('https://') + 'https://'.length);
  };

  const handleInsertMemoLink = () => {
    const snippet = '![[memo]]';
    insertSnippet(snippet, 3);
  };

  const handleInsertHeading = (level: 2 | 3 = 2) => {
    insertLinePrefix(`${'#'.repeat(level)} `);
  };

  const handleInsertTable = () => {
    const { start } = selectionRef.current;
    const needsLeadingNewline = start > 0 && content[start - 1] !== '\n';
    const snippet =
      `${needsLeadingNewline ? '\n' : ''}| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |`;
    const cursorOffset = (needsLeadingNewline ? 1 : 0) + 2;
    insertSnippet(snippet, cursorOffset);
  };

  const baseBottomInset = Math.max(insets.bottom, 8);
  const dockBottomOffset = footerHeight + baseBottomInset + keyboardOffset + 8;
  const scrollPaddingBottom = dockHeight + footerHeight + keyboardOffset + baseBottomInset + 32;
  const showQuickButtonOnly = Platform.OS === 'web' && !hasVisualViewport;
  const dockPositionStyle = { position: 'absolute' } as const;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={content}
          onChangeText={handleContentChange}
          selection={controlledSelection}
          onSelectionChange={handleSelectionChange}
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

      <Surface
        onLayout={handleMeasuredHeight(setDockHeight)}
        elevation={3}
        style={[
          styles.floatingDock,
          dockPositionStyle,
          {
            backgroundColor: theme.colors.elevation.level2,
            borderColor: theme.colors.outlineVariant,
            bottom: dockBottomOffset,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.compactDockRow}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.composeActionGroup}>
            <IconButton
              icon={renderPaperIcon('pound')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={() => setIsTagSheetOpen(true)}
              accessibilityLabel="Insert tag"
            />
            <IconButton
              icon={renderPaperIcon('checkbox-marked-outline')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={handleInsertCheckbox}
              accessibilityLabel="Insert checkbox"
            />
            <IconButton
              icon={renderPaperIcon('code-tags')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={handleInsertCodeBlock}
              accessibilityLabel="Insert code block"
            />
            <IconButton
              icon={renderPaperIcon('pound')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={() => handleInsertHeading(2)}
              accessibilityLabel="Insert heading"
            />
            <IconButton
              icon={renderPaperIcon('table')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={handleInsertTable}
              accessibilityLabel="Insert table"
            />
            <IconButton
              icon={renderPaperIcon('attachment')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={handleInsertAttachment}
              accessibilityLabel="Insert attachment"
            />
            <IconButton
              icon={renderPaperIcon('memo-link')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={handleInsertMemoLink}
              accessibilityLabel="Insert memo link"
            />
          </View>

          {showQuickButtonOnly ? (
            <Button
              mode="contained-tonal"
              compact
              onPress={() => setIsTagSheetOpen(true)}
              style={styles.tagButton}
              contentStyle={styles.toolbarButtonContent}
            >
              # Tags
            </Button>
          ) : (
            <>
              {compactDockTags.map((tag) => (
                <Button
                  key={`dock-${tag}`}
                  mode="contained-tonal"
                  compact
                  onPress={() => handleQuickTagPress(tag)}
                  style={styles.tagButton}
                  contentStyle={styles.toolbarButtonContent}
                >
                  {tag}
                </Button>
              ))}
            </>
          )}

          {!showQuickButtonOnly && (
            <Button
              mode="outlined"
              compact
              onPress={() => setIsTagSheetOpen(true)}
              style={styles.moreButton}
              contentStyle={styles.toolbarButtonContent}
            >
              More
            </Button>
          )}
        </ScrollView>
      </Surface>

      <View
        onLayout={handleMeasuredHeight(setFooterHeight)}
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

      <Modal
        visible={isTagSheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsTagSheetOpen(false)}
      >
        <Pressable
          style={[styles.sheetBackdrop, { backgroundColor: theme.colors.backdrop }]}
          onPress={() => setIsTagSheetOpen(false)}
        />
        <Surface
          elevation={4}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text variant="titleMedium">Tags</Text>
            <Button compact onPress={() => setIsTagSheetOpen(false)}>
              Close
            </Button>
          </View>

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
            keyboardShouldPersistTaps="handled"
          >
            {quickTags.map((tag) => (
              <Button
                key={tag}
                mode="contained-tonal"
                compact
                onPress={() => handleQuickTagPress(tag)}
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
                keyboardShouldPersistTaps="handled"
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
                    onPress={() => handleQuickTagPress(tag)}
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
              icon={renderPaperIcon('format-bold')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={() => {
                appendToContent('**text**');
              }}
            />
            <IconButton
              icon={renderPaperIcon('format-list-bulleted')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={() => {
                appendToContent('\n- ');
              }}
            />
            <IconButton
              icon={renderPaperIcon('checkbox-marked-outline')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={() => {
                handleInsertCheckbox();
              }}
            />
            <IconButton
              icon={renderPaperIcon('code-tags')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={() => {
                handleInsertCodeBlock();
              }}
            />
            <IconButton
              icon={renderPaperIcon('pound')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={() => {
                handleInsertHeading(2);
              }}
            />
            <IconButton
              icon={renderPaperIcon('table')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={handleInsertTable}
            />
            <IconButton
              icon={renderPaperIcon('attachment')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={handleInsertAttachment}
            />
            <IconButton
              icon={renderPaperIcon('memo-link')}
              size={20}
              mode="contained-tonal"
              containerColor={theme.colors.secondaryContainer}
              iconColor={theme.colors.onSecondaryContainer}
              onPress={handleInsertMemoLink}
            />
          </View>
        </Surface>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  headerPinButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
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
  floatingDock: {
    left: 12,
    right: 12,
    borderWidth: 1,
    borderRadius: 20,
    zIndex: 10,
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
  composeActionGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    marginRight: 8,
  },
  toolbarLabel: {
    paddingHorizontal: 12,
    marginBottom: 6,
    opacity: 0.7,
  },
  toolbarButtonContent: {
    minHeight: 40,
  },
  compactDockRow: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  moreButton: {
    borderRadius: 16,
    marginLeft: 'auto',
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
  sheetBackdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
});
