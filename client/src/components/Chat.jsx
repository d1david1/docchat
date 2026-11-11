import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

function Sources({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;
  return (
    <div className="sources">
      <button className="sources-toggle" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} sources ({sources.map((s) => `p.${s.page}`).join(', ')})
      </button>
      {open && (
        <ol>
          {sources.map((s) => (
            <li key={s.n}>
              <strong>[{s.n}] page {s.page}</strong>
              <blockquote>{s.excerpt}…</blockquote>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function Chat({ doc, threads }) {
  const [messages, setMessages] = useState(() => threads.current.get(doc.id) || []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    threads.current.set(doc.id, messages);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, doc.id, threads]);

  const send = async (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput('');
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', content: question }]);
    try {
      const history = messages.map(({ role, content }) => ({ role, content }));
      const res = await api.ask(doc.id, question, history);
      setMessages((m) => [...m, { role: 'assistant', content: res.answer, sources: res.sources }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `Sorry — ${err.message}`, isError: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="chat">
      <header className="chat-header">
        <h2>{doc.name}</h2>
        <span>{doc.pageCount} pages indexed</span>
      </header>
      <div className="chat-scroll">
        {messages.length === 0 && (
          <p className="chat-hint">Try: “Summarise this document in three bullet points” or “What does it say about…?”</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role} ${m.isError ? 'is-error' : ''}`}>
            <p>{m.content}</p>
            {m.role === 'assistant' && <Sources sources={m.sources} />}
          </div>
        ))}
        {busy && <div className="bubble assistant pending">Thinking…</div>}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask something about ${doc.name}`}
          maxLength={1000}
          autoFocus
        />
        <button type="submit" disabled={busy || !input.trim()}>Ask</button>
      </form>
    </div>
  );
}
