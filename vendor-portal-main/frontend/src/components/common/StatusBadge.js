import React from 'react';

const statusMap = {
  // Application statuses
  pending:        { cls: 'badge-pending',   label: 'Pending' },
  vendor_review:  { cls: 'badge-pending',   label: 'Pending' },
  approved:       { cls: 'badge-approved',  label: 'Approved' },
  verified:       { cls: 'badge-approved',  label: 'Approved' },
  rejected:       { cls: 'badge-rejected',  label: 'Rejected' },
  resubmit:       { cls: 'badge-resubmit',  label: 'Resubmit Required' },

  // Order statuses
  accepted:       { cls: 'badge-accepted',  label: 'Accepted' },
  shipped:        { cls: 'badge-shipped',   label: 'Shipped' },
  delivered:      { cls: 'badge-delivered', label: 'Delivered' },
  cancelled:      { cls: 'badge-rejected',  label: 'Cancelled' },
  completed:      { cls: 'badge-delivered', label: 'Completed' },

  // RFQ statuses
  active:         { cls: 'badge-pending',   label: 'Open' },
  open:           { cls: 'badge-pending',   label: 'Open' },
  extended:       { cls: 'badge-shipped',   label: 'Extended' },
  closed:         { cls: 'badge-approved',  label: 'Closed' },
  draft:          { cls: 'bg-gray-100 text-gray-500', label: 'Draft' },

  // Quote statuses
  submitted:      { cls: 'badge-pending',   label: 'Submitted' },
  selected:       { cls: 'badge-approved',  label: 'Selected' },
};

const StatusBadge = ({ status }) => {
  const key = (status || '').toLowerCase().replace(/ /g, '_');
  const s = statusMap[key] || { cls: 'bg-gray-100 text-gray-600', label: status || '—' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
};

export default StatusBadge;
