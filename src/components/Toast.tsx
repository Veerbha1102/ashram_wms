'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

interface ToastContextType {
    showToast: (type: Toast['type'], message: string) => void;
    showError: (message: string) => void;
    showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((type: Toast['type'], message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, type, message }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const showError = useCallback((message: string) => {
        showToast('error', message);
    }, [showToast]);

    const showSuccess = useCallback((message: string) => {
        showToast('success', message);
    }, [showToast]);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const getToastStyles = (type: Toast['type']) => {
        switch (type) {
            case 'success':
                return 'bg-green-500 border-green-600';
            case 'error':
                return 'bg-red-500 border-red-600';
            case 'warning':
                return 'bg-yellow-500 border-yellow-600';
            case 'info':
            default:
                return 'bg-blue-500 border-blue-600';
        }
    };

    const getIcon = (type: Toast['type']) => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': default: return 'ℹ️';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`${getToastStyles(toast.type)} text-white px-4 py-3 rounded-xl shadow-lg border-l-4 flex items-center gap-3 min-w-[300px] max-w-[400px] animate-slide-in`}
                        onClick={() => removeToast(toast.id)}
                    >
                        <span className="text-xl">{getIcon(toast.type)}</span>
                        <span className="flex-1">{toast.message}</span>
                        <button
                            className="text-white/70 hover:text-white text-xl"
                            onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </ToastContext.Provider>
    );
}
