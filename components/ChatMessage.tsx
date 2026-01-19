"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

type ChatMessageProps = {
  content: string;
  className?: string;
};

marked.setOptions({
  breaks: true,
});

export default function ChatMessage({ content, className = "" }: ChatMessageProps) {
  const html = useMemo(() => {
    const parsed = marked.parse(content || "");
    const raw = typeof parsed === "string" ? parsed : "";
    return DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true },
    });
  }, [content]);

  return (
    <div
      className={`prose prose-sm max-w-none ${className} prose-code:rounded prose-code:bg-[color:var(--background)] prose-code:px-1 prose-code:py-0.5 prose-pre:bg-[color:var(--background)]`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
