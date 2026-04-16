import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle size={18} className="text-accent-500" />,
  error: <XCircle size={18} className="text-danger-500" />,
  warning: <AlertTriangle size={18} className="text-orange-500" />,
  info: <Info size={18} className="text-brand-500" />,
};

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration) {
      const t = setTimeout(onClose, duration);
      return () => clearTimeout(t);
    }
  }, [duration, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-6 right-6 z-50 animate-fade-in">
      <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-elevated border border-surface-300">
        {icons[type]}
        <p className="text-sm font-medium text-brand-800">{message}</p>
        <button onClick={onClose} className="ml-2 text-brand-400 hover:text-brand-600">×</button>
      </div>
    </div>
  );
};

export default Toast;
