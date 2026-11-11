async function handle(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export const api = {
  listDocuments: () => fetch('/api/documents').then(handle),

  uploadDocument: (file) => {
    const form = new FormData();
    form.append('file', file);
    return fetch('/api/documents', { method: 'POST', body: form }).then(handle);
  },

  deleteDocument: (id) =>
    fetch(`/api/documents/${id}`, { method: 'DELETE' }).then((res) => {
      if (!res.ok && res.status !== 204) throw new Error('Could not delete document');
    }),

  ask: (id, question, history) =>
    fetch(`/api/documents/${id}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, history }),
    }).then(handle),
};
