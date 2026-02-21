import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Building2, Calendar, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchCurbside } from '../api';
import { PointMap } from '../components/MapView';
import DataTable from '../components/DataTable';
import ExportButton from '../components/ExportButton';
import LastUpdated from '../components/LastUpdated';
import StatusBadge from '../components/StatusBadge';

const BAR_COLOR = '#004F98';

const STATUSES = ['All', 'Active', 'Proposed', 'Pilot', 'Expired'];
const REGULATION_TYPES = [
  'All',
  'Pickup/Dropoff Zone',
  'Loading Zone',
  'Geofenced Area',
  'Pilot Program',
];

export default function CurbsideManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = {};
    if (statusFilter !== 'All') params.status = statusFilter;
    if (typeFilter !== 'All') params.zone_type = typeFilter;
    if (search.trim()) params.search = search.trim();

    fetchCurbside(params)
      .then((result) => {
        if (!cancelled) setData(Array.isArray(result) ? result : result.data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [statusFilter, typeFilter, search]);

  const summaryStats = useMemo(() => {
    const total = data.length;
    const activeCount = data.filter((r) => r.status === 'Active' || r.status === 'active').length;
    const uniqueCities = new Set(data.map((r) => r.city)).size;
    const uniqueStates = new Set(data.map((r) => r.state)).size;
    return { total, activeCount, uniqueCities, uniqueStates };
  }, [data]);

  // Build map locations from data
  const mapLocations = useMemo(() => {
    return data
      .filter((r) => r.latitude && r.longitude)
      .map((r) => ({
        latitude: r.latitude,
        longitude: r.longitude,
        name: `${r.city}, ${r.state}`,
        city: r.city,
        state: r.state,
        status: r.status?.toLowerCase() || 'active',
        description: r.regulation_type,
      }));
  }, [data]);

  // Build bar chart data - regulations by city
  const cityChartData = useMemo(() => {
    const counts = {};
    data.forEach((r) => {
      counts[r.city] = (counts[r.city] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [data]);

  const columns = [
    { key: 'city', header: 'City', sortable: true },
    { key: 'state', header: 'State', sortable: true },
    { key: 'regulation_type', header: 'Regulation Type', sortable: true },
    { key: 'applies_to', header: 'Applies To', sortable: true },
    {
      key: 'date_adopted',
      header: 'Date Adopted',
      sortable: true,
      render: (value) =>
        value ? (
          <span className="flex items-center gap-1 text-sm">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            {new Date(value).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ) : (
          <span className="text-gray-400">--</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => <StatusBadge status={value} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="page-header">Curbside Management</h1>
        <p className="page-subtitle">
          Pickup/dropoff zones, loading areas, and geofenced regulations for autonomous vehicles
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg p-3" style={{ backgroundColor: '#F4AB0020' }}>
            <MapPin className="h-6 w-6" style={{ color: '#F4AB00' }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Regulations</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.total}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg p-3" style={{ backgroundColor: '#65963720' }}>
            <MapPin className="h-6 w-6" style={{ color: '#659637' }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.activeCount}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg p-3" style={{ backgroundColor: '#004F9820' }}>
            <Building2 className="h-6 w-6" style={{ color: '#004F98' }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Cities</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.uniqueCities}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg p-3" style={{ backgroundColor: '#C1DEE940' }}>
            <MapPin className="h-6 w-6" style={{ color: '#004F98' }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">States</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.uniqueStates}
            </p>
          </div>
        </div>
      </div>

      {/* Map + Bar Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin size={20} style={{ color: '#004F98' }} />
            Cities with AV Curbside Regulations
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Loading map data...
            </div>
          ) : (
            <PointMap locations={mapLocations} height="350px" />
          )}
        </div>

        {/* Bar Chart */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} style={{ color: '#004F98' }} />
            Regulations by City
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Loading chart data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={cityChartData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  dataKey="city"
                  type="category"
                  width={110}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="count" name="Regulations" fill={BAR_COLOR} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="lg:col-span-2">
            <label htmlFor="curbside-search" className="label-field">
              Search
            </label>
            <input
              id="curbside-search"
              type="text"
              className="input-field"
              placeholder="Search by city, state, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="curbside-status" className="label-field">
              Status
            </label>
            <select
              id="curbside-status"
              className="select-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="curbside-type" className="label-field">
              Regulation Type
            </label>
            <select
              id="curbside-type"
              className="select-field"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {REGULATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <LastUpdated />
        <ExportButton resource="curbside" />
      </div>

      {/* Error State */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          onRowClick={(row) =>
            setSelectedRow((prev) => (prev && prev.id === row.id ? null : row))
          }
          emptyMessage="No curbside regulations match your current filters."
        />
      </div>

      {/* Detail Panel */}
      {selectedRow && (
        <div className="card p-6 space-y-4" style={{ borderLeft: '4px solid #F4AB00' }}>
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedRow.city}, {selectedRow.state}
            </h2>
            <button
              onClick={() => setSelectedRow(null)}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Description
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedRow.description || 'No description available.'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Regulation Type
                </h3>
                <p className="text-sm text-gray-700">
                  {selectedRow.regulation_type || '--'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Applies To
                </h3>
                <p className="text-sm text-gray-700">
                  {selectedRow.applies_to || '--'}
                </p>
              </div>
              {selectedRow.source_url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Source
                  </h3>
                  <a
                    href={selectedRow.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm hover:underline"
                    style={{ color: '#004F98' }}
                  >
                    View Source
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
