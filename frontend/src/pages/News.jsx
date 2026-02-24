import React, { useState, useEffect, useMemo } from 'react';
import { Newspaper, Search, Calendar, ExternalLink } from 'lucide-react';
import { fetchNews, fetchPolicies } from '../api';
import StatusBadge from '../components/StatusBadge';

const PAGE_SIZE = 10;

export default function News() {
  // News state
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(null);

  // Policies state
  const [policies, setPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(0);

  // Build query params
  const queryParams = useMemo(() => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (dateFilter) params.date = dateFilter;
    return params;
  }, [search, dateFilter]);

  // Fetch news when filters change
  useEffect(() => {
    let cancelled = false;
    setNewsLoading(true);
    setNewsError(null);
    setPage(0);

    fetchNews(queryParams)
      .then((data) => {
        if (!cancelled) {
          const items = Array.isArray(data) ? data : data.data || [];
          // Sort chronologically, newest first
          const sorted = [...items].sort((a, b) => {
            const dateA = a.publication_date || a.date || '';
            const dateB = b.publication_date || b.date || '';
            if (dateA > dateB) return -1;
            if (dateA < dateB) return 1;
            return 0;
          });
          setNews(sorted);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setNewsError(err.message);
          setNews([]);
        }
      })
      .finally(() => {
        if (!cancelled) setNewsLoading(false);
      });

    return () => { cancelled = true; };
  }, [queryParams]);

  // Fetch recent policies on mount
  useEffect(() => {
    setPoliciesLoading(true);
    fetchPolicies({ limit: 20 })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.data || [];
        // Sort newest first
        const sorted = [...items].sort((a, b) => {
          const dateA = a.date_enacted || a.created_at || '';
          const dateB = b.date_enacted || b.created_at || '';
          if (dateA > dateB) return -1;
          if (dateA < dateB) return 1;
          return 0;
        });
        setPolicies(sorted);
      })
      .catch(() => setPolicies([]))
      .finally(() => setPoliciesLoading(false));
  }, []);

  // Pagination
  const totalPages = Math.ceil(news.length / PAGE_SIZE);
  const pagedNews = news.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="page-header flex items-center gap-3">
          <Newspaper className="text-blue-600" size={28} />
          News
        </h1>
      </div>

      {/* Search and Date Filter */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="lg:col-span-2">
            <label htmlFor="news-search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="news-search"
                type="text"
                className="input-field pl-9 w-full"
                placeholder="Search news articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="news-date" className="block text-sm font-medium text-gray-700 mb-1">
              Date Filter
            </label>
            <input
              id="news-date"
              type="date"
              className="input-field w-full"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {newsError && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">
          Failed to load news: {newsError}
        </div>
      )}

      {/* Main Content: News Feed (left) + Policies (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: News Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent News</h2>
            <span className="text-sm text-gray-500">
              {newsLoading ? 'Loading...' : `${news.length} articles`}
            </span>
          </div>

          {newsLoading ? (
            <div className="card text-center py-12 text-gray-500">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
              <p>Loading news...</p>
            </div>
          ) : pagedNews.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">
              No news articles found.
            </div>
          ) : (
            <>
              {pagedNews.map((article, idx) => (
                <div key={article.id || idx} className="card p-5 hover:shadow-md transition-shadow">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {article.headline || article.title}
                  </h3>

                  <div className="flex items-center gap-3 mb-2">
                    {article.source_org && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {article.source_org}
                      </span>
                    )}
                    {(article.publication_date || article.date) && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(article.publication_date || article.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>

                  {article.summary && (
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                      {article.summary}
                    </p>
                  )}

                  {(article.url || article.link) && (
                    <a
                      href={article.url || article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Link
                    </a>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-600">
                    Showing {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, news.length)} of {news.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Recent Policies and Legislation */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Policies and Legislation
          </h2>

          {policiesLoading ? (
            <div className="card text-center py-8 text-gray-500">
              Loading policies...
            </div>
          ) : policies.length === 0 ? (
            <div className="card p-6 text-center text-gray-500">
              No recent policies.
            </div>
          ) : (
            <div className="space-y-3">
              {policies.slice(0, 15).map((policy) => (
                <div key={policy.id} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {policy.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {policy.jurisdiction}
                        {policy.date_enacted &&
                          ` \u2022 ${new Date(policy.date_enacted).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}`}
                      </p>
                    </div>
                    <StatusBadge status={policy.status} />
                  </div>
                  {policy.source_url && (
                    <a
                      href={policy.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-xs mt-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Link
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
