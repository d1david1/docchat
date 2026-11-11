# DocChat — chat with your PDFs

Upload a PDF and ask it questions in plain English. Answers come back with
inline citations and the exact page and excerpt they were drawn from, so you
can check every claim against the source.

Built with **React (Vite)** on the front end and **Node.js/Express** on the
back end, using the **OpenAI API** for embeddings and answers
(retrieval-augmented generation).

## How it works

1. **Extract** — the server reads the PDF page by page (`pdfjs-dist`), keeping
   page numbers for citations.
2. **Chunk** — each page is split into overlapping ~1,200-character chunks that
   never cross page boundaries.
3. **Embed** — chunks are embedded with `text-embedding-3-small` and held in an
   in-memory vector store.
4. **Retrieve & answer** — each question is embedded, the top 5 chunks by
   cosine similarity are retrieved, and the chat model answers **only from
   those excerpts**, citing them as [1], [2]… If the document doesn't contain
   the answer, it says so instead of guessing.

## Run it locally

```bash
# 1. Server
cd server
npm install
cp .env.example .env     # add your OpenAI API key
npm run dev              # http://localhost:3001

# 2. Client (separate terminal)
cd client
npm install
npm run dev              # http://localhost:5173 (proxies /api to :3001)
```

### Production

```bash
cd client && npm run build   # outputs client/dist
cd ../server && npm start    # serves the API and the built client on :3001
```

## Configuration (`server/.env`)

| Variable        | Default                  | Purpose                    |
| --------------- | ------------------------ | -------------------------- |
| `OPENAI_API_KEY`| —                        | Required                   |
| `CHAT_MODEL`    | `gpt-4o-mini`            | Answering model            |
| `EMBED_MODEL`   | `text-embedding-3-small` | Embedding model            |
| `PORT`          | `3001`                   | Server port                |
| `MAX_UPLOAD_MB` | `15`                     | Upload size limit          |

## Tests

```bash
cd server && npm test
```

Covers chunking, cosine ranking, prompt construction, the full API flow
(upload validation, ask, delete) and real PDF text extraction — all with a
fake AI layer, so no API key is needed to run them.

## Design notes & limits

- Documents live in memory (capped at 20) and are lost on restart — right for
  a demo, and the store is one class (`server/src/store.js`) you'd swap for
  Postgres + pgvector to persist.
- Scanned PDFs have no text layer; the server detects this and returns a clear
  error instead of indexing nothing. OCR would be the next step.
- The AI layer is injected into the Express app, which is what makes the test
  suite runnable without a key.
