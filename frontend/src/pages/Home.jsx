import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale,
  Truck,
  DollarSign,
  AlertTriangle,
  BookOpen,
  Newspaper,
  ArrowRight,
  ExternalLink,
  Map,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchDashboard, fetchPolicyMapStates, fetchDeploymentMapLocations, fetchSafetyMapLocations } from '../api';
import StatusBadge from '../components/StatusBadge';

const STAT_CARDS = [
  {
    key: 'total_policies',
    label: 'Policies & Legislation',
    icon: Scale,
    color: 'blue',
    link: '/policies',
  },
  {
    key: 'total_deployments',
    label: 'AV Deployments',
    icon: Truck,
    color: 'green',
    link: '/deployments',
  },
  {
    key: 'total_funding_programs',
    label: 'Funding Programs',
    icon: DollarSign,
    color: 'indigo',
    link: '/funding',
    renderValue: (value, dashboard) => {
      const amount = dashboard?.total_funding_amount;
      if (amount && typeof amount === 'number') {
        const billions = (amount / 1e9).toFixed(1);
        return (
          <div>
            <span>{value}</span>
            <span className="text-sm font-normal text-gray-500 ml-2">(${billions}B)</span>
          </div>
        );
      }
      return value;
    },
  },
  {
    key: 'total_safety_incidents',
    label: 'Safety Incidents',
    icon: AlertTriangle,
    color: 'red',
    link: '/safety',
  },
  {
    key: 'total_resources',
    label: 'Resources',
    icon: BookOpen,
    color: 'purple',
    link: '/resources',
  },
  {
    key: 'total_news_articles',
    label: 'News Articles',
    icon: Newspaper,
    color: 'amber',
    link: '/news',
  },
];

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-200' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', ring: 'ring-green-200' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', ring: 'ring-indigo-200' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-200' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'ring-purple-200' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-200' },
};

// Map layer config
const MAP_LAYERS = [
  { key: 'policies', label: 'Policies' },
  { key: 'deployments', label: 'Deployments' },
  { key: 'incidents', label: 'Incidents' },
];

const POLICY_STATUS_COLORS = {
  enacted: '#C1DEA6',
  active: '#C1DEA6',
  pending: '#FFDF95',
  proposed: '#FFDF95',
  none: '#f3f4f6',
};

const INCIDENT_TYPE_COLORS = {
  'Property Damage': '#F4AB00',
  'property_damage': '#F4AB00',
  'Injury': '#F6571D',
  'injury': '#F6571D',
  'Fatality': '#DD2323',
  'fatality': '#DD2323',
  'Fatal': '#DD2323',
  'fatal': '#DD2323',
};

const DEPLOYMENT_STATUS_COLORS = {
  Active: '#659637',
  Testing: '#004F98',
  Paused: '#DD2323',
  Completed: '#6b7280',
};

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
};

