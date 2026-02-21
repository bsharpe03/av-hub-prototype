import { Clock } from 'lucide-react'

export default function LastUpdated({ data }) {
  if (!data || data.length === 0) return null

  const latest = data.reduce((max, item) => {
    const d = item.updated_at || item.created_at
    return d && d > max ? d : max
  }, '')

  if (!latest) return null

  const date = new Date(latest)
  const formatted = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <span className="text-xs text-gray-400 flex items-center gap-1">
      <Clock size={12} />
      Last updated: {formatted}
    </span>
  )
}
