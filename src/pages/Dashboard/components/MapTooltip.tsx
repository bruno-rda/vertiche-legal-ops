import { motion, AnimatePresence } from 'framer-motion';

export interface MapTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  estado: string;
  tiendasCount: number;
  cumplimiento: number;
  criticalCount: number;
}

export function MapTooltip({
  visible,
  x,
  y,
  estado,
  tiendasCount,
  cumplimiento,
  criticalCount,
}: MapTooltipProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed z-50 min-w-[220px] -translate-x-1/2 translate-y-4 rounded-lg border border-border bg-surface shadow-modal"
          style={{ left: x, top: y }}
        >
          <div className="border-b border-border bg-surface-card px-4 py-2">
            <h4 className="font-display text-lg text-text-primary">{estado}</h4>
          </div>
          <div className="p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Tiendas</span>
                <span className="font-medium text-text-primary">{tiendasCount}</span>
              </div>
              {tiendasCount > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Cumplimiento</span>
                    <span
                      className={`font-medium ${cumplimiento >= 85
                          ? 'text-success'
                          : cumplimiento >= 60
                            ? 'text-warning'
                            : 'text-danger'
                        }`}
                    >
                      {cumplimiento}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Trámites críticos</span>
                    <span
                      className={`font-medium ${criticalCount > 0 ? 'text-danger' : 'text-text-primary'
                        }`}
                    >
                      {criticalCount}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
