import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/pages/Login/LoginPage';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { TiendasPage } from '@/pages/Tiendas/TiendasPage';
import { TiendaDetailPage } from '@/pages/Tiendas/TiendaDetailPage';
import { TramitesPage } from '@/pages/Tramites/TramitesPage';
import { TramiteDetailPage } from '@/pages/Tramites/TramiteDetailPage';
import { AlertasPage } from '@/pages/Alertas/AlertasPage';
import { DocumentosPage } from '@/pages/Documentos/DocumentosPage';
import { ToastContainer } from '@/components/Toast';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* App routes */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tiendas" element={<TiendasPage />} />
            <Route path="/tiendas/:id" element={<TiendaDetailPage />} />
            <Route path="/tiendas/:id/tramites/:tramiteId" element={<TramiteDetailPage />} />
            <Route path="/tramites" element={<TramitesPage />} />
            <Route path="/alertas" element={<AlertasPage />} />
            <Route path="/documentos" element={<DocumentosPage />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
