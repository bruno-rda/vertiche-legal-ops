import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUsuarioStatus, deleteUsuario } from '@/client/sdk.gen';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Power, PowerOff, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Usuario } from '@/client/types.gen';

interface UsersTableProps {
  users: Usuario[];
  isLoading: boolean;
  type: 'activos' | 'inactivos';
}

export function UsersTable({ users, isLoading, type }: UsersTableProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const currentUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: 'activo' | 'inactivo' }) =>
      (
        await updateUsuarioStatus({
          path: { id },
          body: { estado: estado as any },
          throwOnError: true,
        })
      ).data,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      addToast({
        type: 'success',
        message: `Usuario ${
          variables.estado === 'activo' ? 'reactivado' : 'desactivado'
        } exitosamente`,
      });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al cambiar estado del usuario' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      (await deleteUsuario({ path: { id }, throwOnError: true })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      addToast({ type: 'success', message: 'Usuario eliminado permanentemente' });
      setUserToDelete(null);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al eliminar el usuario' });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-neutral-light rounded-lg w-full animate-pulse" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title={type === 'activos' ? 'No hay usuarios activos' : 'No hay usuarios inactivos'}
        description={
          type === 'activos'
            ? 'Aún no hay usuarios. Invita al primero.'
            : 'Los usuarios desactivados aparecerán aquí.'
        }
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => navigate(`/perfil?id=${user.id}`)}
            className="bg-surface-card border border-border hover:border-border-strong hover:shadow-sm transition-all rounded-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary">{user.nombre}</span>
                <Badge
                  variant={
                    user.rol === 'ADMIN'
                      ? 'vigente'
                      : user.rol === 'OPERATOR'
                        ? 'en_revision'
                        : 'info'
                  }
                  size="sm"
                >
                  {user.rol}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-muted mt-0.5 flex-wrap">
                <span>{user.email}</span>
                {user.rol === 'OPERATOR' && (
                  <>
                    <span>&middot;</span>
                    <span>
                      {user.tiendas_asignadas?.length || 0}{' '}
                      {user.tiendas_asignadas?.length === 1 ? 'tienda' : 'tiendas'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2 shrink-0">
              <div className="flex items-center gap-2">
                {user.id !== currentUser?.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatusMutation.mutate({
                        id: user.id,
                        estado: type === 'activos' ? 'inactivo' : 'activo',
                      });
                    }}
                    disabled={toggleStatusMutation.isPending}
                    className={`p-2 rounded-md transition-colors ${
                      type === 'activos'
                        ? 'text-danger hover:bg-danger-light'
                        : 'text-success hover:bg-success-light'
                    }`}
                    title={type === 'activos' ? 'Desactivar usuario' : 'Reactivar usuario'}
                  >
                    {type === 'activos' ? (
                      <PowerOff className="w-5 h-5" />
                    ) : (
                      <Power className="w-5 h-5" />
                    )}
                  </button>
                )}
                {type === 'inactivos' && user.id !== currentUser?.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserToDelete(user);
                    }}
                    className="p-2 text-danger hover:bg-danger-light rounded-md transition-colors"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="Eliminar usuario"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-danger mb-2">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-semibold text-lg">¿Estás seguro?</h3>
          </div>
          <p className="text-sm text-text-secondary">
            Vas a eliminar permanentemente a{' '}
            <span className="font-medium text-text-primary">{userToDelete?.nombre}</span>. Esta
            acción no se puede deshacer y el usuario perderá el acceso al sistema.
          </p>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <button
              onClick={() => setUserToDelete(null)}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-light rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-danger hover:bg-danger/90 rounded-lg shadow-sm transition-all"
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar permanentemente'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
