import { useRef, useState } from 'react';

export default function UploadZone({ onUpload, busy }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files) => {
    const file = files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''} ${busy ? 'busy' : ''}`}
      onClick={() => !busy && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) pick(e.dataTransfer.files); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !busy && inputRef.current?.click()}
      aria-label="Upload a PDF"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => { pick(e.target.files); e.target.value = ''; }}
      />
      {busy ? (
        <span className="spinner" aria-live="polite">Reading &amp; indexing…</span>
      ) : (
        <span><strong>Drop a PDF here</strong><br />or click to browse</span>
      )}
    </div>
  );
}
