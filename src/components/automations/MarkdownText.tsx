import React from 'react';

interface MarkdownTextProps {
  content: string;
  className?: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, className = "" }) => {
  const parseMarkdown = (text: string): React.ReactNode => {
    // Split by code blocks first
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks: string[] = [];
    let processedText = text.replace(codeBlockRegex, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // Split by inline code
    const inlineCodeRegex = /`([^`]+)`/g;
    const inlineCodes: string[] = [];
    processedText = processedText.replace(inlineCodeRegex, (match, code) => {
      inlineCodes.push(code);
      return `__INLINE_CODE_${inlineCodes.length - 1}__`;
    });

    // Split by newlines to handle list items
    const lines = processedText.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
      if (!line.trim()) {
        elements.push(<br key={`br-${lineIdx}`} />);
        return;
      }

      // Check if it's a list item
      const listMatch = line.match(/^[•\-\*]\s+(.+)$/);
      if (listMatch) {
        const listContent = parseInlineMarkdown(listMatch[1], inlineCodes, codeBlocks);
        elements.push(
          <div key={`list-${lineIdx}`} className="flex gap-2 ml-4">
            <span className="text-muted-foreground">•</span>
            <span>{listContent}</span>
          </div>
        );
        return;
      }

      // Check if it's a heading
      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingContent = parseInlineMarkdown(headingMatch[2], inlineCodes, codeBlocks);
        const HeadingTag = `h${Math.min(level + 2, 6)}` as keyof JSX.IntrinsicElements;
        elements.push(
          <HeadingTag key={`heading-${lineIdx}`} className="font-semibold mt-2 mb-1">
            {headingContent}
          </HeadingTag>
        );
        return;
      }

      // Regular paragraph
      const parsed = parseInlineMarkdown(line, inlineCodes, codeBlocks);
      elements.push(<p key={`p-${lineIdx}`}>{parsed}</p>);
    });

    return elements;
  };

  const parseInlineMarkdown = (
    text: string,
    inlineCodes: string[],
    codeBlocks: string[]
  ): React.ReactNode[] => {
    // Replace code block placeholders
    text = text.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => {
      return codeBlocks[parseInt(idx)];
    });

    // Parse bold, italic
    const parts: React.ReactNode[] = [];
    let currentText = text;
    let key = 0;

    // Handle bold **text**
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(currentText)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        const beforeText = currentText.slice(lastIndex, match.index);
        parts.push(...processSegment(beforeText, inlineCodes, key++));
      }
      // Add bold text
      parts.push(
        <strong key={`bold-${key++}`} className="font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < currentText.length) {
      const remainingText = currentText.slice(lastIndex);
      parts.push(...processSegment(remainingText, inlineCodes, key++));
    }

    return parts;
  };

  const processSegment = (
    segment: string,
    inlineCodes: string[],
    startKey: number
  ): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let key = startKey;

    // Replace inline code placeholders
    const codeRegex = /__INLINE_CODE_(\d+)__/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(segment)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(segment.slice(lastIndex, match.index));
      }
      // Add code
      const codeIdx = parseInt(match[1]);
      parts.push(
        <code
          key={`code-${key++}`}
          className="bg-muted px-1 py-0.5 rounded text-xs font-mono"
        >
          {inlineCodes[codeIdx]}
        </code>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < segment.length) {
      parts.push(segment.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [segment];
  };

  return <div className={className}>{parseMarkdown(content)}</div>;
};
