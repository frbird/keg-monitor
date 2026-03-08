import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import './AdminLayout.css';

export default function AdminLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/me', { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          if (!cancelled) navigate('/admin/login', { state: { from: { pathname: '/admin' } } });
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!cancelled && data) setUser(data);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
  }, [navigate]);

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    navigate('/admin/login');
  }

  if (loading) return <div className="admin-layout-loading">Loading…</div>;
  if (!user) return null;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">Keg Admin</h2>
        <nav className="admin-nav">
          <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
          <NavLink to="/admin/taps" className={({ isActive }) => isActive ? 'active' : ''}>Taps</NavLink>
          <NavLink to="/admin/beers" className={({ isActive }) => isActive ? 'active' : ''}>Beer Library</NavLink>
          <NavLink to="/admin/suppliers" className={({ isActive }) => isActive ? 'active' : ''}>Suppliers</NavLink>
          <NavLink to="/admin/devices" className={({ isActive }) => isActive ? 'active' : ''}>Devices</NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <span className="admin-user">{user.username}</span>
          <button type="button" onClick={logout} className="admin-logout">Logout</button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
