import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractPages } from '../src/pdf.js';

test('extractPages reads text per page from a real PDF', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p1 = doc.addPage();
  p1.drawText('Refunds are available within 30 days of purchase.', { x: 50, y: 700, size: 12, font });
  const p2 = doc.addPage();
  p2.drawText('Delivery takes three to five working days.', { x: 50, y: 700, size: 12, font });

  const bytes = await doc.save();
  const pages = await extractPages(Buffer.from(bytes));

  assert.equal(pages.length, 2);
  assert.match(pages[0].text, /Refunds .* 30 days/);
  assert.match(pages[1].text, /Delivery takes three to five/);
});
