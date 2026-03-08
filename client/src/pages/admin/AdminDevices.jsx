import { useState, useEffect, useCallback } from 'react';
import './AdminDevices.css';

const POLL_INTERVAL_MS = 5000;

function formatTimeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return d.toLocaleString();
}

export default function AdminDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSecret, setNewSecret] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', flow_model: '', temp_model: '' });

  const fetchDevices = useCallback(() => {
    return fetch('/api/admin/devices', { credentials: 'include' })
      .then((r) => r.json())
      .then(setDevices);
  }, []);

  useEffect(() => {
    fetchDevices().finally(() => setLoading(false));
  }, [fetchDevices]);

  useEffect(() => {
    if (!devices.length) return;
    const interval = setInterval(fetchDevices, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [devices.length, fetchDevices]);

  async function createDevice() {
    const res = await fetch('/api/admin/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({})
    });
    const data = await res.json();
    setNewSecret(data);
    setDevices((prev) => [...prev, { id: data.id, name: data.name, created_at: new Date().toISOString(), connection_status: 'never_seen', latest_temperatures: [], latest_pours: [] }]);
  }

  function dismissSecret() {
    setNewSecret(null);
  }

  function openEdit(device) {
    const flow = (device.sensor_config || []).find((s) => s.type === 'flow');
    const temp = (device.sensor_config || []).find((s) => s.type === 'temperature');
    setEditing(device.id);
    setForm({
      name: device.name || '',
      flow_model: flow?.model || '',
      temp_model: temp?.model || ''
    });
  }

  function closeEdit() {
    setEditing(null);
  }

  async function saveDevice(e) {
    e.preventDefault();
    const sensor_config = [];
    if (form.flow_model.trim()) sensor_config.push({ type: 'flow', model: form.flow_model.trim() });
    if (form.temp_model.trim()) sensor_config.push({ type: 'temperature', model: form.temp_model.trim() });
    await fetch(`/api/admin/devices/${editing}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: form.name.trim() || null, sensor_config })
    });
    setDevices((prev) => prev.map((d) => (d.id === editing ? { ...d, name: form.name.trim() || null, sensor_config } : d)));
    closeEdit();
  }

  async function deleteDevice(id) {
    if (!confirm('Remove this device? Taps using it will be unassigned.')) return;
    await fetch(`/api/admin/devices/${id}`, { method: 'DELETE', credentials: 'include' });
    setDevices((prev) => prev.filter((d) => d.id !== id));
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h1>Devices</h1>
      <p className="admin-page-desc">
        Hardware uses a device ID and secret to send metrics. Health is based on recent activity; devices can send a heartbeat to <code>POST /api/device/heartbeat</code> or metrics to keep status &quot;connected&quot;.
      </p>
      <button type="button" className="admin-btn primary" onClick={createDevice}>Create device</button>

      {newSecret && (
        <div className="admin-secret-box">
          <h3>Device credentials — copy these; the secret won&apos;t be shown again.</h3>
          <p><strong>Device ID:</strong> <code>{newSecret.id}</code></p>
          <p><strong>Secret:</strong> <code>{newSecret.secret}</code></p>
          <p>Use these as <code>X-Device-Id</code> and <code>X-Device-Secret</code> headers when posting to <code>/api/device/metrics</code> or <code>/api/device/heartbeat</code>.</p>
          <button type="button" className="admin-btn" onClick={dismissSecret}>Done</button>
        </div>
      )}

      {editing && (
        <div className="admin-modal" onClick={closeEdit}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit device</h2>
            <form onSubmit={saveDevice}>
              <label>Nickname</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Kitchen Arduino" />
              <label>Flow sensor model</label>
              <input value={form.flow_model} onChange={(e) => setForm((f) => ({ ...f, flow_model: e.target.value }))} placeholder="e.g. Titan 300" />
              <label>Temperature sensor model</label>
              <input value={form.temp_model} onChange={(e) => setForm((f) => ({ ...f, temp_model: e.target.value }))} placeholder="e.g. DS18B20" />
              <div className="admin-form-actions">
                <button type="button" onClick={closeEdit}>Cancel</button>
                <button type="submit" className="primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-table-wrap admin-devices-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Nickname</th>
              <th>Device ID</th>
              <th>Board</th>
              <th>Sensors</th>
              <th>Last seen</th>
              <th>Latest readings</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr><td colSpan={8}>No devices. Create one and configure your Arduino with the credentials.</td></tr>
            ) : (
              devices.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className={`device-status device-status-${d.connection_status}`} title={d.connection_status}>
                      {d.connection_status === 'connected' ? 'Connected' : d.connection_status === 'disconnected' ? 'Disconnected' : 'Never seen'}
                    </span>
                  </td>
                  <td>{d.name || '—'}</td>
                  <td><code className="device-id">{d.id}</code></td>
                  <td>{d.board_model || '—'}</td>
                  <td>
                    {d.sensor_config && d.sensor_config.length
                      ? d.sensor_config.map((s) => `${s.type}: ${s.model}`).join(', ')
                      : '—'}
                  </td>
                  <td className="admin-devices-last-seen">{formatTimeAgo(d.last_seen_at)}</td>
                  <td className="admin-devices-readings">
                    {d.latest_temperatures?.length || d.latest_pours?.length ? (
                      <span>
                        {d.latest_temperatures?.map((t) => `Tap ${t.tap_id}: ${t.celsius != null ? t.celsius.toFixed(1) + '°C' : '—'}`).join(' · ')}
                        {d.latest_temperatures?.length && d.latest_pours?.length ? ' · ' : ''}
                        {d.latest_pours?.map((p) => `Pour ${p.tap_id}: ${p.ounces?.toFixed(1) ?? p.pulses} oz`).join(' · ')}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <button type="button" className="admin-btn small" onClick={() => openEdit(d)}>Edit</button>
                    <button type="button" className="admin-btn small danger" onClick={() => deleteDevice(d.id)}>Delete</button>
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
