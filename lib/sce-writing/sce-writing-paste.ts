/**
 * Normalise clipboard HTML from Word, Google Docs, and similar sources
 * before ProseMirror parses pasted content.
 */

export function transformSceWritingPastedHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[if[\s\S]*?<!\[endif\]>/gi, "")
    .replace(/\s*mso-[^:]+:[^;"']+;?/gi, "")
    .replace(/\s*class="Mso[^"]*"/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
}