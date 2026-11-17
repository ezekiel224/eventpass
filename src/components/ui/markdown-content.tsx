import { markdownToHtml } from "@/lib/markdown";

export function MarkdownContent({ value, className = "" }: { value: string; className?: string }) {
  return <div className={`markdown-content ${className}`} dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }} />;
}
