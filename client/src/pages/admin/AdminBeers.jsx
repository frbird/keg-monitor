import { useState, useEffect } from 'react';
import './AdminBeers.css';

export default function AdminBeers() {
  const [beers, setBeers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ brewery: '', beer_style: '', name: '', supplier_id: '', purchase_business: '', business_email: '', business_phone: '', supplier_website: '', logo_url: '' });

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/beers', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/admin/suppliers', { credentials: 'include' }).then((r) => r.json())
    ]).then(([b, s]) => {
      setBeers(b);
      setSuppliers(s);
    }).finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditing('new');
    setForm({ brewery: '', beer_style: '', name: '', supplier_id: '', purchase_business: '', business_email: '', business_phone: '', supplier_website: '', logo_url: '' });
  }

  function openEdit(beer) {
    setEditing(beer.id);
    const supplierId = beer.supplier_id != null ? String(beer.supplier_id) : '';
    setForm({
      brewery: beer.brewery,
      beer_style: beer.beer_style,
      name: beer.name,
      supplier_id: supplierId,
      purchase_business: beer.supplier_id ? (beer.supplier_name || '') : (beer.purchase_business || ''),
      business_email: beer.supplier_id ? (beer.supplier_email || '') : (beer.business_email || ''),
      business_phone: beer.supplier_id ? (beer.supplier_phone || '') : (beer.business_phone || ''),
      supplier_website: beer.supplier_id ? (beer.supplier_website || '') : '',
      logo_url: beer.logo_url || ''
    });
  }

  function closeForm() {
    setEditing(null);
  }

  async function save(e) {
    e.preventDefault();
    const supplierId = form.supplier_id ? Number(form.supplier_id) : null;
    const payload = {
      brewery: form.brewery,
      beer_style: form.beer_style,
      name: form.name,
      supplier_id: supplierId,
      purchase_business: supplierId ? null : (form.purchase_business || null),
      business_email: supplierId ? null : (form.business_email || null),
      business_phone: supplierId ? null : (form.business_phone || null),
      logo_url: form.logo_url || null
    };
    if (editing === 'new') {
      const res = await fetch('/api/admin/beers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to create beer');
        return;
      }
      const { id } = await res.json();
      setBeers((prev) => [...prev, { id, ...payload }]);
    } else {
      const res = await fetch(`/api/admin/beers/${editing}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to update beer');
        return;
      }
      // Refetch so we have full row (supplier_name, etc.)
      const updated = await fetch('/api/admin/beers', { credentials: 'include' }).then((r) => r.json());
      setBeers(updated);
    }
    closeForm();
  }

  async function remove(id) {
    if (!confirm('Delete this beer from the library?')) return;
    const beerId = Number(id);
    if (Number.isNaN(beerId)) return;
    const res = await fetch(`/api/admin/beers/${beerId}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Delete failed. The beer may be in use on a tap.');
      return;
    }
    setBeers((prev) => prev.filter((b) => Number(b.id) !== beerId));
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
              <label>Supplier (where you purchase)</label>
              <select value={form.supplier_id} onChange={(e) => {
                const id = e.target.value;
                const sup = suppliers.find((s) => String(s.id) === id);
                setForm((f) => ({
                  ...f,
                  supplier_id: id,
                  purchase_business: sup ? sup.name : '',
                  business_email: sup ? (sup.email || '') : '',
                  business_phone: sup ? (sup.phone || '') : '',
                  supplier_website: sup ? (sup.website || '') : ''
                }));
              }}>
                <option value="">— None —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <label>Purchase business</label>
              <input value={form.purchase_business} readOnly placeholder={form.supplier_id ? '' : 'Select a supplier above'} />
              <label>Business email</label>
              <input type="email" value={form.business_email} readOnly placeholder={form.supplier_id ? '' : 'Select a supplier above'} />
              <label>Business phone</label>
              <input value={form.business_phone} readOnly placeholder={form.supplier_id ? '' : 'Select a supplier above'} />
              {form.supplier_id && form.supplier_website ? (
                <>
                  <label>Website</label>
                  <input type="url" value={form.supplier_website} readOnly />
                </>
              ) : null}
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
              <th>Supplier / Purchase</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {beers.map((b) => (
              <tr key={b.id}>
                <td>{b.brewery}</td>
                <td>{b.beer_style}</td>
                <td>{b.name}</td>
                <td>{b.supplier_id ? (b.supplier_name || '—') : (b.purchase_business || '—')}</td>
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
