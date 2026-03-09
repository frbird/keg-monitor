import { useState, useEffect } from 'react';
import './Dashboard.css';

function KegIcon({ percent, showPercent = true, beerColor = 'var(--beer)' }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="keg-icon" title={`${p}% full`}>
      <div className="keg-icon-body">
        <div className="keg-icon-fill" style={{ height: `${p}%`, backgroundColor: beerColor }} />
      </div>
      <div className="keg-icon-neck" />
      <div className="keg-icon-tap" />
      {showPercent && (
        <span className="keg-icon-percent">{p}%</span>
      )}
    </div>
  );
}

function TapCard({ tap, showPercent, showKegSize = true, tempUnit = 'F', showDevice = false }) {
  const tempC = tap.temperatureCelsius != null ? tap.temperatureCelsius : null;
  const tempF = tempC != null ? (tempC * 9 / 5 + 32) : null;

  return (
    <article className="tap-card">
      <div className="tap-card-header">
        {tap.logoUrl ? (
          <img src={tap.logoUrl} alt="" className="tap-card-logo" />
        ) : (
          <div className="tap-card-logo-placeholder" />
        )}
        <div className="tap-card-title">
          <h3>{tap.beerName || 'No beer assigned'}</h3>
          <p className="tap-card-meta">
            {tap.brewery && <span>{tap.brewery}</span>}
            {tap.beerStyle && <span>{tap.beerStyle}</span>}
            {showKegSize && tap.kegSizeName && <span>{tap.kegSizeName}</span>}
          </p>
        </div>
      </div>
      <div className="tap-card-keg">
        <KegIcon
          percent={tap.levelPercent}
          showPercent={showPercent}
          beerColor="var(--beer)"
        />
      </div>
      <div className="tap-card-ounces">
        <span className="tap-card-ounces-remaining">
          {tap.totalOunces != null && tap.remainingOunces != null
            ? `${Math.round(tap.remainingOunces)} / ${tap.totalOunces} oz remaining`
            : '—'}
        </span>
        <span className="tap-card-ounces-poured">
          {tap.totalOunces != null && tap.remainingOunces != null
            ? `${Math.round(Math.max(0, tap.totalOunces - tap.remainingOunces))} oz poured`
            : ''}
        </span>
      </div>
      <div className="tap-card-temp">
        {tempC != null ? (
          tempUnit === 'C' ? (
            <span className="temp-value">{tempC.toFixed(1)}°C</span>
          ) : (
            <span className="temp-value">{tempF.toFixed(1)}°F</span>
          )
        ) : (
          <span className="temp-na">—</span>
        )}
      </div>
      {showDevice && (tap.deviceBoard || (tap.deviceSensors && tap.deviceSensors.length)) ? (
        <div className="tap-card-device">
          {tap.deviceBoard && <span className="tap-card-device-board">{tap.deviceBoard}</span>}
          {tap.deviceSensors && Array.isArray(tap.deviceSensors) && tap.deviceSensors.length ? (
            <span className="tap-card-device-sensors">
              {tap.deviceSensors.map((s) => `${s.type}: ${s.model}`).join(' · ')}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function Dashboard() {
  const [data, setData] = useState({ taps: [], settings: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPercent, setShowPercent] = useState(() => {
    try {
      return localStorage.getItem('keg-show-percent') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleShowPercent = () => {
    const next = !showPercent;
    setShowPercent(next);
    try {
      localStorage.setItem('keg-show-percent', String(next));
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to load dashboard');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const settings = data.settings || { title: 'Keg Monitor', logoUrl: null, showKegSize: true, tempUnit: 'F', showDevice: false };

  if (loading && data.taps.length === 0) {
    return (
      <div className="dashboard dashboard-loading">
        <p>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard dashboard-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-brand">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="" className="dashboard-header-logo" />
          ) : null}
          <h1>{settings.title}</h1>
        </div>
        <div className="dashboard-header-actions">
          <label className="dashboard-percent-toggle">
            <input type="checkbox" checked={showPercent} onChange={toggleShowPercent} />
            <span>Show % on keg</span>
          </label>
          <a href="/admin" className="admin-link">Admin</a>
        </div>
      </header>
      <main className="dashboard-grid">
        {data.taps.length === 0 ? (
          <p className="empty-state">No taps configured. Add taps in Admin.</p>
        ) : (
          data.taps.map((tap) => (
            <TapCard
              key={tap.id}
              tap={tap}
              showPercent={showPercent}
              showKegSize={settings.showKegSize}
              tempUnit={settings.tempUnit}
              showDevice={settings.showDevice}
            />
          ))
        )}
      </main>
    </div>
  );
}
