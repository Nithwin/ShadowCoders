'use client';

import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  const onCloseRef = useRef(onClose);

  // Update ref whenever onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Use the ref to call the latest onClose function
        setTimeout(() => onCloseRef.current?.(), 300); // Wait for animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]); // Removed onClose from dependencies to prevent timer reset

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const typeStyles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-600" />,
    },
  };

  const styles = typeStyles[type];

  if (!isVisible) return null;

  return (
    <div
      className={`${styles.bg} ${styles.border} ${styles.text} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{styles.icon}</div>
        <div className="flex-1 text-sm font-medium">{message}</div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}
