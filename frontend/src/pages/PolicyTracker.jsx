import { useState, useEffect, useMemo } from 'react'
import { Search, Filter, MapPin, ExternalLink } from 'lucide-react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchPolicies, fetchPolicyMapStates, fetchCurbsideMapLocations } from '../api'
import DataTable from '../components/DataTable'
import ExportButton from '../components/ExportButton'
import LastUpdated from '../components/LastUpdated'
import StatusBadge from '../components/StatusBadge'

const POLICY_STATUS_COLORS = {
  enacted: '#C1DEA6',
  active: '#C1DEA6',
  pending: '#FFDF95',
  proposed: '#FFDF95',
  none: '#f3f4f6',
}

const CURBSIDE_COLORS = {
  Enacted: '#659637',
  Active: '#659637',
  Pending: '#F4AB00',
  Proposed: '#F4AB00',
  default: '#004F98',
}

const stateCenters = {
  AL: [32.8, -86.8], AK: [64.0, -153.0], AZ: [34.3, -111.7], AR: [34.8, -92.2],
  CA: [37.2, -119.5], CO: [39.0, -105.5], CT: [41.6, -72.7], DE: [39.0, -75.5],
  FL: [28.6, -82.4], GA: [32.7, -83.4], HI: [20.5, -157.0], ID: [44.4, -114.6],
  IL: [40.0, -89.2], IN: [39.9, -86.3], IA: [42.0, -93.5], KS: [38.5, -98.3],
  KY: [37.8, -85.7], LA: [31.1, -92.0], ME: [45.4, -69.2], MD: [39.0, -76.7],
  MA: [42.3, -71.8], MI: [44.3, -84.5], MN: [46.3, -94.3], MS: [32.7, -89.7],
  MO: [38.4, -92.5], MT: [47.0, -109.6], NE: [41.5, -99.8], NV: [39.3, -116.6],
  NH: [43.7, -71.6], NJ: [40.1, -74.7], NM: [34.4, -106.1], NY: [42.9, -75.5],
  NC: [35.6, -79.8], ND: [47.4, -100.5], OH: [40.4, -82.8], OK: [35.6, -97.5],
  OR: [43.9, -120.6], PA: [41.0, -77.6], RI: [41.7, -71.5], SC: [34.0, -80.9],
  SD: [44.4, -100.2], TN: [35.9, -86.4], TX: [31.5, -99.3], UT: [39.3, -111.7],
  VT: [44.1, -72.6], VA: [37.5, -78.9], WA: [47.4, -120.7], WV: [38.6, -80.6],
  WI: [44.6, -89.7], WY: [43.0, -107.6], DC: [38.9, -77.0],
}

export default function PolicyTracker() {
  const [policies, setPolicies] = useState([])
  const [stateData, setStateData] = useState([])
  const [curbsideLocations, setCurbsideLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Map view toggle
  const [mapView, setMapView] = useState('state') // 'state' or 'curbside'

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

  // Fetch curbside locations on mount
  useEffect(() => {
    fetchCurbsideMapLocations()
      .then((data) => setCurbsideLocations(Array.isArray(data) ? data : data.data || []))
      .catch(() => {})
  }, [])

  const stateMap = useMemo(() => {
    const map = {}
    stateData.forEach((s) => { map[s.state_code] = s })
    return map
  }, [stateData])

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
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Link
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

      {/* Map Section */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <MapPin size={20} className="text-blue-600" />
            Policy Map
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMapView('state')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mapView === 'state'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              State Regulations
            </button>
            <button
              onClick={() => setMapView('curbside')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mapView === 'curbside'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              City Curbside Regulations
            </button>
            <LastUpdated data={policies} />
          </div>
        </div>

        <MapContainer
          center={[39.8, -98.5]}
          zoom={4}
          style={{ height: '420px', width: '100%' }}
          className="rounded-lg border border-gray-200"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* State Regulations View - Choropleth */}
          {mapView === 'state' && Object.entries(stateCenters).map(([code, coords]) => {
            const data = stateMap[code]
            const count = data?.count || data?.policy_count || 0
            const stateStatus = data?.status || null
            let fillColor = POLICY_STATUS_COLORS.none
            if (count > 0 && stateStatus) {
              fillColor = POLICY_STATUS_COLORS[stateStatus.toLowerCase()] || POLICY_STATUS_COLORS.none
            }
            return (
              <CircleMarker
                key={code}
                center={coords}
                radius={13}
                fillColor={fillColor}
                color={count > 0 ? '#888' : '#d1d5db'}
                weight={1.5}
                opacity={1}
                fillOpacity={0.85}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{code}</strong>
                    <div>{count} {count === 1 ? 'regulation' : 'regulations'}</div>
                    {stateStatus && <div className="text-gray-600 capitalize">{stateStatus}</div>}
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}

          {/* Curbside Regulations View - City dots */}
          {mapView === 'curbside' && curbsideLocations.map((loc, i) => (
            loc.latitude && loc.longitude ? (
              <CircleMarker
                key={`curb-${i}`}
                center={[loc.latitude, loc.longitude]}
                radius={8}
                fillColor={CURBSIDE_COLORS[loc.status] || CURBSIDE_COLORS.default}
                color="#fff"
                weight={2}
                opacity={1}
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{loc.city || loc.name}</strong>
                    {loc.state && <div>{loc.state}</div>}
                    {loc.status && <div className="capitalize mt-1">{loc.status}</div>}
                    {loc.description && <div className="mt-1 text-gray-600">{loc.description}</div>}
                  </div>
                </Popup>
              </CircleMarker>
            ) : null
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
          {mapView === 'state' ? (
            <>
              <span className="font-semibold">Legend:</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: '#C1DEA6' }} />
                Active Regulations (Enacted)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: '#FFDF95' }} />
                Under Consideration (Pending / Proposed)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: '#f3f4f6' }} />
                No AV Policy
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold">Legend:</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#659637' }} />
                Enacted / Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#F4AB00' }} />
                Pending / Proposed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#004F98' }} />
                Other
              </span>
            </>
          )}
        </div>
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
