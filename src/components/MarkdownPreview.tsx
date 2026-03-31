import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppIcon } from './AppIcon';

type MarkdownPreviewProps = {
  content: string;
  maxCharacters?: number;
  maxLines?: number;
  onToggleTask?: (lineIndex: number) => void;
  serverUrl?: string | null;
};

type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'image'; label: string; url: string }
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
    /(!?\[([^\]]+)\]\(((?:https?:\/\/|\/|\.\.?\/)[^\s)]+)\))|(!\[\[([^[\]]+)\]\])|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(==([^=]+)==)|(~~([^~]+)~~)|(\|\|([^|]+)\|\|)|(\^([^^]+)\^)|(~([^~]+)~)|(\*([^*]+)\*)|((https?:\/\/[^\s]+))/g;
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
        nodes.push({ type: 'image', label, url });
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

function parseTableCells(row: string) {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isMarkdownTableSeparator(row: string) {
  const cells = parseTableCells(row);

  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function resolveAttachmentUrl(url: string, serverUrl?: string | null) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (!serverUrl) {
    return url;
  }

  const normalizedBase = serverUrl.replace(/\/$/, '');
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${normalizedBase}${normalizedPath}`;
}

function isImageAttachment(url: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif)(?:$|[?#])/i.test(url);
}

function MarkdownInlineText({
  text,
  serverUrl,
}: {
  text: string;
  serverUrl?: string | null;
}) {
  const theme = useTheme();
  const nodes = parseInlineMarkdown(text);

  return (
    <View style={styles.inlineFlow}>
      {nodes.map((node, index) => {
        if (node.type === 'image') {
          const resolvedUrl = resolveAttachmentUrl(node.url, serverUrl);

          if (isImageAttachment(resolvedUrl)) {
            return (
              <View key={index} style={styles.inlineAttachmentBlock}>
                <Image
                  source={{ uri: resolvedUrl }}
                  accessibilityLabel={node.label || 'Attached image'}
                  style={styles.inlineImage}
                />
                {node.label ? (
                  <Text style={[styles.attachmentCaption, { color: theme.colors.onSurfaceVariant }]}>
                    {node.label}
                  </Text>
                ) : null}
              </View>
            );
          }

          return (
            <Text
              key={index}
              style={[styles.inlineBase, styles.link, { color: theme.colors.primary }]}
              onPress={() => {
                void Linking.openURL(resolvedUrl);
              }}
            >
              {node.label ? `Download ${node.label}` : 'Download attachment'}
            </Text>
          );
        }

        if (node.type === 'bold') {
          return (
            <Text key={index} style={[styles.inlineBase, styles.bold, { color: theme.colors.onSurface }]}>
              {node.value}
            </Text>
          );
        }

        if (node.type === 'italic') {
          return (
            <Text key={index} style={[styles.inlineBase, styles.italic, { color: theme.colors.onSurface }]}>
              {node.value}
            </Text>
          );
        }

        if (node.type === 'strike') {
          return (
            <Text key={index} style={[styles.inlineBase, styles.strike, { color: theme.colors.onSurface }]}>
              {node.value}
            </Text>
          );
        }

        if (node.type === 'highlight') {
          return (
            <Text
              key={index}
              style={[
                styles.inlineBase,
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
                styles.inlineBase,
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
            <Text key={index} style={[styles.inlineBase, styles.subscript, { color: theme.colors.onSurface }]}>
              {node.value}
            </Text>
          );
        }

        if (node.type === 'superscript') {
          return (
            <Text key={index} style={[styles.inlineBase, styles.superscript, { color: theme.colors.onSurface }]}>
              {node.value}
            </Text>
          );
        }

        if (node.type === 'code') {
          return (
            <Text
              key={index}
              style={[
                styles.inlineBase,
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
              style={[styles.inlineBase, styles.link, { color: theme.colors.primary }]}
              onPress={() => {
                void Linking.openURL(resolveAttachmentUrl(node.url, serverUrl));
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
                styles.inlineBase,
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

        return (
          <Text key={index} style={[styles.inlineBase, { color: theme.colors.onSurface }]}>
            {node.value}
          </Text>
        );
      })}
    </View>
  );
}

export function MarkdownPreview({
  content,
  maxCharacters,
  maxLines,
  onToggleTask,
  serverUrl,
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

    const headerCells = parseTableCells(tableBuffer[0]);
    const separatorIndex = tableBuffer.length > 1 && isMarkdownTableSeparator(tableBuffer[1]) ? 1 : -1;
    const bodyRows = tableBuffer
      .slice(separatorIndex === 1 ? 2 : 1)
      .map(parseTableCells)
      .filter((row) => row.length > 0);

    if (headerCells.length > 0 && separatorIndex === 1) {
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
          <View
            style={[
              styles.tableVisualRow,
              styles.tableHeaderRow,
              { borderBottomColor: theme.colors.outlineVariant },
            ]}
          >
            {headerCells.map((cell, cellIndex) => (
              <View
                key={`header-${cellIndex}`}
                style={[
                  styles.tableCell,
                  cellIndex < headerCells.length - 1 && {
                    borderRightColor: theme.colors.outlineVariant,
                    borderRightWidth: 1,
                  },
                ]}
              >
                <MarkdownInlineText text={cell} serverUrl={serverUrl} />
              </View>
            ))}
          </View>

          {bodyRows.map((row, rowIndex) => (
            <View
              key={`body-${rowIndex}`}
              style={[
                styles.tableVisualRow,
                rowIndex < bodyRows.length - 1 && {
                  borderBottomColor: theme.colors.outlineVariant,
                  borderBottomWidth: 1,
                },
              ]}
            >
              {headerCells.map((_, cellIndex) => (
                <View
                  key={`cell-${rowIndex}-${cellIndex}`}
                  style={[
                    styles.tableCell,
                    cellIndex < headerCells.length - 1 && {
                      borderRightColor: theme.colors.outlineVariant,
                      borderRightWidth: 1,
                    },
                  ]}
                >
                  <MarkdownInlineText text={row[cellIndex] ?? ''} serverUrl={serverUrl} />
                </View>
              ))}
            </View>
          ))}
        </View>
      );
      tableBuffer = [];
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
            <MarkdownInlineText text={text} serverUrl={serverUrl} />
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
            <MarkdownInlineText text={text} serverUrl={serverUrl} />
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
            <MarkdownInlineText text={text} serverUrl={serverUrl} />
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
          <MarkdownInlineText text={quoteMatch[1]} serverUrl={serverUrl} />
        </View>
      );
      return;
    }

    renderedRows.push(
      <View key={`paragraph-${index}`} style={styles.paragraph}>
        <MarkdownInlineText text={line} serverUrl={serverUrl} />
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
  inlineFlow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  inlineBase: {
    fontSize: 15,
    lineHeight: 22,
  },
  inlineAttachmentBlock: {
    gap: 6,
    marginVertical: 4,
    width: '100%',
  },
  inlineImage: {
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    maxHeight: 280,
    width: '100%',
  },
  attachmentCaption: {
    fontSize: 13,
    lineHeight: 18,
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
  tableCell: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tableHeaderRow: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
  },
  tableRow: {
    borderBottomWidth: 1,
    fontFamily: 'Courier',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableVisualRow: {
    flexDirection: 'row',
  },
});
