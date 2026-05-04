import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

/**
 * DetailDrawer — right-side slide-in panel for item detail views.
 * Replaces modal-based detail views for tables across the app.
 *
 * Props:
 *  open       — boolean: whether the drawer is visible
 *  onClose    — function: called when backdrop or X is clicked
 *  title      — string: drawer header title
 *  subtitle   — string (optional): smaller text under title
 *  children   — ReactNode: drawer body content
 *  width      — string (optional): max-width CSS value, default '32rem'
 */
const DetailDrawer = ({ open, onClose, title, subtitle, children, width = '32rem' }) => {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className="relative bg-white h-full shadow-2xl border-l border-surface-200 flex flex-col drawer-slide-in"
        style={{ width: '100%', maxWidth: width, zIndex: 1 }}
      >
        {/* Sticky Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-surface-200 bg-white/95 backdrop-blur sticky top-0 z-10 flex-shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="font-display font-bold text-lg text-brand-900 leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-brand-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-400 hover:bg-surface-100 hover:text-brand-700 transition-colors flex-shrink-0 -mr-1"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DetailDrawer;
