'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import InputDialog from '@/components/ui/InputDialog';
import { ConfirmationOptions } from '@/hooks/useConfirmation';

interface InputDialogOptions {
  title: string;
  message: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  requiredValue?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'warning';
}

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  prompt: (options: InputDialogOptions) => Promise<string | null>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions>({
    title: '',
    message: '',
  });
  const [inputOptions, setInputOptions] = useState<InputDialogOptions>({
    title: '',
    message: '',
  });
  // Use refs to store resolve functions directly
  const resolvePromiseRef = useRef<((value: boolean) => void) | null>(null);
  const resolveInputPromiseRef = useRef<((value: string | null) => void) | null>(null);
  const justOpenedRef = useRef<boolean>(false);

  const confirm = useCallback((opts: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      console.log('Confirmation dialog opening with options:', opts);
      setOptions(opts);
      // Set flag to prevent immediate closing - use longer timeout
      justOpenedRef.current = true;
      setIsOpen(true);
      // Store the resolve function directly in ref
      resolvePromiseRef.current = resolve;
      console.log('Dialog state set to open, resolve function stored, justOpened set to true');
      // Clear the flag after a longer delay to allow dialog to fully render and prevent click propagation
      setTimeout(() => {
        console.log('Clearing justOpened flag');
        justOpenedRef.current = false;
      }, 300); // Increased to 300ms
    });
  }, []);

  const prompt = useCallback((opts: InputDialogOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setInputOptions(opts);
      setIsInputOpen(true);
      // Store the resolve function directly in ref
      resolveInputPromiseRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolvePromiseRef.current) {
      const resolveFn = resolvePromiseRef.current;
      // Clear ref immediately to prevent handleDialogClose from resolving again
      resolvePromiseRef.current = null;
      resolveFn(true);
    }
    // Don't call setIsOpen here - let the dialog component handle it via onOpenChange
  }, []);

  const handleCancel = useCallback(() => {
    if (resolvePromiseRef.current) {
      const resolveFn = resolvePromiseRef.current;
      // Clear ref immediately to prevent handleDialogClose from resolving again
      resolvePromiseRef.current = null;
      resolveFn(false);
    }
    // Don't call setIsOpen here - let the dialog component handle it via onOpenChange
  }, []);

  const handleInputConfirm = useCallback((value: string) => {
    if (resolveInputPromiseRef.current) {
      const resolveFn = resolveInputPromiseRef.current;
      // Clear ref immediately to prevent handleInputDialogClose from resolving again
      resolveInputPromiseRef.current = null;
      resolveFn(value);
    }
    // Don't call setIsInputOpen here - let the dialog component handle it via onOpenChange
  }, []);

  const handleInputCancel = useCallback(() => {
    if (resolveInputPromiseRef.current) {
      const resolveFn = resolveInputPromiseRef.current;
      // Clear ref immediately to prevent handleInputDialogClose from resolving again
      resolveInputPromiseRef.current = null;
      resolveFn(null);
    }
    // Don't call setIsInputOpen here - let the dialog component handle it via onOpenChange
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    const justOpened = justOpenedRef.current;
    console.log('handleDialogClose called with open:', open, 'resolvePromiseRef.current:', !!resolvePromiseRef.current, 'justOpened:', justOpened);
    
    // Always allow opening
    if (open) {
      console.log('Dialog opening - allowing');
      setIsOpen(true);
      return;
    }
    
    // Prevent closing immediately after opening (likely from button click propagation)
    if (justOpened) {
      console.log('Dialog close prevented - just opened, likely from button click propagation. Ignoring close request.');
      // Don't update state - keep dialog open
      return;
    }
    
    if (resolvePromiseRef.current) {
      // Dialog was closed (via X button, ESC, or outside click) - treat as cancel
      console.log('Dialog closed without confirm/cancel, resolving with false');
      const resolveFn = resolvePromiseRef.current;
      resolvePromiseRef.current = null;
      resolveFn(false);
    }
    console.log('Setting dialog to closed');
    setIsOpen(false);
  }, []);

  const handleInputDialogClose = useCallback((open: boolean) => {
    if (!open && resolveInputPromiseRef.current) {
      // Dialog was closed (via X button, ESC, or outside click) - treat as cancel
      resolveInputPromiseRef.current(null);
      resolveInputPromiseRef.current = null;
    }
    setIsInputOpen(open);
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirm, prompt }}>
      {children}
      <ConfirmationDialog
        open={isOpen}
        onOpenChange={handleDialogClose}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        variant={options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <InputDialog
        open={isInputOpen}
        onOpenChange={handleInputDialogClose}
        title={inputOptions.title}
        message={inputOptions.message}
        inputLabel={inputOptions.inputLabel}
        inputPlaceholder={inputOptions.inputPlaceholder}
        requiredValue={inputOptions.requiredValue}
        confirmText={inputOptions.confirmText}
        cancelText={inputOptions.cancelText}
        variant={inputOptions.variant}
        onConfirm={handleInputConfirm}
        onCancel={handleInputCancel}
      />
    </ConfirmationContext.Provider>
  );
}

export function useConfirmationDialog() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmationDialog must be used within ConfirmationProvider');
  }
  return context;
}

