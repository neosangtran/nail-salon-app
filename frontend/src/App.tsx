import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';

// Eagerly loaded auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Lazy-loaded protected pages
const DashboardPage   = lazy(() => import('./pages/DashboardPage'));
const StaffPage       = lazy(() => import('./pages/StaffPage'));
const StaffDetailPage = lazy(() => import('./pages/StaffDetailPage'));
const CustomersPage   = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));
const BookingsPage    = lazy(() => import('./pages/BookingsPage'));
const RevenuePage     = lazy(() => import('./pages/RevenuePage'));
const SuppliesPage    = lazy(() => import('./pages/SuppliesPage'));
const GiftCertsPage   = lazy(() => import('./pages/GiftCertsPage'));
const CommissionPage  = lazy(() => import('./pages/CommissionPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Auth routes — no AppLayout */}
        <Route element={<AuthLayout />}>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes — wrapped in AppLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<PageLoader />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route
              path="/staff"
              element={
                <Suspense fallback={<PageLoader />}>
                  <StaffPage />
                </Suspense>
              }
            />
            <Route
              path="/staff/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <StaffDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/customers"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CustomersPage />
                </Suspense>
              }
            />
            <Route
              path="/customers/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CustomerDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/bookings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <BookingsPage />
                </Suspense>
              }
            />
            <Route
              path="/revenue"
              element={
                <Suspense fallback={<PageLoader />}>
                  <RevenuePage />
                </Suspense>
              }
            />
            <Route
              path="/supplies"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SuppliesPage />
                </Suspense>
              }
            />
            <Route
              path="/gift-certs"
              element={
                <Suspense fallback={<PageLoader />}>
                  <GiftCertsPage />
                </Suspense>
              }
            />
            <Route
              path="/commissions"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CommissionPage />
                </Suspense>
              }
            />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
