import { Modal } from '@/components/Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isPending?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isPending = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-danger mb-2">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="font-semibold text-lg">¿Estás seguro?</h3>
        </div>
        <div className="text-sm text-text-secondary">
          {message}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-light rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-danger hover:bg-danger/90 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isPending ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
