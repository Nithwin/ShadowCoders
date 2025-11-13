'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

interface InputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  requiredValue?: string; // If provided, user must type this exact value
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning';
  onConfirm: (inputValue: string) => void;
  onCancel?: () => void;
}

export default function InputDialog({
  open,
  onOpenChange,
  title,
  message,
  inputLabel = 'Input',
  inputPlaceholder = '',
  requiredValue,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const [inputValue, setInputValue] = useState('');

  const handleConfirm = () => {
    if (requiredValue && inputValue !== requiredValue) {
      return; // Don't close if required value doesn't match
    }
    onConfirm(inputValue);
    setInputValue('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setInputValue('');
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
  const isConfirmDisabled = requiredValue ? inputValue !== requiredValue : false;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-0 border border-primary/20 bg-secondary shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg overflow-hidden"
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
                <Dialog.Description className="text-sm text-primary/70 leading-relaxed mb-4">
                  {message}
                </Dialog.Description>
                {requiredValue && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-primary mb-2">
                      {inputLabel}
                    </label>
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={inputPlaceholder}
                      className="w-full"
                    />
                    {requiredValue && (
                      <p className="mt-2 text-xs text-primary/60">
                        Type <strong>&quot;{requiredValue}&quot;</strong> to confirm
                      </p>
                    )}
                  </div>
                )}
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
              disabled={isConfirmDisabled}
            >
              {confirmText}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

