import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { User } from '@/types';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { formatDate } from '@/lib/utils';
import { UserCircle, Mail, Calendar, Store, Activity } from 'lucide-react';
import { StoreSummary } from './components/StoreSummary';
import { StoreAssignment } from './components/StoreAssignment';
import { useState } from 'react';

export function ProfilePage() {
  const { user: currentUser } = useAuthStore();
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get('id');

  const userId = idParam || currentUser?.id;
  const isOwnProfile = userId === currentUser?.id;
  const isAdminView = currentUser?.rol === 'ADMIN';

  const [isEditingAssignment, setIsEditingAssignment] = useState(false);

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['usuario', userId],
    queryFn: () => {
      // If it's the current user, we can just use the auth store data initially, 
      // but to keep it fresh, let's fetch.
      return api.get<User>(`/api/usuarios/${userId}`);
    },
    enabled: !!userId,
  });

  if (!currentUser) return null;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton count={1} className="h-12 w-48 mb-6" />
        <div className="bg-surface-card rounded-xl border border-border p-6 md:p-8">
          <Skeleton count={3} className="h-16" />
        </div>
      </div>
    );
  }

  const user = userProfile || currentUser;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl text-text-primary">
          {isOwnProfile ? 'Mi Perfil' : 'Perfil de Usuario'}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {isOwnProfile ? 'Información de cuenta y configuración' : 'Información y asignaciones del usuario'}
        </p>
      </div>

      <div className="bg-surface-card rounded-xl border border-border p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start gap-8">
          <div className="w-24 h-24 rounded-full bg-neutral-light flex items-center justify-center shrink-0">
            <UserCircle className="w-12 h-12 text-text-muted" />
          </div>
          
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                {user.nombre}
                {user.estado === 'inactivo' && (
                  <Badge variant="default" className="bg-danger-light text-danger">Inactivo</Badge>
                )}
              </h2>
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
                  <Calendar className="w-4 h-4" /> Fecha de creación
                </p>
                <p className="text-base text-text-primary">
                  {user.fecha_creacion ? formatDate(user.fecha_creacion) : 'No registrada'}
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
          {isEditingAssignment && isAdminView ? (
            <StoreAssignment 
              user={user} 
              onCancel={() => setIsEditingAssignment(false)} 
            />
          ) : (
            <StoreSummary 
              userId={user.id} 
              isAdminView={isAdminView}
              onEditAssignment={() => setIsEditingAssignment(true)}
            />
          )}

          <div className="bg-surface-card rounded-xl border border-border p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-text-primary" />
              <h2 className="text-xl font-bold text-text-primary">Desempeño</h2>
            </div>
            <div className="py-8 text-center bg-surface border border-dashed border-border rounded-lg">
              <p className="text-sm text-text-secondary">
                Las métricas de desempeño estarán disponibles en la próxima actualización.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
