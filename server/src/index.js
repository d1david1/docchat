import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const port = Number(process.env.PORT || 3001);
createApp({ clientDist }).listen(port, () => {
  console.log(`DocQA server listening on http://localhost:${port}`);
});
