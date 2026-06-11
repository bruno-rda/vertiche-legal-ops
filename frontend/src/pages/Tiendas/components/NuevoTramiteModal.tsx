import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTramiteForTienda } from '@/client/sdk.gen';
import { Modal } from '@/components/Modal';
import { useUIStore } from '@/stores/uiStore';
import type { TramiteCreate as FormData } from '@/client/types.gen';
import { ChevronDown } from 'lucide-react';

export function NuevoTramiteModal({
  isOpen,
  onClose,
  tiendaId,
}: {
  isOpen: boolean;
  onClose: () => void;
  tiendaId: string;
}) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      nombre: '',
      tipo: 'municipal',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_vencimiento: null,
      es_permanente: false,
      es_recurrente: false,
      periodo_recurrencia: 'anual',
    },
  });

  const isPermanente = watch('es_permanente');
  const isRecurrente = watch('es_recurrente');

  const mutation = useMutation({
    mutationFn: async (data: FormData) =>
      (await createTramiteForTienda({ path: { id: tiendaId }, body: data, throwOnError: true }))
        .data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tienda', tiendaId, 'expediente'] });
      queryClient.invalidateQueries({ queryKey: ['tienda', tiendaId, 'historial'] });
      addToast({ type: 'success', message: 'Trámite creado exitosamente' });
      reset();
      onClose();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al crear el trámite' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Trámite">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Nombre del trámite
          </label>
          <input
            type="text"
            {...register('nombre', { required: 'Requerido' })}
            placeholder="Ej. Licencia de Funcionamiento"
            className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          {errors.nombre && <p className="text-xs text-danger mt-1">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Tipo Jurisdiccional
          </label>
          <div className="relative">
            <select
              {...register('tipo', { required: 'Requerido' })}
              className="w-full h-10 pl-3 pr-8 appearance-none bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer"
            >
              <option value="municipal">Municipal</option>
              <option value="estatal">Estatal</option>
              <option value="federal">Federal</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Fecha de inicio
            </label>
            <input
              type="date"
              {...register('fecha_inicio', { required: 'Requerido' })}
              className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
            {errors.fecha_inicio && (
              <p className="text-xs text-danger mt-1">{errors.fecha_inicio.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Fecha de vencimiento
            </label>
            <input
              type="date"
              {...register('fecha_vencimiento', { required: !isPermanente ? 'Requerido' : false })}
              disabled={isPermanente}
              className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent disabled:opacity-50 disabled:bg-neutral-light"
            />
            {errors.fecha_vencimiento && (
              <p className="text-xs text-danger mt-1">{errors.fecha_vencimiento.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="es_permanente_nuevo"
            {...register('es_permanente')}
            onChange={(e) => {
              register('es_permanente').onChange(e);
              if (e.target.checked) {
                setValue('fecha_vencimiento', '');
              }
            }}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent/20"
          />
          <label htmlFor="es_permanente_nuevo" className="text-sm text-text-primary">
            Es trámite permanente (sin vencimiento)
          </label>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="es_recurrente_nuevo"
            {...register('es_recurrente')}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent/20"
          />
          <label htmlFor="es_recurrente_nuevo" className="text-sm text-text-primary">
            Es trámite recurrente
          </label>
        </div>

        {isRecurrente && (
          <div className="mt-2 pl-6">
            <label className="block text-sm font-medium text-text-primary mb-1">
              Periodo de recurrencia
            </label>
            <div className="relative">
              <select
                {...register('periodo_recurrencia')}
                className="w-full h-10 pl-3 pr-8 appearance-none bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer"
              >
                <option value="anual">Anual</option>
                <option value="bianual">Bianual</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>
        )}

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
            {mutation.isPending ? 'Creando...' : 'Crear trámite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
