// Starts the full app (client build + API) with a FAKE AI layer, for UI smoke
// tests and screenshots without an OpenAI key. Not part of `npm test`.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';

const VOCAB = ['refund', 'warranty', 'delivery', 'return', 'policy', 'days', 'cost', 'price'];
const vec = (t) => {
  const s = t.toLowerCase();
  return VOCAB.map((w) => (s.split(w).length - 1) + 0.001);
};

const fakeAi = {
  embed: async (texts) => texts.map(vec),
  answer: async (_q, sources) =>
    `Refunds are available within 30 days of purchase, as long as the item is unused [1]. After that window, the document says returns are handled case by case [2]. (Demo answer from page ${sources[0].page}.)`,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
const port = Number(process.env.PORT || 3001);
createApp({ ai: fakeAi, clientDist }).listen(port, () => console.log(`smoke server on :${port}`));
