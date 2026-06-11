import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTramite } from '@/client/sdk.gen';
import { Modal } from '@/components/Modal';
import { useUIStore } from '@/stores/uiStore';
import type { Tramite, TramiteUpdate as FormData } from '@/client/types.gen';
import { TramiteEstadoSelect } from '@/components/TramiteEstadoSelect';

export function TramiteEditModal({
  isOpen,
  onClose,
  tramite,
}: {
  isOpen: boolean;
  onClose: () => void;
  tramite: Tramite;
}) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      nombre: tramite.nombre,
      estado: tramite.estado,
      fecha_inicio: tramite.fecha_inicio.split('T')[0],
      fecha_vencimiento: tramite.fecha_vencimiento ? tramite.fecha_vencimiento.split('T')[0] : '',
      es_permanente: tramite.es_permanente || false,
    },
  });

  const isPermanente = watch('es_permanente');

  const mutation = useMutation({
    mutationFn: async (data: FormData) =>
      (await updateTramite({ path: { id: tramite.id }, body: data, throwOnError: true })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tramite', tramite.id] });
      addToast({ type: 'success', message: 'Trámite actualizado exitosamente' });
      onClose();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Error al actualizar el trámite' });
    },
  });

  const onSubmit = (data: FormData) => {
    const originalVencimiento = tramite.fecha_vencimiento
      ? tramite.fecha_vencimiento.split('T')[0]
      : '';
    const dateChanged = data.fecha_vencimiento !== originalVencimiento;
    const permanencyChanged = data.es_permanente !== (tramite.es_permanente || false);
    const estadoChanged = data.estado !== tramite.estado;

    if (dateChanged || permanencyChanged || estadoChanged) {
      setPendingData(data);
      setShowConfirm(true);
    } else {
      mutation.mutate(data);
    }
  };

  const handleConfirm = () => {
    if (pendingData) {
      mutation.mutate(pendingData);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <Modal isOpen={isOpen} onClose={() => setShowConfirm(false)} title="Confirmar cambios">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Estás a punto de modificar propiedades importantes de este trámite.
            {pendingData?.es_permanente &&
              ' Al ser permanente, este trámite no generará alertas de vencimiento.'}{' '}
            ¿Confirmar?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-light rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              {mutation.isPending ? 'Guardando...' : 'Confirmar y guardar'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Trámite">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Nombre del trámite
          </label>
          <input
            type="text"
            {...register('nombre', { required: 'Este campo es requerido' })}
            className="w-full h-10 px-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          {errors.nombre && <p className="text-xs text-danger mt-1">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Estado
          </label>
          <TramiteEstadoSelect
            value={watch('estado') as any}
            onChange={(val) => setValue('estado', val, { shouldValidate: true })}
          />
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
              disabled={!!isPermanente}
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
            id="es_permanente"
            {...register('es_permanente')}
            onChange={(e) => {
              register('es_permanente').onChange(e);
              if (e.target.checked) {
                setValue('fecha_vencimiento', '');
              }
            }}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent/20"
          />
          <label htmlFor="es_permanente" className="text-sm text-text-primary">
            Es trámite permanente (sin vencimiento)
          </label>
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
