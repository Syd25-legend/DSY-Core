import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

// Toast types with their icons and colors
const TOAST_TYPES = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-400',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
};

// Individual Toast Component
function Toast({ id, message, type = 'info', onClose }) {
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-xl ${config.bgColor} ${config.borderColor} animate-slide-in`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <p className="flex-1 text-sm text-slate-200 leading-relaxed">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}

// Confirmation Dialog Component
function ConfirmDialog({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) {
  const config = TOAST_TYPES[type] || TOAST_TYPES.warning;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 bg-[#1A1625]/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl animate-scale-in">
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-2 rounded-xl ${config.bgColor}`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100 mb-1">{title}</h3>
            <p className="text-sm text-slate-400 whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl glass-panel hover:bg-white/5 text-slate-400 text-sm font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              type === 'error' 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                : 'bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-[#C5A059] border border-[#C5A059]/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast Provider Component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Add a toast notification
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    
    return id;
  }, []);

  // Remove a toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Shorthand methods
  const toast = {
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
    warning: (message, duration) => showToast(message, 'warning', duration),
    info: (message, duration) => showToast(message, 'info', duration),
  };

  // Show confirmation dialog (replaces confirm())
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title: options.title || 'Confirm',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-20 right-4 z-[90] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast
              id={t.id}
              message={t.message}
              type={t.type}
              onClose={removeToast}
            />
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog {...confirmDialog} />
      )}
    </ToastContext.Provider>
  );
}

// Custom hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;
