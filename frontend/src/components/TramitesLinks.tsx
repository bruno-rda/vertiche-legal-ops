import { useState } from 'react';
import { Link } from 'react-router-dom';

interface TramitesLinksProps {
  tiendaId?: string;
  tramiteIds: string[];
  tramiteNombres?: string[];
}

export function TramitesLinks({ tiendaId, tramiteIds, tramiteNombres }: TramitesLinksProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!tramiteIds || tramiteIds.length === 0 || !tiendaId) {
    return <span className="text-xs text-text-muted">Sin asociar</span>;
  }

  const visibleCount = isExpanded ? tramiteIds.length : 2;
  const visibleIds = tramiteIds.slice(0, visibleCount);
  const hiddenCount = tramiteIds.length - visibleCount;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {visibleIds.map((tId, idx) => (
        <Link
          key={tId}
          to={`/tiendas/${tiendaId}/tramites/${tId}`}
          className="text-xs text-text-secondary hover:text-text-primary underline truncate max-w-[150px] transition-colors"
          title={tramiteNombres?.[idx] || 'Trámite'}
        >
          {tramiteNombres?.[idx] || 'Trámite'}
        </Link>
      ))}
      {!isExpanded && hiddenCount > 0 && (
        <button
          onClick={() => setIsExpanded(true)}
          className="text-xs text-text-secondary hover:text-text-primary hover:underline"
        >
          +{hiddenCount} más
        </button>
      )}
      {isExpanded && tramiteIds.length > 2 && (
        <button
          onClick={() => setIsExpanded(false)}
          className="text-xs text-text-secondary hover:text-text-primary hover:underline"
        >
          Ver menos
        </button>
      )}
    </div>
  );
}
