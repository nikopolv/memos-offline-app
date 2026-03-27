import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppIcon } from './AppIcon';

type MarkdownPreviewProps = {
  content: string;
  maxCharacters?: number;
  maxLines?: number;
  onToggleTask?: (lineIndex: number) => void;
};

type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'strike'; value: string }
  | { type: 'code'; value: string }
  | { type: 'highlight'; value: string }
  | { type: 'spoiler'; value: string }
  | { type: 'subscript'; value: string }
  | { type: 'superscript'; value: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'embed'; value: string };

function stripTagsForPreview(content: string) {
  return content.replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, '$1').replace(/[ \t]+\n/g, '\n').trim();
}

function truncateMarkdown(content: string, maxCharacters: number, maxLines: number) {
  const lines = content.split('\n');
  const limitedLines = lines.slice(0, maxLines);
  const joined = limitedLines.join('\n');

  if (joined.length <= maxCharacters && lines.length <= maxLines) {
    return joined;
  }

  const truncated = joined.slice(0, maxCharacters).trimEnd();
  return `${truncated}${truncated.endsWith('...') ? '' : '...'}`;
}

function parseInlineMarkdown(text: string): InlineNode[] {
  const pattern =
    /(!?\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(!\[\[([^[\]]+)\]\])|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(==([^=]+)==)|(~~([^~]+)~~)|(\|\|([^|]+)\|\|)|(\^([^^]+)\^)|(~([^~]+)~)|(\*([^*]+)\*)|((https?:\/\/[^\s]+))/g;
  const nodes: InlineNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const fullMatch = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      nodes.push({ type: 'text', value: text.slice(lastIndex, index) });
    }

    if (match[1]) {
      const label = match[2];
      const url = match[3];

      if (fullMatch.startsWith('!')) {
        nodes.push({ type: 'text', value: `[image: ${label}]` });
      } else {
        nodes.push({ type: 'link', label, url });
      }
    } else if (match[4]) {
      nodes.push({ type: 'embed', value: match[5] });
    } else if (match[6]) {
      nodes.push({ type: 'code', value: match[7] });
    } else if (match[8]) {
      nodes.push({ type: 'bold', value: match[9] });
    } else if (match[10]) {
      nodes.push({ type: 'highlight', value: match[11] });
    } else if (match[12]) {
      nodes.push({ type: 'strike', value: match[13] });
    } else if (match[14]) {
      nodes.push({ type: 'spoiler', value: match[15] });
    } else if (match[16]) {
      nodes.push({ type: 'superscript', value: match[17] });
    } else if (match[18]) {
      nodes.push({ type: 'subscript', value: match[19] });
    } else if (match[20]) {
      nodes.push({ type: 'italic', value: match[21] });
    } else if (match[22]) {
      nodes.push({ type: 'link', label: match[23], url: match[23] });
    }

    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', value: text }];
}

function MarkdownInlineText({ text }: { text: string }) {
  const theme = useTheme();
  const nodes = parseInlineMarkdown(text);

  return (
    <Text style={[styles.inlineBase, { color: theme.colors.onSurface }]}>
      {nodes.map((node, index) => {
        if (node.type === 'bold') {
          return (
            <Text key={index} style={styles.bold}>
              {node.value}
            </Text>
          );
        }

        if (node.type === 'italic') {
          return (
            <Text key={index} style={styles.italic}>
              {node.value}
            </Text>
          );
        }

        if (node.type === 'strike') {
          return (
            <Text key={index} style={styles.strike}>
              {node.value}
            </Text>
          );
        }

        if (node.type === 'highlight') {
          return (
            <Text
              key={index}
              style={[
                styles.highlight,
                {
                  backgroundColor: theme.colors.tertiaryContainer,
                  color: theme.colors.onTertiaryContainer,
                },
              ]}
            >
              {node.value}
            </Text>
          );
        }

        if (node.type === 'spoiler') {
          return (
            <Text
              key={index}
              style={[
                styles.spoiler,
                {
                  backgroundColor: theme.colors.onSurface,
                  color: theme.colors.onSurface,
                },
              ]}
            >
              {node.value}
            </Text>
          );
        }

        if (node.type === 'subscript') {
          return (
            <Text key={index} style={styles.subscript}>
              {node.value}
            </Text>
          );
        }

        if (node.type === 'superscript') {
          return (
            <Text key={index} style={styles.superscript}>
              {node.value}
            </Text>
          );
        }

        if (node.type === 'code') {
          return (
            <Text
              key={index}
              style={[
                styles.inlineCode,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  color: theme.colors.onSurface,
                },
              ]}
            >
              {node.value}
            </Text>
          );
        }

        if (node.type === 'link') {
          return (
            <Text
              key={index}
              style={[styles.link, { color: theme.colors.primary }]}
              onPress={() => {
                void Linking.openURL(node.url);
              }}
            >
              {node.label}
            </Text>
          );
        }

        if (node.type === 'embed') {
          return (
            <Text
              key={index}
              style={[
                styles.embed,
                {
                  backgroundColor: theme.colors.secondaryContainer,
                  color: theme.colors.onSecondaryContainer,
                },
              ]}
            >
              {node.value}
            </Text>
          );
        }

        return <Text key={index}>{node.value}</Text>;
      })}
    </Text>
  );
}

