export default function DocumentList({ docs, activeId, onSelect, onDelete }) {
  if (!docs.length) return null;
  return (
    <ul className="doclist">
      {docs.map((d) => (
        <li key={d.id} className={d.id === activeId ? 'active' : ''}>
          <button className="doclist-open" onClick={() => onSelect(d.id)} title={d.name}>
            <span className="doc-name">{d.name}</span>
            <span className="doc-meta">{d.pageCount} page{d.pageCount === 1 ? '' : 's'}</span>
          </button>
          <button className="doclist-delete" onClick={() => onDelete(d.id)} aria-label={`Remove ${d.name}`}>×</button>
        </li>
      ))}
    </ul>
  );
}
