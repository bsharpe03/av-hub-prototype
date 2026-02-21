import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Calendar, Building2, ExternalLink } from 'lucide-react';
import { fetchFunding } from '../api';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ExportButton from '../components/ExportButton';
import LastUpdated from '../components/LastUpdated';

const AGENCIES = ['All', 'USDOT', 'FTA', 'FHWA', 'NHTSA', 'NSF', 'State Programs'];
const STATUSES = ['All', 'Open', 'Closed', 'Upcoming'];
const FUNDING_TYPES = ['All', 'Grant', 'Loan', 'Tax Credit'];

export default function FundingIntelligence() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [search, setSearch] = useState('');
  const [agency, setAgency] = useState('All');
  const [status, setStatus] = useState('All');
  const [fundingType, setFundingType] = useState('All');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (agency !== 'All') params.agency = agency;
        if (status !== 'All') params.status = status;
        if (fundingType !== 'All') params.funding_type = fundingType;
        if (search.trim()) params.search = search.trim();

        const result = await fetchFunding(params);
        setData(result.data || result);
        if (result.last_updated) {
          setLastUpdated(result.last_updated);
        }
      } catch (err) {
        setError(err.message || 'Failed to load funding data.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [agency, status, fundingType, search]);

  const filteredData = useMemo(() => {
    let rows = Array.isArray(data) ? data : [];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          (row.program_name && row.program_name.toLowerCase().includes(term)) ||
          (row.agency && row.agency.toLowerCase().includes(term)) ||
          (row.description && row.description.toLowerCase().includes(term))
      );
    }

    if (agency !== 'All') {
      rows = rows.filter((row) => row.agency === agency);
    }

    if (status !== 'All') {
      rows = rows.filter((row) => row.status === status);
    }

    if (fundingType !== 'All') {
      rows = rows.filter((row) => row.funding_type === fundingType);
    }

    return rows;
  }, [data, search, agency, status, fundingType]);

  const summaryCards = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];
    const totalPrograms = rows.length;
    const openPrograms = rows.filter((r) => r.status === 'Open').length;
    const federalPrograms = rows.filter(
      (r) =>
        r.agency && r.agency !== 'State Programs' && !r.agency.toLowerCase().startsWith('state')
    ).length;
    const statePrograms = rows.filter(
      (r) =>
        r.agency && (r.agency === 'State Programs' || r.agency.toLowerCase().startsWith('state'))
    ).length;

    return { totalPrograms, openPrograms, federalPrograms, statePrograms };
  }, [data]);

  const columns = [
    {
      key: 'program_name',
      header: 'Program Name',
      sortable: true,
    },
    {
      key: 'agency',
      header: 'Agency',
      sortable: true,
    },
    {
      key: 'funding_type',
      header: 'Funding Type',
      sortable: true,
    },
    {
      key: 'total_funding',
      header: 'Total Funding',
      sortable: true,
      render: (value) =>
        value != null ? (
          <span className="font-medium text-gray-900">
            {typeof value === 'number'
              ? `$${value.toLocaleString()}`
              : value}
          </span>
        ) : (
          <span className="text-gray-400">--</span>
        ),
    },
    {
      key: 'award_range',
      header: 'Award Range',
      sortable: false,
    },
    {
      key: 'application_deadline',
      header: 'Deadline',
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
    {
      key: 'source_url',
      header: 'Source',
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
            <ExternalLink className="h-3.5 w-3.5" />
            Link
          </a>
        ) : (
          <span className="text-gray-400">--</span>
        ),
    },
  ];

  function handleRowClick(row) {
    setSelectedRow((prev) => (prev && prev.program_name === row.program_name ? null : row));
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="page-header">Funding Intelligence</h1>
        <p className="page-subtitle">
          Federal and state grant programs relevant to autonomous vehicle deployment
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-blue-50 p-3">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Programs</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryCards.totalPrograms}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-green-50 p-3">
            <Calendar className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Open Programs</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryCards.openPrograms}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-indigo-50 p-3">
            <Building2 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Federal Programs</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryCards.federalPrograms}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-amber-50 p-3">
            <Building2 className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">State Programs</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryCards.statePrograms}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-2">
            <label htmlFor="funding-search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              id="funding-search"
              type="text"
              className="input-field"
              placeholder="Search programs, agencies, descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="funding-agency" className="block text-sm font-medium text-gray-700 mb-1">
              Agency
            </label>
            <select
              id="funding-agency"
              className="select-field"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
            >
              {AGENCIES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="funding-status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="funding-status"
              className="select-field"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="funding-type" className="block text-sm font-medium text-gray-700 mb-1">
              Funding Type
            </label>
            <select
              id="funding-type"
              className="select-field"
              value={fundingType}
              onChange={(e) => setFundingType(e.target.value)}
            >
              {FUNDING_TYPES.map((ft) => (
                <option key={ft} value={ft}>
                  {ft}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Toolbar: Export + Last Updated */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <LastUpdated timestamp={lastUpdated} />
        <ExportButton resource="funding" />
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
          data={filteredData}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No funding programs match your current filters."
        />
      </div>

      {/* Expandable Row Detail Panel */}
      {selectedRow && (
        <div className="card p-6 space-y-4 border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedRow.program_name}
            </h2>
            <button
              onClick={() => setSelectedRow(null)}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium"
              aria-label="Close detail panel"
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
                  Eligibility
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedRow.eligibility || 'No eligibility information available.'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  AV Relevance
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedRow.av_relevance || 'No AV relevance details available.'}
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
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Original Source
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
