import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div
        className="absolute top-0 left-0 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 bg-gold-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <span className="text-4xl">💅</span>
          <h1 className="mt-2 text-3xl font-extrabold bg-gradient-to-r from-primary-500 to-gold-500 bg-clip-text text-transparent">
            LuxeNails
          </h1>
          <p className="mt-1 text-sm text-gray-500">Salon Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-rose-100 p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
