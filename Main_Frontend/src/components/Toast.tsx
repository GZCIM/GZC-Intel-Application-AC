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
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: type === 'success' ? '#ffffff' : type === 'error' ? '#fee2e2' : '#dbeafe',
        color: type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#2563eb',
        border: `1px solid ${type === 'success' ? '#d1fae5' : type === 'error' ? '#fecaca' : '#bfdbfe'}`,
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 9999,  // Above everything
        animation: 'slideUp 0.3s ease-out',
        minWidth: '300px'
      }}
    >
      {React.cloneElement(icons[type], { color: type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#2563eb' })}
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