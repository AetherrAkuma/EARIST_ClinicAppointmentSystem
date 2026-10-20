import React from 'react';

export const Badge = ({ status, className = '' }) => {
  const getBadgeStyle = (s) => {
    switch (s?.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/20';
      case 'ongoing':
      case 'in consultation':
        return 'bg-blue-50 text-blue-700 border-blue-300 ring-blue-500/20';
      case 'completed':
        return 'bg-purple-50 text-purple-700 border-purple-300 ring-purple-500/20';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-500/20';
      case 'pending':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-500/20';
    }
  };

  const isPulsing = ['pending', 'ongoing'].includes(status?.toLowerCase());

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ring-1 ring-inset ${getBadgeStyle(
        status
      )} ${className}`}
    >
      {isPulsing && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {!isPulsing && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current"></span>}
      {status || 'Pending'}
    </span>
  );
};
