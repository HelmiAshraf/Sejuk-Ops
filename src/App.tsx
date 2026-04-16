import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import OrdersPage from './pages/admin/OrdersPage';
import NewOrderPage from './pages/admin/NewOrderPage';
import OrderDetailPage from './pages/admin/OrderDetailPage';
import MyJobsPage from './pages/technician/MyJobsPage';
import JobDetailPage from './pages/technician/JobDetailPage';
import ReviewPage from './pages/manager/ReviewPage';
import DashboardPage from './pages/manager/DashboardPage';
import type { Role } from './types';
import type { ReactNode } from 'react';

function ProtectedRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin */}
      <Route path="/admin/orders" element={
        <ProtectedRoute roles={['admin']}><OrdersPage /></ProtectedRoute>
      } />
      <Route path="/admin/orders/new" element={
        <ProtectedRoute roles={['admin']}><NewOrderPage /></ProtectedRoute>
      } />
      <Route path="/admin/orders/:id" element={
        <ProtectedRoute roles={['admin']}><OrderDetailPage /></ProtectedRoute>
      } />

      {/* Technician */}
      <Route path="/technician/jobs" element={
        <ProtectedRoute roles={['technician']}><MyJobsPage /></ProtectedRoute>
      } />
      <Route path="/technician/jobs/:id" element={
        <ProtectedRoute roles={['technician']}><JobDetailPage /></ProtectedRoute>
      } />

      {/* Manager */}
      <Route path="/manager/dashboard" element={
        <ProtectedRoute roles={['manager']}><DashboardPage /></ProtectedRoute>
      } />
      <Route path="/manager/review" element={
        <ProtectedRoute roles={['manager']}><ReviewPage /></ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="/" element={
        user?.role === 'admin' ? <Navigate to="/admin/orders" replace /> :
        user?.role === 'technician' ? <Navigate to="/technician/jobs" replace /> :
        user?.role === 'manager' ? <Navigate to="/manager/review" replace /> :
        <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
