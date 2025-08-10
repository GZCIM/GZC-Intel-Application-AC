import React, { useState, useEffect } from 'react';
import { debugLogger } from '../../utils/debugLogger';
import { logFileWriter } from '../../utils/logFileWriter';

export const DebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [showPanel, setShowPanel] = useState(true);

  useEffect(() => {
    // Subscribe to log updates
    const unsubscribe = debugLogger.subscribe((log) => {
      setLogs(prev => [...prev.slice(-99), log]); // Keep last 100 logs
    });

    // Load initial logs
    setLogs(debugLogger.getLogs());

    // Keyboard shortcut to toggle panel (Ctrl+Shift+D)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowPanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (!showPanel) return null;

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const errorCount = logs.filter(l => l.level === 'error' || l.level === 'critical').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  const levelColors: Record<string, string> = {
    debug: '#888888',
    info: '#0066cc',
    warn: '#ff9900',
    error: '#ff0000',
    critical: '#ff0066'
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '0',
        right: '0',
        width: isMinimized ? '200px' : '600px',
        height: isMinimized ? '40px' : '400px',
        background: 'rgba(0, 0, 0, 0.95)',
        border: '2px solid #333',
        borderRadius: '8px 8px 0 0',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '11px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px',
          background: '#1a1a1a',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'move'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>🔍 Debug Panel</span>
          {errorCount > 0 && (
            <span style={{ background: '#ff0000', padding: '2px 6px', borderRadius: '3px' }}>
              {errorCount} errors
            </span>
          )}
          {warnCount > 0 && (
            <span style={{ background: '#ff9900', padding: '2px 6px', borderRadius: '3px' }}>
              {warnCount} warnings
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={() => setShowPanel(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Filters */}
          <div
            style={{
              padding: '8px',
              background: '#0a0a0a',
              borderBottom: '1px solid #333',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}
          >
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '4px 8px',
                background: filter === 'all' ? '#333' : 'transparent',
                border: '1px solid #333',
                color: '#fff',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter('error')}
              style={{
                padding: '4px 8px',
                background: filter === 'error' ? '#ff0000' : 'transparent',
                border: '1px solid #ff0000',
                color: '#fff',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Errors ({errorCount})
            </button>
            <button
              onClick={() => setFilter('warn')}
              style={{
                padding: '4px 8px',
                background: filter === 'warn' ? '#ff9900' : 'transparent',
                border: '1px solid #ff9900',
                color: '#fff',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Warnings ({warnCount})
            </button>
            <button
              onClick={() => setFilter('info')}
              style={{
                padding: '4px 8px',
                background: filter === 'info' ? '#0066cc' : 'transparent',
                border: '1px solid #0066cc',
                color: '#fff',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Info
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
              <button
                onClick={() => setLogs([])}
                style={{
                  padding: '4px 8px',
                  background: '#666',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
              <button
                onClick={() => logFileWriter.downloadLogs()}
                style={{
                  padding: '4px 8px',
                  background: '#0066cc',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Export
              </button>
            </div>
          </div>

          {/* Logs */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '8px',
              background: '#000'
            }}
          >
            {filteredLogs.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                No logs to display
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: '8px',
                    padding: '6px',
                    background: '#0a0a0a',
                    border: `1px solid ${levelColors[log.level]}`,
                    borderRadius: '3px'
                  }}
                  onClick={() => {
                    console.log('Full log details:', log);
                    if (log.data) console.log('Log data:', log.data);
                    if (log.stack) console.log('Stack trace:', log.stack);
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ color: levelColors[log.level], fontWeight: 'bold' }}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span style={{ color: '#666' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span style={{ color: '#999' }}>{log.category}</span>
                  </div>
                  <div style={{ color: '#fff', marginLeft: '10px' }}>
                    {log.message}
                  </div>
                  {log.data && (
                    <div style={{ 
                      color: '#888', 
                      marginLeft: '10px', 
                      marginTop: '4px',
                      fontSize: '10px',
                      maxHeight: '60px',
                      overflow: 'hidden'
                    }}>
                      {typeof log.data === 'string' 
                        ? log.data 
                        : JSON.stringify(log.data, null, 2).substring(0, 200)}
                    </div>
                  )}
                  {log.error && (
                    <div style={{ 
                      color: '#ff6666', 
                      marginLeft: '10px', 
                      marginTop: '4px',
                      fontSize: '10px'
                    }}>
                      Error: {log.error.message || log.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '6px',
              background: '#1a1a1a',
              borderTop: '1px solid #333',
              fontSize: '10px',
              color: '#666',
              textAlign: 'center'
            }}
          >
            Press Ctrl+Shift+D to toggle panel | Click log for details in console
          </div>
        </>
      )}
    </div>
  );
};