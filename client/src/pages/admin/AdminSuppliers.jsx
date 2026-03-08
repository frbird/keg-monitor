import { useState, useEffect } from 'react';
import './AdminSuppliers.css';

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', website: '' });

  useEffect(() => {
    fetch('/api/admin/suppliers', { credentials: 'include' })
      .then((r) => r.json())
      .then(setSuppliers)
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditing('new');
    setForm({ name: '', email: '', phone: '', website: '' });
  }

  function openEdit(supplier) {
    setEditing(supplier.id);
    setForm({
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      website: supplier.website || ''
    });
  }

  function closeForm() {
    setEditing(null);
  }

  async function save(e) {
    e.preventDefault();
    const payload = { name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, website: form.website.trim() || null };
    if (editing === 'new') {
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!res.ok) return;
      const { id } = await res.json();
      setSuppliers((prev) => [...prev, { id, ...payload }]);
    } else {
      await fetch(`/api/admin/suppliers/${editing}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      setSuppliers((prev) => prev.map((s) => (s.id === editing ? { ...s, ...payload } : s)));
    }
    closeForm();
  }

  async function remove(id) {
    if (!confirm('Remove this supplier? Beers using it will have their supplier cleared.')) return;
    await fetch(`/api/admin/suppliers/${id}`, { method: 'DELETE', credentials: 'include' });
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h1>Suppliers</h1>
      <p className="admin-page-desc">Beer suppliers (where you purchase kegs). Select a supplier when adding a beer to the library instead of typing contact info each time.</p>
      <button type="button" className="admin-btn primary" onClick={openAdd}>Add supplier</button>

      {editing && (
        <div className="admin-modal" onClick={closeForm}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === 'new' ? 'Add supplier' : 'Edit supplier'}</h2>
            <form onSubmit={save}>
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <label>Website</label>
              <input type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." />
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
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Website</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr><td colSpan={5}>No suppliers. Add one to select when adding beers.</td></tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email || '—'}</td>
                  <td>{s.phone || '—'}</td>
                  <td>{s.website ? <a href={s.website} target="_blank" rel="noopener noreferrer">{s.website}</a> : '—'}</td>
                  <td>
                    <button type="button" className="admin-btn small" onClick={() => openEdit(s)}>Edit</button>
                    <button type="button" className="admin-btn small danger" onClick={() => remove(s.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
