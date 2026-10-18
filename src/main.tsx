import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes} from 'react-router-dom';
import App from './App.tsx';
import {AuthProvider} from './admin/AuthProvider';
import {RequireAdmin} from './admin/RequireAdmin';
import {AdminLogin} from './admin/AdminLogin';
import {AdminRegister} from './admin/AdminRegister';
import {AdminReport} from './admin/AdminReport';
import {MemberProvider} from './account/MemberProvider';
// Self-hosted so the CSP's font-src 'self' holds; same files Google Fonts serves.
import '@fontsource/michroma/400.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import './index.css';

// Path routing in production. Hash routing only for hosts that cannot serve an
// SPA fallback -- a preview build embedded in a single page, for instance.
const Router = import.meta.env.VITE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter;

// AuthProvider (with its is_admin check) wraps only the admin branch. The public
// app gets MemberProvider instead: it reads any stored member session locally,
// makes no admin check, and reports accounts unavailable when Supabase is not
// configured, so the app never depends on it.
const AdminLayout = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <MemberProvider>
              <App />
            </MemberProvider>
          }
        />
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
    </Router>
  </StrictMode>,
);
