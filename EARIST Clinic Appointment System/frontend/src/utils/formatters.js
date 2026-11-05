/**
 * Helper to reliably format doctor and clinic staff names without duplicate "Dr." prefixes
 */
export function formatDoctorName(firstName, lastName) {
  if (!firstName && !lastName) return 'Assigned Medical Staff';
  
  let cleanFirst = (firstName || '').trim();
  let cleanLast = (lastName || '').trim();

  // Strip leading "Dr." or "Dr" case-insensitively
  cleanFirst = cleanFirst.replace(/^Dr\.?\s+/i, '').trim();
  cleanLast = cleanLast.replace(/^Dr\.?\s+/i, '').trim();

  const full = `${cleanFirst} ${cleanLast}`.trim();
  return full ? `Dr. ${full}` : 'Assigned Medical Staff';
}

