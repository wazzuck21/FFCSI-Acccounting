import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, Info, Trash2, X } from 'lucide-react';

export type ModalType = 'info' | 'success' | 'warning' | 'danger' | 'error';

export interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  type?: ModalType;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
  isConfirmLoading?: boolean;
}

export const AppModal: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  children,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  showCancel = false,
  isConfirmLoading = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
      case 'error':
        return <AlertCircle className="w-6 h-6 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
      case 'info':
      default:
        return <Info className="w-6 h-6 text-sky-600" />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'danger':
      case 'error':
        return 'bg-rose-50 border-rose-100 text-rose-950';
      case 'warning':
        return 'bg-amber-50 border-amber-100 text-amber-950';
      case 'success':
        return 'bg-emerald-50 border-emerald-100 text-emerald-950';
      case 'info':
      default:
        return 'bg-sky-50 border-sky-100 text-sky-950';
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
      case 'error':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-200';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200';
      case 'info':
      default:
        return 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${getHeaderBg()}`}>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white rounded-xl shadow-2xs">
              {getIcon()}
            </div>
            <h3 className="font-bold text-sm tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 text-xs text-slate-600 space-y-3 leading-relaxed">
          {message && <p className="font-medium text-slate-700 whitespace-pre-line">{message}</p>}
          {children}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2">
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            disabled={isConfirmLoading}
            onClick={() => {
              if (onConfirm) {
                onConfirm();
              } else {
                onClose();
              }
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
