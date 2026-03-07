import { useState, useEffect } from 'react';
import './AdminBeers.css';

export default function AdminBeers() {
  const [beers, setBeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ brewery: '', beer_style: '', name: '', purchase_business: '', business_email: '', business_phone: '', logo_url: '' });

  useEffect(() => {
    fetch('/api/admin/beers', { credentials: 'include' })
      .then((r) => r.json())
      .then(setBeers)
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditing('new');
    setForm({ brewery: '', beer_style: '', name: '', purchase_business: '', business_email: '', business_phone: '', logo_url: '' });
  }

  function openEdit(beer) {
    setEditing(beer.id);
    setForm({
      brewery: beer.brewery,
      beer_style: beer.beer_style,
      name: beer.name,
      purchase_business: beer.purchase_business || '',
      business_email: beer.business_email || '',
      business_phone: beer.business_phone || '',
      logo_url: beer.logo_url || ''
    });
  }

  function closeForm() {
    setEditing(null);
  }

  async function save(e) {
    e.preventDefault();
    const payload = { ...form };
    if (editing === 'new') {
      const res = await fetch('/api/admin/beers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!res.ok) return;
      const { id } = await res.json();
      setBeers((prev) => [...prev, { id, ...payload }]);
    } else {
      await fetch(`/api/admin/beers/${editing}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      setBeers((prev) => prev.map((b) => (b.id === editing ? { ...b, ...payload } : b)));
    }
    closeForm();
  }

  async function remove(id) {
    if (!confirm('Delete this beer from the library?')) return;
    await fetch(`/api/admin/beers/${id}`, { method: 'DELETE', credentials: 'include' });
    setBeers((prev) => prev.filter((b) => b.id !== id));
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h1>Beer Library</h1>
      <p className="admin-page-desc">Manage beers: brewery, style, name, and where to purchase.</p>
      <button type="button" className="admin-btn primary" onClick={openAdd}>Add beer</button>

      {editing && (
        <div className="admin-modal" onClick={closeForm}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === 'new' ? 'Add beer' : 'Edit beer'}</h2>
            <form onSubmit={save}>
              <label>Brewery *</label>
              <input value={form.brewery} onChange={(e) => setForm((f) => ({ ...f, brewery: e.target.value }))} required />
              <label>Beer style *</label>
              <input value={form.beer_style} onChange={(e) => setForm((f) => ({ ...f, beer_style: e.target.value }))} required />
              <label>Beer name (from brewery) *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <label>Purchase business</label>
              <input value={form.purchase_business} onChange={(e) => setForm((f) => ({ ...f, purchase_business: e.target.value }))} />
              <label>Business email</label>
              <input type="email" value={form.business_email} onChange={(e) => setForm((f) => ({ ...f, business_email: e.target.value }))} />
              <label>Business phone</label>
              <input value={form.business_phone} onChange={(e) => setForm((f) => ({ ...f, business_phone: e.target.value }))} />
              <label>Brewery logo URL</label>
              <input value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
              <div className="admin-form-actions">
                <button type="button" onClick={closeForm}>Cancel</button>
                <button type="submit" className="primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Brewery</th>
              <th>Style</th>
              <th>Name</th>
              <th>Purchase business</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {beers.map((b) => (
              <tr key={b.id}>
                <td>{b.brewery}</td>
                <td>{b.beer_style}</td>
                <td>{b.name}</td>
                <td>{b.purchase_business || '—'}</td>
                <td>
                  <button type="button" className="admin-btn small" onClick={() => openEdit(b)}>Edit</button>
                  <button type="button" className="admin-btn small danger" onClick={() => remove(b.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
