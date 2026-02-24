import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, ExternalLink } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchSafety,
  fetchSafetyStatsByManufacturer,
  fetchSafetyMapLocations,
} from '../api';
import DataTable from '../components/DataTable';
import ExportButton from '../components/ExportButton';
import LastUpdated from '../components/LastUpdated';
import StatusBadge from '../components/StatusBadge';

const INCIDENT_TYPE_COLORS = {
  'Property Damage': '#F4AB00',
  'property_damage': '#F4AB00',
  'property damage': '#F4AB00',
  'Injury': '#F6571D',
  'injury': '#F6571D',
  'Fatality': '#DD2323',
  'fatality': '#DD2323',
  'Fatal': '#DD2323',
  'fatal': '#DD2323',
};

const INCIDENT_TYPES = ['Property Damage', 'Injury', 'Fatality'];

function normalizeIncidentType(row) {
  const severity = (row.severity || '').toLowerCase();
  const type = (row.incident_type || '').toLowerCase();

  if (severity === 'fatal' || severity === 'fatality' || type === 'fatality' || type === 'fatal') {
    return 'Fatality';
  }
  if (severity === 'injury' || type === 'injury') {
    return 'Injury';
  }
  return 'Property Damage';
}

function getIncidentColor(type) {
  return INCIDENT_TYPE_COLORS[type] || INCIDENT_TYPE_COLORS['Property Damage'];
}

const columns = [
  { key: 'report_id', label: 'Report ID' },
  { key: 'date', label: 'Date' },
  { key: 'manufacturer', label: 'Operator' },
  { key: 'vehicle_model', label: 'Vehicle Model' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  {
    key: 'incident_type',
    label: 'Incident Type',
    render: (value, row) => {
      const normalized = normalizeIncidentType(row);
      return <StatusBadge status={normalized} />;
    },
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
];

export default function SafetyAnalytics() {
  // Table data state
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map data state
  const [mapLocations, setMapLocations] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);

  // Stats for operator options
  const [statsByManufacturer, setStatsByManufacturer] = useState([]);

  // Filter state
  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('All');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('All');

  // Map incident type checkboxes
  const [visibleTypes, setVisibleTypes] = useState({
    'Property Damage': true,
    'Injury': true,
    'Fatality': true,
  });

  // Derive operator options from stats data
  const operatorOptions = useMemo(() => {
    const names = statsByManufacturer.map((s) => s.manufacturer).filter(Boolean).sort();
    return ['All', ...names];
  }, [statsByManufacturer]);

  // Build query params from filter state
  const filterParams = useMemo(() => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (operatorFilter !== 'All') params.manufacturer = operatorFilter;
    if (incidentTypeFilter !== 'All') params.incident_type = incidentTypeFilter;
    return params;
  }, [search, operatorFilter, incidentTypeFilter]);

  // Fetch operator stats once on mount
  useEffect(() => {
    fetchSafetyStatsByManufacturer()
      .then((data) => {
        setStatsByManufacturer(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  // Fetch map locations once on mount
  useEffect(() => {
    setMapLoading(true);
    fetchSafetyMapLocations()
      .then((data) => {
        setMapLocations(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => {
        setMapLocations([]);
      })
      .finally(() => {
        setMapLoading(false);
      });
  }, []);

  // Fetch table data when filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSafety(filterParams)
      .then((data) => {
        if (!cancelled) {
          setIncidents(Array.isArray(data) ? data : data.data || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to fetch safety incidents:', err);
          setError(err.message || 'Failed to load safety data.');
          setIncidents([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filterParams]);

  // Summary stats derived from table data
  const summaryStats = useMemo(() => {
    const total = incidents.length;
    const fatalCount = incidents.filter((i) => normalizeIncidentType(i) === 'Fatality').length;
    const injuryCount = incidents.filter((i) => normalizeIncidentType(i) === 'Injury').length;
    const propDmgCount = incidents.filter((i) => normalizeIncidentType(i) === 'Property Damage').length;
    return { total, fatalCount, injuryCount, propDmgCount };
  }, [incidents]);

  // Filtered map locations based on checkbox selection
  const filteredMapLocations = useMemo(() => {
    return mapLocations.filter((loc) => {
      const type = normalizeIncidentType(loc);
      return visibleTypes[type];
    });
  }, [mapLocations, visibleTypes]);

  function toggleType(type) {
    setVisibleTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="page-header">Safety & Performance Analytics</h1>
        <p className="page-subtitle">
          Aggregated NHTSA incident report data
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-blue-50 p-3">
            <ShieldAlert className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Incidents</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.total}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg p-3" style={{ backgroundColor: '#FEF3C7' }}>
            <ShieldAlert className="h-6 w-6" style={{ color: '#F4AB00' }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Property Damage</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.propDmgCount}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-orange-50 p-3">
            <ShieldAlert className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Injury</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.injuryCount}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-red-50 p-3">
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Fatality</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.fatalCount}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ShieldAlert size={20} className="text-blue-600" />
          Incident Map
        </h2>

        {/* Incident type checkboxes */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="text-sm font-medium text-gray-600">Show:</span>
          {INCIDENT_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={visibleTypes[type]}
                onChange={() => toggleType(type)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: getIncidentColor(type) }}
              />
              {type}
            </label>
          ))}
        </div>

        {mapLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Loading map data...
          </div>
        ) : (
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
            {filteredMapLocations.map((loc, i) => {
              if (!loc.latitude || !loc.longitude) return null;
              const type = normalizeIncidentType(loc);
              return (
                <CircleMarker
                  key={`inc-${i}`}
                  center={[loc.latitude, loc.longitude]}
                  radius={7}
                  fillColor={getIncidentColor(type)}
                  color="#fff"
                  weight={2}
                  opacity={1}
                  fillOpacity={0.8}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{loc.manufacturer || loc.operator}</strong>
                      {loc.city && loc.state && <div>{loc.city}, {loc.state}</div>}
                      <div className="mt-1">{type}</div>
                      {loc.date && (
                        <div className="text-gray-500">
                          {new Date(loc.date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
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
        </div>
      </div>

      {/* Incidents by Operator */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ShieldAlert size={20} className="text-blue-600" />
          Incidents by Operator
        </h2>
        {statsByManufacturer.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {statsByManufacturer.map((item) => (
              <div key={item.manufacturer} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-gray-700">{item.manufacturer}</p>
                <p className="text-xl font-bold text-gray-900">{item.count}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No operator data available.</p>
        )}
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="safety-search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Search
            </label>
            <input
              id="safety-search"
              type="text"
              className="input-field"
              placeholder="Search incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="safety-operator"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Operator
            </label>
            <select
              id="safety-operator"
              className="select-field"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
            >
              {operatorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="safety-incident-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Incident Type
            </label>
            <select
              id="safety-incident-type"
              className="select-field"
              value={incidentTypeFilter}
              onChange={(e) => setIncidentTypeFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Property Damage">Property Damage</option>
              <option value="Injury">Injury</option>
              <option value="Fatality">Fatality</option>
            </select>
          </div>
        </div>
      </div>

      {/* Toolbar: Export + Last Updated */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <LastUpdated data={incidents} />
        <ExportButton resource="safety" />
      </div>

      {/* Error State */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
              <p>Loading safety incidents...</p>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={incidents} />
        )}
      </div>
    </div>
  );
}
