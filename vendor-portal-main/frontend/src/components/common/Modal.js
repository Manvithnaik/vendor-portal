import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

const sizeStyles = {
  sm: '28rem',
  md: '36rem',
  lg: '48rem',
  xl: '90vw',
  full: '95vw',
};

const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const maxW = sizeStyles[size] || sizeStyles.md;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-start sm:items-center justify-center overflow-y-auto"
      style={{ zIndex: 9999, padding: '1.5rem' }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999 }}
        onClick={onClose}
      />
      {/* Modal content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10000,
          maxWidth: maxW,
          width: '100%',
          maxHeight: 'calc(100vh - 3rem)',
          margin: '1rem auto',
          backgroundColor: '#fff',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.3s ease-out forwards',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              fontWeight: 700,
              fontSize: '1.25rem',
              color: '#1e293b',
              margin: 0,
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '0.375rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={22} color="#64748b" />
          </button>
        </div>
        {/* Body */}
        <div
          style={{
            padding: '1.5rem 1.75rem',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
