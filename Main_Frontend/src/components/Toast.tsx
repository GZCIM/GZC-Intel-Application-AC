import React, { useEffect } from 'react';
import { FeatherIcon } from './icons/FeatherIcon';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <FeatherIcon name="check-circle" size={20} color="white" />,
    error: <FeatherIcon name="x-circle" size={20} color="white" />,
    info: <FeatherIcon name="info" size={20} color="white" />
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  return (
    <div className={`fixed bottom-4 right-4 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-up z-50`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
};

// Toast manager singleton
class ToastManager {
  private static instance: ToastManager;
  private listeners: ((toast: { message: string; type: 'success' | 'error' | 'info' }) => void)[] = [];

  static getInstance() {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  show(message: string, type: 'success' | 'error' | 'info' = 'success') {
    this.listeners.forEach(listener => listener({ message, type }));
  }

  subscribe(listener: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const toastManager = ToastManager.getInstance();