import { MapContainer, TileLayer, Marker, Popup, GeoJSON, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Atlas Public Policy map marker colors
const STATUS_COLORS = {
  active: '#659637',    // Atlas green
  testing: '#004F98',   // Atlas blue
  paused: '#DD2323',    // Atlas red
  completed: '#6b7280',
  pilot: '#F4AB00',     // Atlas gold
  default: '#004F98',   // Atlas blue
}

export function PointMap({ locations, height = '400px', zoom = 4, center = [39.8, -98.5] }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%' }}
      className="rounded-lg border border-gray-200"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((loc, i) => (
        loc.latitude && loc.longitude ? (
          <CircleMarker
            key={i}
            center={[loc.latitude, loc.longitude]}
            radius={8}
            fillColor={STATUS_COLORS[loc.status] || STATUS_COLORS.default}
            color="#fff"
            weight={2}
            opacity={1}
            fillOpacity={0.8}
          >
            <Popup>
              <div className="text-sm">
                <strong>{loc.name || loc.operator || loc.city}</strong>
                {loc.city && loc.state && <div>{loc.city}, {loc.state}</div>}
                {loc.status && <div className="capitalize mt-1">{loc.status}</div>}
                {loc.description && <div className="mt-1 text-gray-600">{loc.description}</div>}
              </div>
            </Popup>
          </CircleMarker>
        ) : null
      ))}
    </MapContainer>
  )
}

// Policy status colors for choropleth-style display
const POLICY_STATUS_COLORS = {
  enacted: '#C1DEA6',    // Light green - active regulations
  active: '#C1DEA6',
  pending: '#FFDF95',    // Light yellow - under consideration
  proposed: '#FFDF95',
  none: '#f3f4f6',       // Light gray - no policy
}

function getPolicyStatusColor(status) {
  if (!status) return POLICY_STATUS_COLORS.none
  const lower = status.toLowerCase()
  return POLICY_STATUS_COLORS[lower] || POLICY_STATUS_COLORS.none
}

export function StateMap({ stateData, height = '400px' }) {
  // Simple state center coordinates for markers (not full GeoJSON)
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

  const stateMap = {}
  if (stateData) {
    stateData.forEach((s) => { stateMap[s.state_code] = s })
  }

  return (
    <MapContainer
      center={[39.8, -98.5]}
      zoom={4}
      style={{ height, width: '100%' }}
      className="rounded-lg border border-gray-200"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {Object.entries(stateCenters).map(([code, coords]) => {
        const data = stateMap[code]
        const count = data?.count || data?.policy_count || 0
        const status = data?.status || null
        const fillColor = count > 0 ? getPolicyStatusColor(status) : POLICY_STATUS_COLORS.none
        const borderColor = count > 0 ? '#888' : '#d1d5db'
        return (
          <CircleMarker
            key={code}
            center={coords}
            radius={13}
            fillColor={fillColor}
            color={borderColor}
            weight={1.5}
            opacity={1}
            fillOpacity={0.85}
          >
            <Popup>
              <div className="text-sm">
                <strong>{code}</strong>
                <div>{count} {count === 1 ? 'policy' : 'policies'}</div>
                {status && <div className="text-gray-600 capitalize">{status}</div>}
                {data?.statuses && <div className="text-gray-600">{data.statuses}</div>}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
