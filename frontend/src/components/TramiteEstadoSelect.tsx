import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { TRAMITE_ESTADO_LABELS } from '@/lib/utils';
import type { TramiteEstado } from '@/client/types.gen';

interface Props {
  value: TramiteEstado | undefined;
  onChange: (value: TramiteEstado) => void;
  className?: string;
}

export function TramiteEstadoSelect({ value, onChange, className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const estados = Object.keys(TRAMITE_ESTADO_LABELS) as TramiteEstado[];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3 bg-surface border border-border rounded-lg flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
      >
        {value ? (
          <Badge variant={value} size="sm" />
        ) : (
          <span className="text-sm text-text-muted">Seleccionar estado...</span>
        )}
        <ChevronDown className="w-4 h-4 text-text-muted" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto">
          {estados.map((estado) => (
            <button
              key={estado}
              type="button"
              onClick={() => {
                onChange(estado);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-neutral-light transition-colors flex items-center"
            >
              <Badge variant={estado} size="sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
