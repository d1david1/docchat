import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Extract text from a PDF buffer, one entry per page.
 * Keeping page numbers lets us cite where each answer came from.
 */
export async function extractPages(buffer) {
  const data = new Uint8Array(buffer);
  const pdf = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;

  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
      .join('')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    pages.push({ page: n, text });
  }
  await pdf.destroy();
  return pages;
}
