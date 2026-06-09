import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl tracking-wide text-text-primary mb-2">VERTICHE</h1>
          <p className="text-sm text-text-secondary">Plataforma de Cumplimiento Legal</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
