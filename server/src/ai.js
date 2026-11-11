import OpenAI from 'openai';

const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small';
const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini';

let client;
function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw Object.assign(new Error('OPENAI_API_KEY is not set on the server.'), { status: 500 });
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/** Embed many strings, batched to stay well under API request limits. */
export async function embed(texts, batchSize = 96) {
  const out = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const res = await getClient().embeddings.create({
      model: EMBED_MODEL,
      input: texts.slice(i, i + batchSize),
    });
    out.push(...res.data.map((d) => d.embedding));
  }
  return out;
}

export function buildMessages(question, sources, history = []) {
  const context = sources
    .map((s, i) => `[${i + 1}] (page ${s.page})\n${s.text}`)
    .join('\n\n---\n\n');

  return [
    {
      role: 'system',
      content:
        'You answer questions about a document using ONLY the numbered excerpts provided. ' +
        'Cite excerpts inline like [1] or [2][3]. If the excerpts do not contain the answer, ' +
        'say you could not find it in the document rather than guessing. Be concise.',
    },
    // Keep a little recent history so follow-up questions ("what about the second one?") work.
    ...history.slice(-6).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 2000) })),
    { role: 'user', content: `Excerpts:\n\n${context}\n\nQuestion: ${question}` },
  ];
}

export async function answer(question, sources, history) {
  const res = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: buildMessages(question, sources, history),
  });
  return res.choices[0]?.message?.content?.trim() || '';
}
