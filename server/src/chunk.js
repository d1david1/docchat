/**
 * Split page text into overlapping chunks small enough to embed and to fit
 * several into one prompt. Chunks never cross page boundaries, so every chunk
 * maps to exactly one page number for citations.
 */
export function chunkPages(pages, { size = 1200, overlap = 200 } = {}) {
  if (overlap >= size) throw new Error('overlap must be smaller than size');
  const chunks = [];

  for (const { page, text } of pages) {
    if (!text) continue;
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + size, text.length);

      // Prefer to break at a sentence or line end so chunks read naturally.
      if (end < text.length) {
        const window = text.slice(start, end);
        const breakAt = Math.max(window.lastIndexOf('. '), window.lastIndexOf('\n'));
        if (breakAt > size * 0.5) end = start + breakAt + 1;
      }

      const piece = text.slice(start, end).trim();
      if (piece) chunks.push({ id: chunks.length, page, text: piece });
      if (end >= text.length) break;
      start = end - overlap;
    }
  }
  return chunks;
}
