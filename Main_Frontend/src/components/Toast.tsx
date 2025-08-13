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
    <div 
      style={{
        position: 'fixed',
        bottom: '60px',  // Above the status bar (40px height + 20px gap)
        right: '20px',
        backgroundColor: type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 9999,  // Above everything
        animation: 'slideUp 0.3s ease-out',
        minWidth: '300px'
      }}
    >
      {icons[type]}
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{message}</span>
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