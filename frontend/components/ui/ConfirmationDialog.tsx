'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import * as React from 'react';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      // Small delay to ensure dialog is fully mounted before allowing interactions
      const timer = setTimeout(() => {
        setIsMounted(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsMounted(false);
    }
  }, [open]);

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  const variantStyles = {
    default: {
      icon: 'text-blue-500',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    danger: {
      icon: 'text-red-500',
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: 'text-yellow-500',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
  };

  const styles = variantStyles[variant];

  console.log('ConfirmationDialog render - open:', open, 'title:', title);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={true}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          ref={contentRef}
          className="fixed left-[50%] top-[50%] z-[10000] w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-0 border border-primary/20 bg-secondary shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg overflow-hidden"
          onPointerDownOutside={(e) => {
            // Prevent closing on outside click for confirmation dialogs
            // User must explicitly click Cancel or Confirm
            console.log('onPointerDownOutside - preventing close, isMounted:', isMounted);
            if (!isMounted) {
              // If not fully mounted yet, definitely prevent
              e.preventDefault();
              return;
            }
            // Always prevent for confirmation dialogs - user must use buttons
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            // Prevent closing on outside interaction
            console.log('onInteractOutside - preventing close, isMounted:', isMounted);
            if (!isMounted) {
              e.preventDefault();
              return;
            }
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            // Allow ESC to close - will trigger onOpenChange(false)
            // Don't prevent default, let it close
            console.log('onEscapeKeyDown - allowing close');
          }}
          onOpenAutoFocus={(e) => {
            // Prevent auto-focus issues
            e.preventDefault();
          }}
        >
          <div className="px-6 py-5">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 ${styles.icon}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <Dialog.Title className="text-xl font-bold font-alan-sans text-primary mb-2">
                  {title}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-primary/70 leading-relaxed">
                  {message}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="p-1 rounded-full text-primary/70 hover:bg-primary/10 transition-colors flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="px-6 py-4 bg-primary/5 border-t border-primary/10 flex justify-end gap-3">
            <Button
              type="button"
              className="!bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-50"
              onClick={handleCancel}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              className={styles.confirmButton}
              onClick={handleConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

