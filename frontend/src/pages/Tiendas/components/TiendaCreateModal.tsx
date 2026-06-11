import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTienda } from '@/client/sdk.gen';
import { Modal } from '@/components/Modal';
import { useUIStore } from '@/stores/uiStore';
import type { TiendaCreate } from '@/client/types.gen';
import { ChevronDown } from 'lucide-react';

import { ESTADOS_MEXICO } from '@/lib/constants';

interface FormData {
  nombre: string;
  estado: string;
  municipio: string;
  direccion: string;
  marcas: string;
}

export function TiendaCreateModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
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
      estado: '',
      municipio: '',
      direccion: '',
      marcas: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: TiendaCreate) =>
      (await createTienda({ body: data, throwOnError: true })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiendas'] });
      addToast({ type: 'success', message: 'Tienda creada exitosamente' });
      reset();
      onClose();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al crear la tienda' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      ...data,
      marcas: [data.marcas],
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Tienda">
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
            Marcas
          </label>
          <input
            type="text"
            {...register('marcas', { required: 'Este campo es requerido' })}
            className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            placeholder="Ej. Vertiche, Otros"
          />
          {errors.marcas && <p className="text-xs text-danger mt-1">{errors.marcas.message}</p>}
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
            {mutation.isPending ? 'Guardando...' : 'Crear tienda'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