function DashboardMap({ policyStates, deploymentLocations, incidentLocations }) {
  const [activeLayer, setActiveLayer] = useState('policies');

  const policyMap = useMemo(() => {
    const map = {};
    if (policyStates) {
      policyStates.forEach((s) => { map[s.state_code] = s; });
    }
    return map;
  }, [policyStates]);

  return (
    <div>
      {/* Layer toggle buttons */}
      <div className="flex items-center gap-2 mb-4">
        <Map size={18} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-600">Map Layer:</span>
        {MAP_LAYERS.map((layer) => (
          <button
            key={layer.key}
            onClick={() => setActiveLayer(layer.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeLayer === layer.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {layer.label}
          </button>
        ))}
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

        {/* Policies Layer - choropleth style */}
        {activeLayer === 'policies' && Object.entries(stateCenters).map(([code, coords]) => {
          const data = policyMap[code];
          const count = data?.count || data?.policy_count || 0;
          const status = data?.status || null;
          let fillColor = POLICY_STATUS_COLORS.none;
          if (count > 0 && status) {
            fillColor = POLICY_STATUS_COLORS[status.toLowerCase()] || POLICY_STATUS_COLORS.none;
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
                  <div>{count} {count === 1 ? 'policy' : 'policies'}</div>
                  {status && <div className="text-gray-600 capitalize">{status}</div>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Deployments Layer - colored dots by operator status */}
        {activeLayer === 'deployments' && deploymentLocations.map((loc, i) => (
          loc.latitude && loc.longitude ? (
            <CircleMarker
              key={`dep-${i}`}
              center={[loc.latitude, loc.longitude]}
              radius={8}
              fillColor={DEPLOYMENT_STATUS_COLORS[loc.status] || '#004F98'}
              color="#fff"
              weight={2}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{loc.operator || loc.name}</strong>
                  {loc.city && loc.state && <div>{loc.city}, {loc.state}</div>}
                  {loc.status && <div className="capitalize mt-1">{loc.status}</div>}
                </div>
              </Popup>
            </CircleMarker>
          ) : null
        ))}

        {/* Incidents Layer - colored dots by type */}
        {activeLayer === 'incidents' && incidentLocations.map((loc, i) => (
          loc.latitude && loc.longitude ? (
            <CircleMarker
              key={`inc-${i}`}
              center={[loc.latitude, loc.longitude]}
              radius={7}
              fillColor={INCIDENT_TYPE_COLORS[loc.incident_type] || INCIDENT_TYPE_COLORS[loc.severity] || '#F4AB00'}
              color="#fff"
              weight={2}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{loc.manufacturer || loc.operator}</strong>
                  {loc.city && loc.state && <div>{loc.city}, {loc.state}</div>}
                  {loc.incident_type && <div className="mt-1">{loc.incident_type}</div>}
                  {loc.severity && <div className="text-gray-600">{loc.severity}</div>}
                  {loc.date && <div className="text-gray-500">{new Date(loc.date).toLocaleDateString()}</div>}
                </div>
              </Popup>
            </CircleMarker>
          ) : null
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
        {activeLayer === 'policies' && (
          <>
            <span className="font-semibold">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: '#C1DEA6' }} />
              Enacted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: '#FFDF95' }} />
              Pending / Proposed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: '#f3f4f6' }} />
              No Policy
            </span>
          </>
        )}
        {activeLayer === 'deployments' && (
          <>
            <span className="font-semibold">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#659637' }} />
              Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#004F98' }} />
              Testing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#DD2323' }} />
              Paused
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#6b7280' }} />
              Completed
            </span>
          </>
        )}
        {activeLayer === 'incidents' && (
          <>
            <span className="font-semibold">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#F4AB00' }} />
              Property Damage
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#F6571D' }} />
              Injury
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '#DD2323' }} />
              Fatality
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map data
  const [policyStates, setPolicyStates] = useState([]);
  const [deploymentLocations, setDeploymentLocations] = useState([]);
  const [incidentLocations, setIncidentLocations] = useState([]);

  useEffect(() => {
    fetchDashboard()
      .then(setDashboard)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Load map data
    fetchPolicyMapStates()
      .then((data) => setPolicyStates(Array.isArray(data) ? data : data.data || []))
      .catch(() => {});
    fetchDeploymentMapLocations()
      .then((data) => setDeploymentLocations(Array.isArray(data) ? data : data.data || []))
      .catch(() => {});
    fetchSafetyMapLocations()
      .then((data) => setIncidentLocations(Array.isArray(data) ? data : data.data || []))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50 text-red-700 text-sm">
        Failed to load dashboard: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="rounded-lg p-8 text-white" style={{ background: 'linear-gradient(to right, #004F98, #002e5a)' }}>
        <h1 className="text-3xl font-bold mb-2">AV Hub</h1>
        <p className="text-white/80 text-lg max-w-2xl">
          Tracking autonomous vehicle policy, deployments, funding, and safety data across the United States
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STAT_CARDS.map((card) => {
          const colors = COLOR_MAP[card.color];
          const Icon = card.icon;
          const value = dashboard?.[card.key] ?? 0;

          return (
            <Link
              key={card.key}
              to={card.link}
              className="card hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${colors.bg}`}>
                    <Icon className={`h-6 w-6 ${colors.icon}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {card.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {card.renderValue ? card.renderValue(value, dashboard) : value}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-700 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Interactive Dashboard Map */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">National Overview</h2>
        <DashboardMap
          policyStates={policyStates}
          deploymentLocations={deploymentLocations}
          incidentLocations={incidentLocations}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent News */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent News
            </h2>
            <Link
              to="/news"
              className="text-sm hover:underline font-medium"
              style={{ color: '#004F98' }}
            >
              View all
            </Link>
          </div>
          {dashboard?.recent_news?.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {dashboard.recent_news.slice(0, 6).map((article, idx) => (
                <li key={article.id || idx} className="py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {article.url || article.link ? (
                        <a
                          href={article.url || article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-700 hover:underline"
                        >
                          {article.headline || article.title}
                        </a>
                      ) : (
                        article.headline || article.title
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {article.source_org && (
                        <span className="text-xs text-gray-500">{article.source_org}</span>
                      )}
                      {article.date || article.publication_date ? (
                        <span className="text-xs text-gray-400">
                          {new Date(article.date || article.publication_date).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    {(article.url || article.link) && (
                      <a
                        href={article.url || article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-xs mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Link
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No recent news.</p>
          )}
        </div>

        {/* Recent Policies and Legislation */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Policies and Legislation
            </h2>
            <Link
              to="/policies"
              className="text-sm hover:underline font-medium"
              style={{ color: '#004F98' }}
            >
              View all
            </Link>
          </div>
          {dashboard?.recent_policies?.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {dashboard.recent_policies.map((policy) => (
                <li key={policy.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {policy.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {policy.jurisdiction}
                        {policy.date_enacted &&
                          ` \u2022 ${new Date(policy.date_enacted).toLocaleDateString()}`}
                      </p>
                    </div>
                    <StatusBadge status={policy.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No recent policies.</p>
          )}
        </div>
      </div>
    </div>
  );
}