export function MarkdownPreview({
  content,
  maxCharacters,
  maxLines,
  onToggleTask,
}: MarkdownPreviewProps) {
  const theme = useTheme();
  const normalizedContent = stripTagsForPreview(content);
  const preview =
    typeof maxCharacters === 'number' && typeof maxLines === 'number'
      ? truncateMarkdown(normalizedContent, maxCharacters, maxLines)
      : normalizedContent;
  const lines = preview.split('\n');
  const renderedRows: React.ReactNode[] = [];
  let inCodeBlock = false;
  let tableBuffer: string[] = [];

  const flushTableBuffer = () => {
    if (tableBuffer.length === 0) {
      return;
    }

    renderedRows.push(
      <View
        key={`table-${renderedRows.length}`}
        style={[
          styles.table,
          {
            borderColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surfaceVariant,
          },
        ]}
      >
        {tableBuffer.map((row, rowIndex) => (
          <Text
            key={rowIndex}
            style={[
              styles.tableRow,
              {
                color: theme.colors.onSurface,
                borderBottomColor: rowIndex === tableBuffer.length - 1 ? 'transparent' : theme.colors.outlineVariant,
              },
            ]}
          >
            {row}
          </Text>
        ))}
      </View>
    );
    tableBuffer = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      flushTableBuffer();
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      renderedRows.push(
        <View
          key={`code-${index}`}
          style={[
            styles.codeBlock,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <Text style={[styles.codeText, { color: theme.colors.onSurface }]}>{line}</Text>
        </View>
      );
      return;
    }

    if (trimmed === '') {
      flushTableBuffer();
      renderedRows.push(<View key={`spacer-${index}`} style={styles.spacer} />);
      return;
    }

    if (/^\|.+\|$/.test(trimmed)) {
      tableBuffer.push(trimmed);
      return;
    }

    flushTableBuffer();

    if (/^---+$/.test(trimmed)) {
      renderedRows.push(
        <View
          key={`rule-${index}`}
          style={[styles.rule, { backgroundColor: theme.colors.outlineVariant }]}
        />
      );
      return;
    }

    const taskMatch = line.match(/^(\s*)[-*+]\s+\[( |x|X)\]\s+(.*)$/);
    if (taskMatch) {
      const [, indent, checked, text] = taskMatch;
      renderedRows.push(
        <View
          key={`task-${index}`}
          style={[styles.row, { paddingLeft: Math.min(indent.length * 8, 24) }]}
        >
          <Pressable
            accessibilityLabel={checked.toLowerCase() === 'x' ? 'Uncheck task' : 'Check task'}
            accessibilityRole={onToggleTask ? 'button' : 'none'}
            disabled={!onToggleTask}
            hitSlop={6}
            onPress={() => onToggleTask?.(index)}
            style={styles.rowIcon}
          >
            <AppIcon
              name={checked.toLowerCase() === 'x' ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
              size={18}
              color={theme.colors.onSurfaceVariant}
            />
          </Pressable>
          <View style={styles.rowContent}>
            <MarkdownInlineText text={text} />
          </View>
        </View>
      );
      return;
    }

    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      const [, indent, number, text] = orderedMatch;
      renderedRows.push(
        <View
          key={`ordered-${index}`}
          style={[styles.row, { paddingLeft: Math.min(indent.length * 8, 24) }]}
        >
          <Text style={[styles.listLabel, { color: theme.colors.onSurfaceVariant }]}>{number}.</Text>
          <View style={styles.rowContent}>
            <MarkdownInlineText text={text} />
          </View>
        </View>
      );
      return;
    }

    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bulletMatch) {
      const [, indent, text] = bulletMatch;
      renderedRows.push(
        <View
          key={`bullet-${index}`}
          style={[styles.row, { paddingLeft: Math.min(indent.length * 8, 24) }]}
        >
          <Text style={[styles.listLabel, { color: theme.colors.onSurfaceVariant }]}>•</Text>
          <View style={styles.rowContent}>
            <MarkdownInlineText text={text} />
          </View>
        </View>
      );
      return;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const [, hashes, text] = headingMatch;
      renderedRows.push(
        <Text
          key={`heading-${index}`}
          style={[
            styles.heading,
            {
              color: theme.colors.onSurface,
              fontSize: Math.max(18 - hashes.length, 13),
            },
          ]}
        >
          {text}
        </Text>
      );
      return;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      renderedRows.push(
        <View
          key={`quote-${index}`}
          style={[styles.quote, { borderLeftColor: theme.colors.outline }]}
        >
          <MarkdownInlineText text={quoteMatch[1]} />
        </View>
      );
      return;
    }

    renderedRows.push(
      <View key={`paragraph-${index}`} style={styles.paragraph}>
        <MarkdownInlineText text={line} />
      </View>
    );
  });

  flushTableBuffer();

  return <View style={styles.container}>{renderedRows}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  paragraph: {
    minHeight: 20,
  },
  inlineBase: {
    fontSize: 15,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  highlight: {
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  inlineCode: {
    borderRadius: 6,
    fontFamily: 'Courier',
    fontSize: 14,
    paddingHorizontal: 4,
  },
  spoiler: {
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  subscript: {
    fontSize: 12,
    lineHeight: 18,
  },
  superscript: {
    fontSize: 12,
    lineHeight: 18,
  },
  link: {
    textDecorationLine: 'underline',
  },
  embed: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    minHeight: 22,
  },
  rowIcon: {
    paddingTop: 2,
    width: 20,
  },
  rowContent: {
    flex: 1,
  },
  listLabel: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    width: 20,
  },
  heading: {
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 2,
  },
  quote: {
    borderLeftWidth: 3,
    paddingLeft: 10,
  },
  spacer: {
    height: 6,
  },
  rule: {
    borderRadius: 999,
    height: 1,
    marginVertical: 4,
  },
  codeBlock: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 18,
  },
  table: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableRow: {
    borderBottomWidth: 1,
    fontFamily: 'Courier',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
