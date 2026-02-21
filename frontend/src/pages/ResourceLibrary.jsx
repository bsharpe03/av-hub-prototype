import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, ExternalLink, Tag, Calendar } from 'lucide-react';
import { fetchResources } from '../api';
import DataTable from '../components/DataTable';
import ExportButton from '../components/ExportButton';
import LastUpdated from '../components/LastUpdated';
import StatusBadge from '../components/StatusBadge';

const RESOURCE_TYPES = ['All', 'Report', 'White Paper', 'Policy Analysis', 'Guidance', 'Toolkit'];
const TOPIC_AREAS = ['All', 'Policy', 'Safety', 'Technology', 'Equity', 'Infrastructure'];

export default function ResourceLibrary() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [search, setSearch] = useState('');
  const [resourceType, setResourceType] = useState('All');
  const [topicArea, setTopicArea] = useState('All');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = {};
    if (resourceType !== 'All') params.resource_type = resourceType;
    if (topicArea !== 'All') params.category = topicArea;
    if (search.trim()) params.search = search.trim();

    fetchResources(params)
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
  }, [resourceType, topicArea, search]);

  const summaryStats = useMemo(() => {
    const total = data.length;
    const types = new Set(data.map((r) => r.resource_type)).size;
    const orgs = new Set(data.map((r) => r.author_org)).size;
    return { total, types, orgs };
  }, [data]);

  const columns = [
    { key: 'title', header: 'Title', sortable: true },
    { key: 'author_org', header: 'Organization', sortable: true },
    {
      key: 'resource_type',
      header: 'Type',
      sortable: true,
      render: (value) => value ? <StatusBadge status={value} /> : <span className="text-gray-400">--</span>,
    },
    { key: 'topic_area', header: 'Topic Area', sortable: true },
    {
      key: 'publication_date',
      header: 'Published',
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
      key: 'url',
      header: 'Link',
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
            View
          </a>
        ) : (
          <span className="text-gray-400">--</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="page-header">Resource Library</h1>
        <p className="page-subtitle">
          Reports, white papers, and educational materials on autonomous vehicles
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-purple-50 p-3">
            <BookOpen className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Resources</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.total}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-blue-50 p-3">
            <Tag className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Resource Types</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.types}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="flex-shrink-0 rounded-lg bg-green-50 p-3">
            <BookOpen className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Organizations</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? '--' : summaryStats.orgs}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="lg:col-span-2">
            <label htmlFor="resource-search" className="label-field">
              Search
            </label>
            <input
              id="resource-search"
              type="text"
              className="input-field"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="resource-type" className="label-field">
              Resource Type
            </label>
            <select
              id="resource-type"
              className="select-field"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="topic-area" className="label-field">
              Topic Area
            </label>
            <select
              id="topic-area"
              className="select-field"
              value={topicArea}
              onChange={(e) => setTopicArea(e.target.value)}
            >
              {TOPIC_AREAS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <LastUpdated />
        <ExportButton resource="resources" />
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
          emptyMessage="No resources match your current filters."
        />
      </div>

      {/* Detail Panel */}
      {selectedRow && (
        <div className="card p-6 space-y-4 border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedRow.title}
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
                  Summary
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedRow.summary || 'No summary available.'}
                </p>
              </div>
              {selectedRow.tags && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRow.tags.split(',').map((tag) => (
                      <span
                        key={tag.trim()}
                        className="badge bg-gray-100 text-gray-700"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Organization
                </h3>
                <p className="text-sm text-gray-700">
                  {selectedRow.author_org}
                </p>
              </div>
              {selectedRow.url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Source
                  </h3>
                  <a
                    href={selectedRow.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Original Resource
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
