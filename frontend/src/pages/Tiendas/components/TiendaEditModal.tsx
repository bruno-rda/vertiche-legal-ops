import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTienda } from '@/client/sdk.gen';
import { Modal } from '@/components/Modal';
import { useUIStore } from '@/stores/uiStore';
import type { Tienda, TiendaUpdate as FormData } from '@/client/types.gen';
import { ChevronDown } from 'lucide-react';

import { ESTADOS_MEXICO } from '@/lib/constants';

export function TiendaEditModal({
  isOpen,
  onClose,
  tienda,
}: {
  isOpen: boolean;
  onClose: () => void;
  tienda: Tienda;
}) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      nombre: tienda.nombre,
      estado: tienda.estado,
      municipio: tienda.municipio,
      direccion: tienda.direccion,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) =>
      (await updateTienda({ path: { id: tienda.id }, body: data, throwOnError: true })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tienda', tienda.id] });
      queryClient.invalidateQueries({ queryKey: ['tiendas'] });
      addToast({ type: 'success', message: 'Tienda actualizada exitosamente' });
      onClose();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al actualizar la tienda' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Tienda">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Nombre de la tienda
          </label>
          <input
            type="text"
            {...register('nombre', { required: 'Este campo es requerido' })}
            className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          {errors.nombre && <p className="text-xs text-danger mt-1">{errors.nombre.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Estado</label>
            <div className="relative">
              <select
                {...register('estado', { required: 'Requerido' })}
                className="w-full h-10 pl-3 pr-8 appearance-none bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer"
              >
                <option value="">Selecciona un estado</option>
                {ESTADOS_MEXICO.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
            {errors.estado && <p className="text-xs text-danger mt-1">{errors.estado.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Municipio</label>
            <input
              type="text"
              {...register('municipio', { required: 'Requerido' })}
              className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
            {errors.municipio && (
              <p className="text-xs text-danger mt-1">{errors.municipio.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Dirección completa
          </label>
          <textarea
            {...register('direccion', { required: 'Este campo es requerido' })}
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
          />
          {errors.direccion && (
            <p className="text-xs text-danger mt-1">{errors.direccion.message}</p>
          )}
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
            {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
