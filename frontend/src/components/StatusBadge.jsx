const badgeClasses = {
  enacted: 'badge-enacted',
  active: 'badge-active',
  open: 'badge-open',
  pending: 'badge-pending',
  proposed: 'badge-proposed',
  upcoming: 'badge-upcoming',
  testing: 'badge-testing',
  paused: 'badge-paused',
  closed: 'badge-closed',
  expired: 'badge-closed',
  completed: 'badge-completed',
  pilot: 'badge-testing',
}

export default function StatusBadge({ status }) {
  if (!status) return null
  const cls = badgeClasses[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
  return <span className={`badge ${cls}`}>{status}</span>
}
