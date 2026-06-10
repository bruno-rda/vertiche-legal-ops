import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUsuario } from '@/client/sdk.gen';
import { Modal } from '@/components/Modal';
import { useUIStore } from '@/stores/uiStore';
import { ChevronDown } from 'lucide-react';
import type { UsuarioCreate as FormData } from '@/client/types.gen';

export function InviteUserModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      nombre: '',
      email: '',
      rol: 'OPERATOR',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) =>
      (await createUsuario({ body: data, throwOnError: true })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      addToast({ type: 'success', message: 'Usuario invitado exitosamente' });
      reset();
      onClose();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al invitar al usuario' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invitar Usuario">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Nombre completo
          </label>
          <input
            type="text"
            {...register('nombre', { required: 'El nombre es requerido' })}
            placeholder="Ej. Ana García"
            className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          {errors.nombre && <p className="text-xs text-danger mt-1">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            {...register('email', {
              required: 'El correo es requerido',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Correo inválido',
              },
            })}
            placeholder="ana@vertiche.com"
            className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Rol del sistema
          </label>
          <div className="relative">
            <select
              {...register('rol', { required: 'El rol es requerido' })}
              className="w-full h-10 pl-3 pr-8 appearance-none bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer"
            >
              <option value="OPERATOR">Operador (OPERATOR)</option>
              <option value="VIEWER">Visualizador (VIEWER)</option>
              <option value="ADMIN">Administrador (ADMIN)</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-light rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg shadow-sm transition-all"
          >
            {mutation.isPending ? 'Invitando...' : 'Enviar invitación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
