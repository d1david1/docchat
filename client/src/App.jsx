import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import UploadZone from './components/UploadZone.jsx';
import DocumentList from './components/DocumentList.jsx';
import Chat from './components/Chat.jsx';

export default function App() {
  const [docs, setDocs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  // One chat thread per document, kept client-side.
  const threads = useRef(new Map());

  useEffect(() => {
    api.listDocuments().then(setDocs).catch((e) => setError(e.message));
  }, []);

  const upload = useCallback(async (file) => {
    setError(null);
    setUploading(true);
    try {
      const doc = await api.uploadDocument(file);
      setDocs((d) => [...d, doc]);
      setActiveId(doc.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    await api.deleteDocument(id).catch(() => {});
    threads.current.delete(id);
    setDocs((d) => d.filter((x) => x.id !== id));
    setActiveId((a) => (a === id ? null : a));
  }, []);

  const active = docs.find((d) => d.id === activeId) || null;

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1 className="brand">Doc<span>Chat</span></h1>
        <p className="tagline">Upload a PDF, then ask it questions. Answers cite the pages they came from.</p>
        <UploadZone onUpload={upload} busy={uploading} />
        {error && <p className="error" role="alert">{error}</p>}
        <DocumentList docs={docs} activeId={activeId} onSelect={setActiveId} onDelete={remove} />
      </aside>
      <main className="main">
        {active ? (
          <Chat key={active.id} doc={active} threads={threads} />
        ) : (
          <div className="empty">
            <p>{docs.length ? 'Pick a document on the left to start asking questions.' : 'Upload your first PDF to get started.'}</p>
          </div>
        )}
      </main>
    </div>
  );
}
