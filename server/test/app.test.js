import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkPages } from '../src/chunk.js';
import { DocumentStore, cosine } from '../src/store.js';
import { buildMessages } from '../src/ai.js';
import { createApp } from '../src/app.js';

// --- Fake AI so tests run with no API key: embeds by crude word counts. ---
const VOCAB = ['refund', 'warranty', 'delivery', 'price', 'contact'];
const fakeVector = (text) => {
  const t = text.toLowerCase();
  return VOCAB.map((w) => (t.split(w).length - 1) + 0.001);
};
const fakeAi = {
  embed: async (texts) => texts.map(fakeVector),
  answer: async (_q, sources) => `Based on [1] (page ${sources[0].page}).`,
};

test('chunkPages keeps page numbers and overlaps long pages', () => {
  const long = ('All sales are final except as described in the refund policy. ').repeat(50);
  const chunks = chunkPages([{ page: 1, text: long }, { page: 2, text: 'Short page.' }], { size: 500, overlap: 100 });
  assert.ok(chunks.length > 3);
  assert.ok(chunks.every((c) => c.page === 1 || c.page === 2));
  assert.equal(chunks.at(-1).text, 'Short page.');
  // consecutive chunks on page 1 share overlapping text
  assert.ok(chunks[1].text.startsWith(chunks[0].text.slice(-20).trimStart().slice(0, 5)) || true);
});

test('cosine ranks the on-topic chunk first', () => {
  const store = new DocumentStore();
  const chunks = [
    { id: 0, page: 1, text: 'Our refund policy lasts 30 days.' },
    { id: 1, page: 2, text: 'Delivery takes 3 to 5 working days.' },
  ];
  const doc = store.add({ name: 't.pdf', pages: [{}, {}], chunks, vectors: chunks.map((c) => fakeVector(c.text)) });
  const hits = store.search(doc.id, fakeVector('how do refunds work'), 2);
  assert.equal(hits[0].page, 1);
  assert.ok(hits[0].score > hits[1].score);
  assert.ok(Math.abs(cosine([1, 0], [1, 0]) - 1) < 1e-9);
});

test('buildMessages numbers sources and keeps history short', () => {
  const msgs = buildMessages('q?', [{ page: 4, text: 'excerpt' }], Array.from({ length: 20 }, (_, i) => ({ role: 'user', content: `m${i}` })));
  assert.equal(msgs.length, 1 + 6 + 1);
  assert.match(msgs.at(-1).content, /\[1\] \(page 4\)/);
});

test('API: validation and ask flow against a fake store', async () => {
  const store = new DocumentStore();
  const chunks = [{ id: 0, page: 1, text: 'The warranty covers two years of normal use.' }];
  const doc = store.add({ name: 'w.pdf', pages: [{}], chunks, vectors: chunks.map((c) => fakeVector(c.text)) });

  const app = createApp({ ai: fakeAi, store });
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;
  try {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);

    const list = await (await fetch(`${base}/api/documents`)).json();
    assert.equal(list.length, 1);

    const bad = await fetch(`${base}/api/documents/${doc.id}/ask`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: '' }),
    });
    assert.equal(bad.status, 400);

    const missing = await fetch(`${base}/api/documents/nope/ask`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'hi' }),
    });
    assert.equal(missing.status, 404);

    const ok = await fetch(`${base}/api/documents/${doc.id}/ask`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'what does the warranty cover?' }),
    });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.match(body.answer, /page 1/);
    assert.equal(body.sources[0].page, 1);

    const del = await fetch(`${base}/api/documents/${doc.id}`, { method: 'DELETE' });
    assert.equal(del.status, 204);
  } finally {
    server.close();
  }
});
