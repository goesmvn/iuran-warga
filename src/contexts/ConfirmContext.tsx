import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

interface AlertOptions {
  title: string;
  message: string;
  okText?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string, message?: string, type?: 'info' | 'warning' | 'danger') => Promise<boolean>;
  alert: (options: AlertOptions | string, message?: string, type?: 'info' | 'success' | 'warning' | 'error') => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'danger' | 'error'>('info');
  const [confirmText, setConfirmText] = useState('OK');
  const [cancelText, setCancelText] = useState('Batal');

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (
    options: ConfirmOptions | string,
    msg?: string,
    t: 'info' | 'warning' | 'danger' = 'warning'
  ): Promise<boolean> => {
    setIsConfirm(true);
    if (typeof options === 'string') {
      if (msg) {
        setTitle(options);
        setMessage(msg);
        setType(t);
      } else {
        setTitle('Konfirmasi');
        setMessage(options);
        setType(t);
      }
      setConfirmText('Ya, Lanjutkan');
      setCancelText('Batal');
    } else {
      setTitle(options.title || 'Konfirmasi');
      setMessage(options.message || '');
      setType(options.type || 'warning');
      setConfirmText(options.confirmText || 'Ya, Lanjutkan');
      setCancelText(options.cancelText || 'Batal');
    }
    setIsOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const alert = (
    options: AlertOptions | string,
    msg?: string,
    t: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<void> => {
    setIsConfirm(false);
    if (typeof options === 'string') {
      if (msg) {
        setTitle(options);
        setMessage(msg);
        setType(t);
      } else {
        setTitle('Informasi');
        setMessage(options);
        setType(t);
      }
      setConfirmText('OK');
    } else {
      setTitle(options.title || 'Informasi');
      setMessage(options.message || '');
      setType(options.type || 'info');
      setConfirmText(options.okText || 'OK');
    }
    setIsOpen(true);
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
    });
  };

  const handleClose = (value: boolean) => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
  };

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-12 h-12 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-amber-500" />;
      case 'danger':
      case 'error':
        return <AlertTriangle className="w-12 h-12 text-rose-500" />;
      case 'info':
      default:
        return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getThemeClasses = () => {
    switch (type) {
      case 'success':
        return {
          iconBg: 'bg-green-50 border-green-100',
          confirmBtn: 'bg-green-600 hover:bg-green-700 shadow-green-500/20 text-white',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 border-amber-100',
          confirmBtn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-white',
        };
      case 'danger':
      case 'error':
        return {
          iconBg: 'bg-rose-50 border-rose-100',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20 text-white',
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-50 border-blue-100',
          confirmBtn: 'bg-[#f43f5e] hover:bg-[#e11d48] shadow-brand-500/20 text-white',
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleClose(false)}
              className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden border border-gray-100"
            >
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <div className="flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 mb-6 ${theme.iconBg}`}>
                    {getIcon()}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 font-display">
                    {title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed text-sm whitespace-pre-line">
                    {(() => {
                      if (!message) return null;
                      const parts = message.split(/(\*[^*]+\*)/g);
                      return parts.map((part, idx) => {
                        if (part.startsWith('*') && part.endsWith('*')) {
                          return <strong key={idx} className="font-black text-gray-900">{part.slice(1, -1)}</strong>;
                        }
                        return part;
                      });
                    })()}
                  </p>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  {isConfirm && (
                    <button
                      type="button"
                      onClick={() => handleClose(false)}
                      className="w-full sm:w-auto px-6 py-3 border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer text-center order-2 sm:order-1"
                    >
                      {cancelText}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleClose(true)}
                    className={`w-full sm:w-auto px-8 py-3 text-sm font-bold rounded-2xl transition-all shadow-md active:scale-[0.98] cursor-pointer text-center order-1 sm:order-2 ${theme.confirmBtn}`}
                  >
                    {confirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
