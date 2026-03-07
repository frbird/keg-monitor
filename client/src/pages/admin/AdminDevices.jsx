import { useState, useEffect } from 'react';
import './AdminDevices.css';

export default function AdminDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSecret, setNewSecret] = useState(null);

  useEffect(() => {
    fetch('/api/admin/devices', { credentials: 'include' })
      .then((r) => r.json())
      .then(setDevices)
      .finally(() => setLoading(false));
  }, []);

  async function createDevice() {
    const res = await fetch('/api/admin/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({})
    });
    const data = await res.json();
    setNewSecret(data);
    setDevices((prev) => [...prev, { id: data.id, name: data.name, created_at: new Date().toISOString() }]);
  }

  function dismissSecret() {
    setNewSecret(null);
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h1>Devices</h1>
      <p className="admin-page-desc">Hardware (e.g. Arduino R4 WiFi) uses a device ID and secret to send metrics over HTTPS. Create a device and configure the same credentials in your firmware.</p>
      <button type="button" className="admin-btn primary" onClick={createDevice}>Create device</button>

      {newSecret && (
        <div className="admin-secret-box">
          <h3>Device credentials — copy these; the secret won’t be shown again.</h3>
          <p><strong>Device ID:</strong> <code>{newSecret.id}</code></p>
          <p><strong>Secret:</strong> <code>{newSecret.secret}</code></p>
          <p>Use these as <code>X-Device-Id</code> and <code>X-Device-Secret</code> headers when posting to <code>/api/device/metrics</code>.</p>
          <button type="button" className="admin-btn" onClick={dismissSecret}>Done</button>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Device ID</th>
              <th>Name</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr><td colSpan={3}>No devices. Create one for your Arduino.</td></tr>
            ) : (
              devices.map((d) => (
                <tr key={d.id}>
                  <td><code>{d.id}</code></td>
                  <td>{d.name || '—'}</td>
                  <td>{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
