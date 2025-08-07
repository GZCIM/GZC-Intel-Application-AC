import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface DraggableWindowProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  width?: number;
  height?: number;
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({
  title,
  children,
  isOpen,
  onClose,
  defaultPosition = { x: 100, y: 100 },
  width = 400,
  height = 500,
}) => {
  const { currentTheme: theme } = useTheme();
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={windowRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: theme.surface,
        border: `2px solid ${theme.border}`,
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10000,
        overflow: 'hidden',
      }}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '12px 16px',
          backgroundColor: theme.background,
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: theme.text }}>
          {title}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: theme.textSecondary,
            cursor: 'pointer',
            fontSize: '20px',
            padding: '0 4px',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = theme.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = theme.textSecondary;
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          color: theme.text,
        }}
      >
        {children}
      </div>
    </div>
  );
};