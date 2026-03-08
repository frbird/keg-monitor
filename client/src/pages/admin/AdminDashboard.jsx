import { useState, useEffect } from 'react';
import './AdminDashboard.css';

const DEFAULT_SETTINGS = {
  title: 'Keg Monitor',
  logoUrl: '',
  showKegSize: true,
  tempUnit: 'F',
  showDevice: false
};

export default function AdminDashboard() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/dashboard-settings', { credentials: 'include' })
      .then((r) => r.json())
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/dashboard-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      setSettings(updated);
    } catch (err) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h1>Dashboard settings</h1>
      <p className="admin-page-desc">Customize the title, logo, and how tap cards appear on the main dashboard.</p>

      <form onSubmit={save} className="admin-dashboard-form">
        <section className="admin-dashboard-section">
          <h2 className="admin-dashboard-section-title">Header</h2>
          <label>Title</label>
          <input
            type="text"
            value={settings.title}
            onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
            placeholder="Keg Monitor"
          />
          <label>Logo URL (optional)</label>
          <input
            type="url"
            value={settings.logoUrl || ''}
            onChange={(e) => setSettings((s) => ({ ...s, logoUrl: e.target.value }))}
            placeholder="https://…"
          />
          {settings.logoUrl ? (
            <div className="admin-dashboard-logo-preview">
              <img src={settings.logoUrl} alt="Logo preview" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          ) : null}
        </section>

        <section className="admin-dashboard-section">
          <h2 className="admin-dashboard-section-title">Tap cards</h2>
          <label className="admin-dashboard-check">
            <input
              type="checkbox"
              checked={settings.showKegSize}
              onChange={(e) => setSettings((s) => ({ ...s, showKegSize: e.target.checked }))}
            />
            <span>Show keg size on tap cards</span>
          </label>
          <label className="admin-dashboard-check">
            <input
              type="checkbox"
              checked={settings.showDevice}
              onChange={(e) => setSettings((s) => ({ ...s, showDevice: e.target.checked }))}
            />
            <span>Show sensor/device info on tap cards</span>
          </label>
          <label>Temperature display</label>
          <select
            value={settings.tempUnit}
            onChange={(e) => setSettings((s) => ({ ...s, tempUnit: e.target.value }))}
          >
            <option value="F">Fahrenheit (°F)</option>
            <option value="C">Celsius (°C)</option>
          </select>
        </section>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </>
  );
}
