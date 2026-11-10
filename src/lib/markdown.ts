const inlineToken = /(`[^`\n]+`|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_))/g;

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeHref(value: string) {
  const href = value.trim();
  return /^(https?:\/\/|mailto:)/i.test(href) ? escapeHtml(href) : "#";
}

function renderInline(value: string) {
  let output = "";
  let cursor = 0;
  for (const match of value.matchAll(inlineToken)) {
    const index = match.index ?? 0;
    output += escapeHtml(value.slice(cursor, index));
    if (match[0].startsWith("`")) output += `<code>${escapeHtml(match[0].slice(1, -1))}</code>`;
    else if (match[2] !== undefined) output += `<a href="${safeHref(match[3])}" rel="noreferrer">${escapeHtml(match[2])}</a>`;
    else if (match[4] !== undefined || match[5] !== undefined) output += `<strong>${escapeHtml(match[4] ?? match[5])}</strong>`;
    else output += `<em>${escapeHtml(match[6] ?? match[7] ?? "")}</em>`;
    cursor = index + match[0].length;
  }
  return output + escapeHtml(value.slice(cursor));
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(`<p>${paragraph.map(renderInline).join("<br>")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (listType && listItems.length) blocks.push(`<${listType}>${listItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${listType}>`);
    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const quote = line.match(/^>\s?(.*)$/);

    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) { flushParagraph(); flushList(); blocks.push("<hr>"); continue; }
    if (heading) { flushParagraph(); flushList(); const level = heading[1].length; blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`); continue; }
    if (quote) { flushParagraph(); flushList(); blocks.push(`<blockquote>${renderInline(quote[1])}</blockquote>`); continue; }
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((unordered ?? ordered)?.[1] ?? "");
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks.join("");
}

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(^|\s)[#>*+_-]+\s*/gm, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}
