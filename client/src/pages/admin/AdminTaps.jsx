import { useState, useEffect } from 'react';
import './AdminTaps.css';

export default function AdminTaps() {
  const [taps, setTaps] = useState([]);
  const [beers, setBeers] = useState([]);
  const [kegSizes, setKegSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', keg_size_id: '', beer_id: '', device_id: '', device_tap_index: 0, flow_pin: 2, temp_pin: 3, pulses_per_ounce: 1, new_keg: false });

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/taps', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/admin/beers', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/admin/keg-sizes', { credentials: 'include' }).then((r) => r.json())
    ]).then(([t, b, k]) => {
      setTaps(t);
      setBeers(b);
      setKegSizes(k);
    }).finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditing('new');
    setForm({
      name: `Tap ${taps.length + 1}`,
      keg_size_id: kegSizes[0]?.id ?? 1,
      beer_id: '',
      device_id: '',
      device_tap_index: 0,
      flow_pin: 2,
      temp_pin: 3,
      pulses_per_ounce: 1,
      new_keg: false
    });
  }

  function openEdit(tap) {
    setEditing(tap.id);
    setForm({
      name: tap.name,
      keg_size_id: tap.keg_size_id,
      beer_id: tap.beer_id ?? '',
      device_id: tap.device_id ?? '',
      device_tap_index: tap.device_tap_index ?? 0,
      flow_pin: tap.flow_pin ?? 2,
      temp_pin: tap.temp_pin ?? 3,
      pulses_per_ounce: tap.pulses_per_ounce ?? 1,
      new_keg: false
    });
  }

  function closeForm() {
    setEditing(null);
  }

  async function save(e) {
    e.preventDefault();
    const payload = {
      ...form,
      beer_id: form.beer_id || null,
      device_id: form.device_id || null
    };
    if (editing === 'new') {
      const res = await fetch('/api/admin/taps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!res.ok) return;
      const { id } = await res.json();
      const newTap = { id, ...payload };
      setTaps((prev) => [...prev, newTap]);
    } else {
      await fetch(`/api/admin/taps/${editing}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      setTaps((prev) => prev.map((t) => (t.id === editing ? { ...t, ...payload } : t)));
    }
    closeForm();
  }

  async function setNewKeg(tapId) {
    if (!confirm('Record a new keg for this tap? Remaining amount will reset to full.')) return;
    await fetch(`/api/admin/taps/${tapId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ new_keg: true })
    });
    setTaps((prev) => prev.map((t) => {
      if (t.id !== tapId) return t;
      const size = kegSizes.find((k) => k.id === t.keg_size_id);
      const oz = size ? size.ounces : t.total_ounces;
      return { ...t, total_ounces: oz, remaining_ounces: oz };
    }));
  }

  async function remove(id) {
    if (!confirm('Remove this tap?')) return;
    await fetch(`/api/admin/taps/${id}`, { method: 'DELETE', credentials: 'include' });
    setTaps((prev) => prev.filter((t) => t.id !== id));
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h1>Taps</h1>
      <p className="admin-page-desc">Assign beers and keg sizes. Use &quot;New keg&quot; when you replace a keg to reset the level.</p>
      <button type="button" className="admin-btn primary" onClick={openAdd}>Add tap</button>

      {editing && (
        <div className="admin-modal" onClick={closeForm}>
          <div className="admin-modal-content admin-modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === 'new' ? 'Add tap' : 'Edit tap'}</h2>
            <form onSubmit={save}>
              <label>Tap name *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <label>Keg size</label>
              <select value={form.keg_size_id} onChange={(e) => setForm((f) => ({ ...f, keg_size_id: Number(e.target.value) }))}>
                {kegSizes.map((k) => (
                  <option key={k.id} value={k.id}>{k.name} ({k.ounces} oz)</option>
                ))}
              </select>
              <label>Beer on tap</label>
              <select value={form.beer_id} onChange={(e) => setForm((f) => ({ ...f, beer_id: e.target.value ? Number(e.target.value) : '' }))}>
                <option value="">— None —</option>
                {beers.map((b) => (
                  <option key={b.id} value={b.id}>{b.brewery} – {b.name}</option>
                ))}
              </select>
              <label>Device ID (for hardware)</label>
              <input value={form.device_id} onChange={(e) => setForm((f) => ({ ...f, device_id: e.target.value }))} placeholder="Same as in Arduino config" />
              <label>Device tap index (0 = first tap on this device)</label>
              <input type="number" min="0" value={form.device_tap_index} onChange={(e) => setForm((f) => ({ ...f, device_tap_index: Number(e.target.value) }))} />
              <label>Flow sensor pin (Arduino)</label>
              <input type="number" min="0" max="20" value={form.flow_pin} onChange={(e) => setForm((f) => ({ ...f, flow_pin: Number(e.target.value) }))} />
              <label>Temperature sensor pin (Arduino 1-Wire)</label>
              <input type="number" min="0" max="20" value={form.temp_pin} onChange={(e) => setForm((f) => ({ ...f, temp_pin: Number(e.target.value) }))} />
              <label>Pulses per ounce (Titan 300 calibration)</label>
              <input type="number" step="0.01" min="0.1" value={form.pulses_per_ounce} onChange={(e) => setForm((f) => ({ ...f, pulses_per_ounce: Number(e.target.value) }))} />
              <div className="admin-form-actions">
                <button type="button" onClick={closeForm}>Cancel</button>
                <button type="submit" className="primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-taps-grid">
        {taps.map((t) => (
          <div key={t.id} className="admin-tap-card">
            <div className="admin-tap-card-header">
              <strong>{t.name}</strong>
              <span className="admin-tap-level">{t.remaining_ounces != null ? Math.round(100 * t.remaining_ounces / (t.total_ounces || 1)) : 0}%</span>
            </div>
            <p className="admin-tap-beer">{t.beer_name ? `${t.brewery} – ${t.beer_name}` : 'No beer'}</p>
            <p className="admin-tap-meta">{t.keg_size_name} · {t.remaining_ounces != null ? `${Math.round(t.remaining_ounces)} / ${t.total_ounces} oz` : '—'}</p>
            <div className="admin-tap-actions">
              <button type="button" className="admin-btn small" onClick={() => openEdit(t)}>Edit</button>
              <button type="button" className="admin-btn small" onClick={() => setNewKeg(t.id)}>New keg</button>
              <button type="button" className="admin-btn small danger" onClick={() => remove(t.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
