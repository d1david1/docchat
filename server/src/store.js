import { randomUUID } from 'node:crypto';

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/**
 * In-memory document store. Fine for a demo or a single user; swap for
 * Postgres + pgvector (or similar) to persist documents between restarts.
 */
export class DocumentStore {
  constructor({ maxDocs = 20 } = {}) {
    this.docs = new Map();
    this.maxDocs = maxDocs;
  }

  add({ name, pages, chunks, vectors }) {
    if (this.docs.size >= this.maxDocs) {
      const oldest = this.docs.keys().next().value;
      this.docs.delete(oldest);
    }
    const id = randomUUID();
    this.docs.set(id, {
      id,
      name,
      pageCount: pages.length,
      chunks: chunks.map((c, i) => ({ ...c, vector: vectors[i] })),
      createdAt: new Date().toISOString(),
    });
    return this.summary(id);
  }

  summary(id) {
    const d = this.docs.get(id);
    if (!d) return null;
    return { id: d.id, name: d.name, pageCount: d.pageCount, chunkCount: d.chunks.length, createdAt: d.createdAt };
  }

  list() {
    return [...this.docs.keys()].map((id) => this.summary(id));
  }

  remove(id) {
    return this.docs.delete(id);
  }

  search(id, queryVector, k = 5) {
    const d = this.docs.get(id);
    if (!d) return null;
    return d.chunks
      .map((c) => ({ id: c.id, page: c.page, text: c.text, score: cosine(queryVector, c.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
