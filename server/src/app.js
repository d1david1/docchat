import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { extractPages } from './pdf.js';
import { chunkPages } from './chunk.js';
import { DocumentStore } from './store.js';
import * as defaultAi from './ai.js';

const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 15);

/**
 * Build the Express app. `ai` is injectable so tests can run without an API key.
 */
export function createApp({ ai = defaultAi, store = new DocumentStore(), clientDist } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '200kb' }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) =>
      file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')
        ? cb(null, true)
        : cb(Object.assign(new Error('Only PDF files are supported.'), { status: 400 })),
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/documents', (_req, res) => res.json(store.list()));

  app.post('/api/documents', upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Attach a PDF in the "file" field.' });

      const pages = await extractPages(req.file.buffer);
      const chunks = chunkPages(pages);
      if (chunks.length === 0) {
        return res.status(422).json({
          error: "No text found in this PDF. It may be a scanned image, which needs OCR first.",
        });
      }

      const vectors = await ai.embed(chunks.map((c) => c.text));
      const doc = store.add({ name: req.file.originalname, pages, chunks, vectors });
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/documents/:id', (req, res) => {
    store.remove(req.params.id) ? res.status(204).end() : res.status(404).json({ error: 'Document not found.' });
  });

  app.post('/api/documents/:id/ask', async (req, res, next) => {
    try {
      const question = String(req.body?.question || '').trim();
      if (!question) return res.status(400).json({ error: 'Question is required.' });
      if (question.length > 1000) return res.status(400).json({ error: 'Question is too long.' });
      if (!store.summary(req.params.id)) return res.status(404).json({ error: 'Document not found.' });

      const [qVec] = await ai.embed([question]);
      const sources = store.search(req.params.id, qVec, 5);
      const history = Array.isArray(req.body?.history) ? req.body.history : [];
      const text = await ai.answer(question, sources, history);

      res.json({
        answer: text,
        sources: sources.map((s, i) => ({ n: i + 1, page: s.page, score: Number(s.score.toFixed(3)), excerpt: s.text.slice(0, 400) })),
      });
    } catch (err) {
      next(err);
    }
  });

  // In production, serve the built React app from the same server.
  if (clientDist && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? `File is larger than ${MAX_MB} MB.` : status === 500 && !err.expose && !err.status ? 'Something went wrong. Check the server logs.' : err.message;
    if (status === 500) console.error(err);
    res.status(status).json({ error: message });
  });

  return app;
}
