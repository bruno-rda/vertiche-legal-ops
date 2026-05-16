import { Search, WifiOff, Inbox } from 'lucide-react';

type EmptyVariant = 'no-results' | 'error' | 'no-data';

const variants = {
  'no-results': {
    icon: Search,
    defaultTitle: 'Sin resultados',
    defaultDescription: 'No se encontraron elementos que coincidan con tu búsqueda.',
  },
  'error': {
    icon: WifiOff,
    defaultTitle: 'Error de conexión',
    defaultDescription: 'No se pudieron cargar los datos. Verifica tu conexión e intenta de nuevo.',
  },
  'no-data': {
    icon: Inbox,
    defaultTitle: 'Sin datos',
    defaultDescription: 'Aún no hay elementos para mostrar.',
  },
};

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  variant = 'no-data',
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-neutral-light flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-text-secondary max-w-md">
        {description || config.defaultDescription}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
