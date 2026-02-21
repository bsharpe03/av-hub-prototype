import { useState, useEffect, useMemo } from 'react'
import { Search, Filter, MapPin } from 'lucide-react'
import { fetchPolicies, fetchPolicyMapStates } from '../api'
import { StateMap } from '../components/MapView'
import DataTable from '../components/DataTable'
import ExportButton from '../components/ExportButton'
import LastUpdated from '../components/LastUpdated'
import StatusBadge from '../components/StatusBadge'

export default function PolicyTracker() {
  const [policies, setPolicies] = useState([])
  const [stateData, setStateData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [policyType, setPolicyType] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')

  // Derived jurisdiction options from data
  const jurisdictionOptions = useMemo(() => {
    const unique = [...new Set(policies.map((p) => p.jurisdiction).filter(Boolean))]
    return unique.sort()
  }, [policies])

  // Build query params from filters
  const queryParams = useMemo(() => {
    const params = {}
    if (search) params.search = search
    if (status) params.status = status
    if (policyType) params.policy_type = policyType
    if (jurisdiction) params.jurisdiction = jurisdiction
    return params
  }, [search, status, policyType, jurisdiction])

  // Fetch policies when filters change
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchPolicies(queryParams)
      .then((data) => {
        if (!cancelled) {
          setPolicies(Array.isArray(data) ? data : data.data || [])
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [queryParams])

  // Fetch map state data on mount
  useEffect(() => {
    fetchPolicyMapStates()
      .then((data) => setStateData(Array.isArray(data) ? data : data.data || []))
      .catch(() => {})
  }, [])

  const columns = [
    {
      key: 'jurisdiction',
      label: 'Jurisdiction',
    },
    {
      key: 'title',
      label: 'Title',
    },
    {
      key: 'policy_type',
      label: 'Type',
    },
    {
      key: 'vehicle_class',
      label: 'Vehicle Class',
    },
    {
      key: 'date_enacted',
      label: 'Date Enacted',
      render: (value) => {
        if (!value) return '\u2014'
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'source_url',
      label: 'Source',
      sortable: false,
      render: (value) =>
        value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
            onClick={(e) => e.stopPropagation()}
          >
            View
          </a>
        ) : (
          '\u2014'
        ),
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="page-header flex items-center gap-3">
          <MapPin className="text-blue-600" size={28} />
          Interactive Policy Tracker
        </h1>
        <p className="page-subtitle">
          AV regulations and legislation across all 50 states and federal level
        </p>
      </div>

      {/* State Map */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <MapPin size={20} className="text-blue-600" />
            Policy Map by State
          </h2>
          <LastUpdated data={policies} />
        </div>
        <StateMap stateData={stateData} height="420px" />
      </div>

      {/* Filter Bar */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Filters</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Text Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search policies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 w-full"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="select-field"
          >
            <option value="">All Statuses</option>
            <option value="Enacted">Enacted</option>
            <option value="Pending">Pending</option>
            <option value="Proposed">Proposed</option>
          </select>

          {/* Policy Type Dropdown */}
          <select
            value={policyType}
            onChange={(e) => setPolicyType(e.target.value)}
            className="select-field"
          >
            <option value="">All Types</option>
            <option value="Legislation">Legislation</option>
            <option value="Regulation">Regulation</option>
            <option value="Executive Order">Executive Order</option>
          </select>

          {/* Jurisdiction Dropdown */}
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            className="select-field"
          >
            <option value="">All Jurisdictions</option>
            {jurisdictionOptions.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Header with Export */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          {loading ? 'Loading...' : `${policies.length} ${policies.length === 1 ? 'policy' : 'policies'} found`}
        </div>
        <ExportButton resource="policies" params={queryParams} />
      </div>

      {/* Error State */}
      {error && (
        <div className="card border-red-200 bg-red-50 text-red-700 mb-6">
          <p>Failed to load policies: {error}</p>
        </div>
      )}

      {/* Data Table */}
      {loading ? (
        <div className="card text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
          <p>Loading policies...</p>
        </div>
      ) : (
        <DataTable columns={columns} data={policies} />
      )}
    </div>
  )
}
