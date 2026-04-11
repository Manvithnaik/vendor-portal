import React from 'react';

const statusMap = {
  pending:   { className: 'badge-pending',   label: 'Pending' },
  approved:  { className: 'badge-approved',  label: 'Approved' },
  rejected:  { className: 'badge-rejected',  label: 'Rejected' },
  resubmit:  { className: 'badge-resubmit',  label: 'Resubmit Required' },
  accepted:  { className: 'badge-accepted',  label: 'Accepted' },
  shipped:   { className: 'badge-shipped',   label: 'Shipped' },
  delivered: { className: 'badge-delivered', label: 'Delivered' },
};

const StatusBadge = ({ status }) => {
  const s = statusMap[status] || { className: 'bg-gray-100 text-gray-700', label: status };
  return <span className={`badge ${s.className}`}>{s.label}</span>;
};

export default StatusBadge;
