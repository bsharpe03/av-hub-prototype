import { Download } from 'lucide-react'
import { getExportUrl } from '../api'

export default function ExportButton({ resource, params, label = 'Export CSV' }) {
  function handleExport() {
    const url = getExportUrl(resource, params)
    window.open(url, '_blank')
  }

  return (
    <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
      <Download size={16} />
      {label}
    </button>
  )
}
