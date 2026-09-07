import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../i18n/LanguageContext';
import { appAlert, appConfirm, setDialogImpl } from './dialogApi';
import './AppDialog.css';

const DialogContext = createContext(null);

function Icon({ kind }) {
    if (kind === 'danger') {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        );
    }
    if (kind === 'info') {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
            </svg>
        );
    }
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export function DialogProvider({ children }) {
    const { t } = useTranslation();
    const [current, setCurrent] = useState(null);
    const queueRef = useRef([]);

    const closeAndFlush = useCallback((result) => {
        setCurrent((prev) => {
            prev?.resolve?.(result);
            return null;
        });
    }, []);

    useEffect(() => {
        if (current) return;
        const next = queueRef.current.shift();
        if (next) setCurrent(next);
    }, [current]);

    const enqueue = useCallback((item) => {
        return new Promise((resolve) => {
            queueRef.current.push({ ...item, resolve });
            setCurrent((prev) => prev || queueRef.current.shift());
        });
    }, []);

    const showAlert = useCallback((message, options = {}) => {
        return enqueue({
            variant: 'alert',
            title: options.title || t('common.dialogNotice'),
            message: String(message ?? ''),
            confirmText: options.confirmText || t('common.dialogClose'),
            isDanger: !!options.isDanger,
        });
    }, [enqueue, t]);

    const showConfirm = useCallback((message, options = {}) => {
        return enqueue({
            variant: 'confirm',
            title: options.title || t('common.dialogConfirm'),
            message: String(message ?? ''),
            confirmText: options.confirmText || t('common.dialogOk'),
            cancelText: options.cancelText || t('common.dialogCancel'),
            isDanger: !!options.isDanger,
        });
    }, [enqueue, t]);

    useEffect(() => {
        setDialogImpl({
            alert: showAlert,
            confirm: showConfirm,
        });
        return () => setDialogImpl({
            alert: async (message) => { if (typeof window !== 'undefined') window.alert(String(message ?? '')); },
            confirm: async (message) => (typeof window !== 'undefined' ? window.confirm(String(message ?? '')) : false),
        });
    }, [showAlert, showConfirm]);

    useEffect(() => {
        if (!current) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeAndFlush(current.variant === 'confirm' ? false : true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [current, closeAndFlush]);

    const iconKind = current?.isDanger ? 'danger' : (current?.variant === 'alert' ? 'info' : 'confirm');

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {current && typeof document !== 'undefined' && createPortal(
                <div
                    className="dpc-dialog-overlay"
                    role="presentation"
                    onClick={() => {
                        if (current.variant === 'alert') closeAndFlush(true);
                    }}
                >
                    <div
                        className="dpc-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="dpc-dialog-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`dpc-dialog-icon is-${iconKind}`}>
                            <Icon kind={iconKind} />
                        </div>
                        <h3 id="dpc-dialog-title">{current.title}</h3>
                        <p>{current.message}</p>
                        <div className="dpc-dialog-actions">
                            {current.variant === 'confirm' && (
                                <button type="button" className="dpc-dialog-btn dpc-dialog-btn-ghost" onClick={() => closeAndFlush(false)}>
                                    {current.cancelText}
                                </button>
                            )}
                            <button
                                type="button"
                                className={`dpc-dialog-btn ${current.isDanger ? 'dpc-dialog-btn-danger' : 'dpc-dialog-btn-primary'}`}
                                onClick={() => closeAndFlush(true)}
                                autoFocus
                            >
                                {current.confirmText}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DialogContext.Provider>
    );
}

export function useDialog() {
    const ctx = useContext(DialogContext);
    if (!ctx) return { showAlert: appAlert, showConfirm: appConfirm };
    return ctx;
}
