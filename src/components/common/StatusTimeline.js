import React from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

const steps = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'review', label: 'Under Review' },
  { key: 'decision', label: 'Decision' },
];

const getStepState = (status, stepKey) => {
  if (stepKey === 'submitted') return 'complete';
  if (stepKey === 'review') {
    if (status === 'pending') return 'active';
    return 'complete';
  }
  if (stepKey === 'decision') {
    if (status === 'pending') return 'upcoming';
    if (status === 'approved') return 'approved';
    if (status === 'rejected') return 'rejected';
    if (status === 'resubmit') return 'resubmit';
  }
  return 'upcoming';
};

const iconMap = {
  complete: <CheckCircle size={20} className="text-accent-500" />,
  active: <Clock size={20} className="text-yellow-500 animate-pulse" />,
  approved: <CheckCircle size={20} className="text-accent-500" />,
  rejected: <XCircle size={20} className="text-danger-500" />,
  resubmit: <AlertTriangle size={20} className="text-orange-500" />,
  upcoming: <div className="w-5 h-5 rounded-full border-2 border-brand-200" />,
};

const StatusTimeline = ({ status }) => {
  return (
    <div className="flex items-center gap-0 w-full max-w-lg mx-auto">
      {steps.map((step, i) => {
        const state = getStepState(status, step.key);
        const isLast = i === steps.length - 1;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {iconMap[state]}
              <span className="text-xs font-medium text-brand-600 text-center whitespace-nowrap">
                {step.key === 'decision' && status !== 'pending'
                  ? status.charAt(0).toUpperCase() + status.slice(1)
                  : step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-2 rounded ${
                state === 'complete' || state === 'approved' ? 'bg-accent-400' : 'bg-brand-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StatusTimeline;
