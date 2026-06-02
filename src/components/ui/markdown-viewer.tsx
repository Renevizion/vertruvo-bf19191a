import { useMemo } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { cn } from "@/lib/utils";

export function MarkdownViewer({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => {
    const parsed = marked.parse(content, { async: false, breaks: true }) as string;
    return DOMPurify.sanitize(parsed);
  }, [content]);

  return (
    <div
      className={cn("prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-pre:whitespace-pre-wrap", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
