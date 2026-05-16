import { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import type { Toast as ToastType } from '@/stores/uiStore';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'border-success/20 bg-success-light',
  error: 'border-danger/20 bg-danger-light',
  warning: 'border-warning/20 bg-warning-light',
  info: 'border-border bg-surface-card',
};

const iconStyles = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-text-secondary',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useUIStore((s) => s.removeToast);
  const Icon = icons[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  return (
    <div
      className={`animate-slide-in flex items-start gap-3 px-4 py-3 rounded-lg border shadow-card-hover max-w-sm ${toastStyles[toast.type]}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconStyles[toast.type]}`} />
      <p className="text-sm text-text-primary flex-1">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
