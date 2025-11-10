'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  maxHeight?: string;
}

export default function Modal({ 
  open, 
  onOpenChange, 
  title, 
  children, 
  size = 'md',
  maxHeight = '90vh'
}: ModalProps) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content 
          className={`fixed left-[50%] top-[50%] z-50 w-full ${sizeClasses[size]} translate-x-[-50%] translate-y-[-50%] gap-0 border border-primary/20 bg-secondary shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg overflow-hidden flex flex-col`}
          style={{ maxHeight, height: 'auto' }}
        >
          {/* Sticky Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-primary/10 bg-secondary flex-shrink-0">
            <Dialog.Title className="text-2xl font-bold font-alan-sans text-primary">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded-full text-primary/70 hover:bg-primary/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          
          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 px-6 py-4 custom-scrollbar min-h-0">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}