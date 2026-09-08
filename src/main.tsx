import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Navigate, Outlet, Route, Routes} from 'react-router-dom';
import App from './App.tsx';
import {AuthProvider} from './admin/AuthProvider';
import {RequireAdmin} from './admin/RequireAdmin';
import {AdminLogin} from './admin/AdminLogin';
import {AdminRegister} from './admin/AdminRegister';
import {AdminReport} from './admin/AdminReport';
import './index.css';

// AuthProvider wraps only the admin branch, so the public app neither performs
// an auth round trip nor depends on Supabase being configured.
const AdminLayout = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route element={<AdminLayout />}>
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminReport />
              </RequireAdmin>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
