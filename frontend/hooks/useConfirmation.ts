import { useState, useCallback } from 'react';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning';
}

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions>({
    title: '',
    message: '',
  });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(true);
      setResolvePromise(null);
    }
    setIsOpen(false);
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
    setIsOpen(false);
  }, [resolvePromise]);

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  };
}

