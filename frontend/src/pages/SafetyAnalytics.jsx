import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, BarChart3, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  fetchSafety,
  fetchSafetyStatsByManufacturer,
  fetchSafetyStatsByType,
  fetchSafetyStatsByYear,
  fetchSafetyStatsBySeverity,
} from '../api';
import DataTable from '../components/DataTable';
import ExportButton from '../components/ExportButton';
import LastUpdated from '../components/LastUpdated';
import StatusBadge from '../components/StatusBadge';

// Atlas Public Policy palette (max 5 for pie/donut charts)
const PIE_COLORS = ['#004F98', '#659637', '#F4AB00', '#DD2323', '#F6571D'];
// Single color for all single-series bar charts
const BAR_COLOR = '#004F98';

const INCIDENT_TYPE_OPTIONS = ['All', 'Crash', 'Near Miss', 'Disengagement', 'Other'];
const SEVERITY_OPTIONS = ['All', 'Fatal', 'Injury', 'Property Damage', 'No Injury'];

const columns = [
  { key: 'report_id', label: 'Report ID' },
  { key: 'date', label: 'Date' },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'vehicle_model', label: 'Vehicle Model' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'incident_type', label: 'Incident Type' },
  {
    key: 'severity',
    label: 'Severity',
    render: (value) => <StatusBadge status={value} />,
  },
  {
    key: 'ads_engaged',
    label: 'ADS Engaged',
    render: (value) => (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </span>
    ),
  },
];

export default function SafetyAnalytics() {
  // Table data state
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stats data state
  const [statsByManufacturer, setStatsByManufacturer] = useState([]);
  const [statsByType, setStatsByType] = useState([]);
  const [statsByYear, setStatsByYear] = useState([]);
  const [statsBySeverity, setStatsBySeverity] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('All');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');

  // Derive manufacturer options from stats data
  const manufacturerOptions = useMemo(() => {
    const names = statsByManufacturer.map((s) => s.manufacturer).filter(Boolean).sort();
    return ['All', ...names];
  }, [statsByManufacturer]);

  // Build query params from filter state
  const filterParams = useMemo(() => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (manufacturerFilter !== 'All') params.manufacturer = manufacturerFilter;
    if (incidentTypeFilter !== 'All') params.incident_type = incidentTypeFilter;
    if (severityFilter !== 'All') params.severity = severityFilter;
    return params;
  }, [search, manufacturerFilter, incidentTypeFilter, severityFilter]);

  // Fetch chart stats once on mount
  useEffect(() => {
    setStatsLoading(true);

    Promise.all([
      fetchSafetyStatsByManufacturer(),
      fetchSafetyStatsByType(),
      fetchSafetyStatsByYear(),
      fetchSafetyStatsBySeverity(),
    ])
      .then(([byManufacturer, byType, byYear, bySeverity]) => {
        setStatsByManufacturer(Array.isArray(byManufacturer) ? byManufacturer : []);
        setStatsByType(Array.isArray(byType) ? byType : []);
        setStatsByYear(Array.isArray(byYear) ? byYear : []);
        setStatsBySeverity(Array.isArray(bySeverity) ? bySeverity : []);
      })
      .catch((err) => {
        console.error('Failed to fetch safety stats:', err);
      })
      .finally(() => {
        setStatsLoading(false);
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
    const crashes = incidents.filter((i) => i.incident_type === 'Crash').length;
    const fatalCount = incidents.filter((i) => i.severity === 'Fatal').length;
    const adsEngagedCount = incidents.filter((i) => i.ads_engaged).length;
    return { total, crashes, fatalCount, adsEngagedCount };
  }, [incidents]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="page-header">Safety & Performance Analytics</h1>
        <p className="page-subtitle">
          Aggregated NHTSA SGO and AV incident report data with summary visualizations
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
          <div className="flex-shrink-0 rounded-lg bg-red-50 p-3">
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Crashes</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.crashes}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-orange-50 p-3">
            <BarChart3 className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Fatal Incidents</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.fatalCount}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-green-50 p-3">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">ADS Engaged</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.adsEngagedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section - 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents by Manufacturer - Bar Chart */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" />
            Incidents by Manufacturer
          </h2>
          {statsLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Loading chart data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statsByManufacturer}>
                <XAxis
                  dataKey="manufacturer"
                  tick={{ fontSize: 12 }}
                  angle={-35}
                  textAnchor="end"
                  height={80}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Incidents" fill={BAR_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Incidents by Type - Pie Chart */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShieldAlert size={20} className="text-orange-600" />
            Incidents by Type
          </h2>
          {statsLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Loading chart data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statsByType}
                  dataKey="count"
                  nameKey="incident_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ incident_type, percent }) =>
                    `${incident_type} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {statsByType.map((_, index) => (
                    <Cell
                      key={`type-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Incidents by Year - Line Chart */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-600" />
            Incidents by Year
          </h2>
          {statsLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Loading chart data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={statsByYear}>
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Incidents"
                  stroke="#004F98"
                  strokeWidth={2}
                  dot={{ fill: '#004F98', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Incidents by Severity - Bar Chart */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-red-600" />
            Incidents by Severity
          </h2>
          {statsLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Loading chart data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statsBySeverity}>
                <XAxis dataKey="severity" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Incidents" fill={BAR_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              htmlFor="safety-manufacturer"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Manufacturer
            </label>
            <select
              id="safety-manufacturer"
              className="select-field"
              value={manufacturerFilter}
              onChange={(e) => setManufacturerFilter(e.target.value)}
            >
              {manufacturerOptions.map((option) => (
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
              {INCIDENT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="safety-severity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Severity
            </label>
            <select
              id="safety-severity"
              className="select-field"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
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
