import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminBeers from './pages/admin/AdminBeers';
import AdminTaps from './pages/admin/AdminTaps';
import AdminDevices from './pages/admin/AdminDevices';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/taps" replace />} />
        <Route path="taps" element={<AdminTaps />} />
        <Route path="beers" element={<AdminBeers />} />
        <Route path="devices" element={<AdminDevices />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
