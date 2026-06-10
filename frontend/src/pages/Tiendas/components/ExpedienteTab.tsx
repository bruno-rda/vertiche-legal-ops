import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { TramiteResumen, Expediente } from '@/client/types.gen';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { formatDate, daysRemaining } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Plus } from 'lucide-react';
import { NuevoTramiteModal } from './NuevoTramiteModal';

interface ExpedienteTabProps {
  expediente: Expediente;
  tiendaId: string;
}

export function ExpedienteTab({ expediente, tiendaId }: ExpedienteTabProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.rol === 'ADMIN';

  const [isActivosOpen, setIsActivosOpen] = useState(true);
  const [isVencidosOpen, setIsVencidosOpen] = useState(false);
  const [isNuevoTramiteOpen, setIsNuevoTramiteOpen] = useState(false);

  const activos = expediente.tramites.filter((t) => t.estado !== 'vencido');
  const vencidos = expediente.tramites.filter((t) => t.estado === 'vencido');

  const emptyStateContent = (
    <div className="space-y-4">
      <EmptyState
        variant="no-data"
        title="Sin trámites"
        description="Esta tienda no tiene trámites registrados."
      />
      {isAdmin && (
        <div className="flex justify-center">
          <button
            onClick={() => setIsNuevoTramiteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo trámite
          </button>
        </div>
      )}
    </div>
  );

  const renderTramite = (t: TramiteResumen) => {
    const days = daysRemaining(t.fecha_vencimiento);
    return (
      <div
        key={t.id}
        onClick={() => navigate(`/tiendas/${tiendaId}/tramites/${t.id}`)}
        className="bg-surface-card border border-border rounded-lg px-5 py-4 flex items-center gap-4 hover:shadow-card-hover hover:border-border-strong cursor-pointer transition-all mb-2"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{t.nombre}</p>
          <p className="text-xs text-text-muted mt-0.5 capitalize">{t.tipo}</p>
        </div>
        <Badge variant={t.estado} size="sm" />
        <div className="text-right shrink-0">
          <p className="text-xs text-text-muted">{formatDate(t.fecha_vencimiento)}</p>
          <p
            className={`text-xs font-semibold ${days < 0 ? 'text-danger' : days <= 15 ? 'text-warning' : 'text-text-secondary'}`}
          >
            {days < 0
              ? `${Math.abs(days)}d vencido`
              : days === 0
                ? 'Vence hoy'
                : `${days}d restantes`}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted" />
      </div>
    );
  };

  if (expediente.tramites.length === 0) {
    return (
      <>
        {emptyStateContent}
        {isNuevoTramiteOpen && (
          <NuevoTramiteModal
            isOpen={isNuevoTramiteOpen}
            onClose={() => setIsNuevoTramiteOpen(false)}
            tiendaId={tiendaId}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsNuevoTramiteOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo trámite
          </button>
        </div>
      )}
      {/* Activos */}
      {activos.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden bg-surface">
          <button
            onClick={() => setIsActivosOpen(!isActivosOpen)}
            className="w-full flex items-center justify-between p-4 bg-surface-card hover:bg-neutral-light transition-colors"
          >
            <h2 className="text-base font-semibold text-text-primary">
              Trámites activos ({activos.length})
            </h2>
            <ChevronDown
              className={`w-5 h-5 text-text-muted transition-transform ${isActivosOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {isActivosOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-4 space-y-2">{activos.map(renderTramite)}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Vencidos */}
      {vencidos.length > 0 && (
        <div className="border border-danger/20 rounded-xl overflow-hidden bg-danger-light/10">
          <button
            onClick={() => setIsVencidosOpen(!isVencidosOpen)}
            className="w-full flex items-center justify-between p-4 bg-danger-light/20 hover:bg-danger-light/30 transition-colors"
          >
            <h2 className="text-base font-semibold text-danger">
              Trámites vencidos ({vencidos.length})
            </h2>
            <ChevronDown
              className={`w-5 h-5 text-danger transition-transform ${isVencidosOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {isVencidosOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-4 space-y-2">{vencidos.map(renderTramite)}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {isNuevoTramiteOpen && (
        <NuevoTramiteModal
          isOpen={isNuevoTramiteOpen}
          onClose={() => setIsNuevoTramiteOpen(false)}
          tiendaId={tiendaId}
        />
      )}
    </div>
  );
}
