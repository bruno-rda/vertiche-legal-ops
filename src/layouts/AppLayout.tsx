import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import {
  LayoutDashboard,
  Store,
  FileText,
  Bell,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Users,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const baseNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tiendas', label: 'Tiendas', icon: Store },
  { to: '/tramites', label: 'Trámites', icon: FileText },
  { to: '/alertas', label: 'Alertas', icon: Bell, badge: true },
  { to: '/documentos', label: 'Documentos', icon: FolderOpen },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fetch critical alert count for sidebar badge
  const { data: alertCount } = useQuery({
    queryKey: ['alertas', 'count'],
    queryFn: () => api.get<{ count: number }>('/api/alertas/count'),
    refetchInterval: 60000, // Every 60 seconds
  });

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-[220px]';

  const navItems = [
    ...baseNavItems,
    ...(user?.rol === 'ADMIN' ? [{ to: '/usuarios', label: 'Usuarios', icon: Users }] : []),
  ];

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Header */}
      <header className="h-16 bg-surface-card border-b border-border flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-1.5 rounded-md hover:bg-neutral-light transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-display text-2xl tracking-wide text-text-primary ml-1">
            VERTICHE
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Alert bell */}
          <button
            onClick={() => navigate('/alertas')}
            className="relative p-1.5 rounded-md hover:bg-neutral-light transition-colors"
          >
            <Bell className="w-5 h-5 text-text-secondary" />
            {alertCount && alertCount.count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {alertCount.count}
              </span>
            )}
          </button>

          {/* User info */}
          <div
            className="hidden sm:flex items-center gap-2 cursor-pointer hover:bg-neutral-light p-1.5 rounded-lg transition-colors"
            onClick={() => navigate('/perfil')}
          >
            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
              {user?.nombre.charAt(0)}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-text-primary leading-tight">
                {user?.nombre}
              </p>
              <p className="text-[11px] text-text-muted uppercase tracking-wider">
                {user?.rol}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            ${sidebarWidth} shrink-0 bg-surface-card border-r border-border
            flex flex-col transition-all duration-200 ease-in-out z-40
            fixed lg:relative h-[calc(100vh-64px)] lg:h-full
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group relative ${isActive
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:bg-neutral-light hover:text-text-primary'
                  }`
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
                {item.badge && alertCount && alertCount.count > 0 && (
                  <span
                    className={`ml-auto min-w-[20px] h-5 rounded-full text-[11px] font-bold flex items-center justify-center px-1.5 ${sidebarCollapsed
                      ? 'absolute -top-1 -right-1 bg-danger text-white'
                      : 'bg-danger/10 text-danger'
                      }`}
                  >
                    {alertCount.count}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-border p-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-danger hover:bg-danger-light rounded-lg transition-colors w-full"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              {!sidebarCollapsed && <span>Cerrar sesión</span>}
            </button>
          </div>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-surface-card border border-border rounded-full items-center justify-center text-text-muted hover:text-text-primary hover:shadow-card transition-all"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
