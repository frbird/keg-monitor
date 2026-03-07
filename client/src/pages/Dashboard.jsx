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

function TapCard({ tap, showPercent }) {
  const tempF = tap.temperatureCelsius != null
    ? (tap.temperatureCelsius * 9 / 5 + 32).toFixed(1)
    : null;
  const tempC = tap.temperatureCelsius != null
    ? tap.temperatureCelsius.toFixed(1)
    : null;

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
            {tap.kegSizeName && <span>{tap.kegSizeName}</span>}
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
      <div className="tap-card-temp">
        {tempF != null ? (
          <>
            <span className="temp-value">{tempF}°F</span>
            <span className="temp-unit"> / {tempC}°C</span>
          </>
        ) : (
          <span className="temp-na">—</span>
        )}
      </div>
    </article>
  );
}

export default function Dashboard() {
  const [data, setData] = useState({ taps: [] });
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
        <h1>Keg Monitor</h1>
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
          data.taps.map((tap) => <TapCard key={tap.id} tap={tap} showPercent={showPercent} />)
        )}
      </main>
    </div>
  );
}
