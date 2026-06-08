import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Tienda, PaginatedResponse } from '@/types';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { formatDate } from '@/lib/utils';
import { UserCircle, Mail, Calendar, Store, MapPin, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // If operator, fetch their assigned stores. The API will automatically scope them.
  const { data: tiendasData, isLoading: isLoadingTiendas } = useQuery({
    queryKey: ['tiendas', 'assigned'],
    queryFn: () => api.get<PaginatedResponse<Tienda>>('/api/tiendas?page_size=100'),
    enabled: user?.rol === 'OPERATOR',
  });

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Mi Perfil</h1>
        <p className="text-sm text-text-secondary mt-1">Información de cuenta y configuración</p>
      </div>

      <div className="bg-surface-card rounded-xl border border-border p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start gap-8">
          <div className="w-24 h-24 rounded-full bg-neutral-light flex items-center justify-center shrink-0">
            <UserCircle className="w-12 h-12 text-text-muted" />
          </div>
          
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">{user.nombre}</h2>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={user.rol === 'ADMIN' ? 'vigente' : user.rol === 'OPERATOR' ? 'en_revision' : 'info'}>
                  {user.rol}
                </Badge>
                <span className="text-sm text-text-secondary flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-border">
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Fecha de ingreso
                </p>
                <p className="text-base text-text-primary">
                  {user.fecha_ingreso ? formatDate(user.fecha_ingreso) : 'No registrada'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1 flex items-center gap-1.5">
                  <Store className="w-4 h-4" /> Tiendas asignadas
                </p>
                <p className="text-base text-text-primary">
                  {user.rol === 'OPERATOR' 
                    ? (user.tiendas_asignadas?.length || 0) 
                    : 'Acceso global (Todas)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {user.rol === 'OPERATOR' && (
        <>
          <div className="bg-surface-card rounded-xl border border-border p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Store className="w-5 h-5 text-text-primary" />
              <h2 className="text-xl font-bold text-text-primary">Tiendas bajo tu responsabilidad</h2>
            </div>
            
            {isLoadingTiendas ? (
              <Skeleton count={3} className="h-16 mb-2" />
            ) : tiendasData?.data && tiendasData.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tiendasData.data.map(tienda => (
                  <div 
                    key={tienda.id}
                    onClick={() => navigate(`/tiendas/${tienda.id}`)}
                    className="p-4 rounded-lg border border-border hover:border-border-strong hover:shadow-card-hover transition-all cursor-pointer bg-surface flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-text-primary">{tienda.nombre}</h3>
                      <Badge variant={tienda.estado_cumplimiento} size="sm" />
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-text-secondary mt-auto">
                      <MapPin className="w-4 h-4" />
                      {tienda.municipio}, {tienda.estado}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No tienes tiendas asignadas actualmente.</p>
            )}
          </div>

          <div className="bg-surface-card rounded-xl border border-border p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-text-primary" />
              <h2 className="text-xl font-bold text-text-primary">Desempeño</h2>
            </div>
            <div className="py-8 text-center bg-surface border border-dashed border-border rounded-lg">
              <p className="text-sm text-text-secondary">Las métricas de desempeño estarán disponibles en la próxima actualización.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
