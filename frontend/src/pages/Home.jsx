import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale,
  Truck,
  DollarSign,
  AlertTriangle,
  BookOpen,
  MapPin,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { fetchDashboard } from '../api';
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
    key: 'total_curbside_regulations',
    label: 'Curbside Regulations',
    icon: MapPin,
    color: 'amber',
    link: '/curbside',
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

export default function Home() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard()
      .then(setDashboard)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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
        <h1 className="text-3xl font-bold mb-2">AV Hub Intelligence Platform</h1>
        <p className="text-white/80 text-lg max-w-2xl">
          Track autonomous vehicle policy, deployments, funding, safety data,
          and curbside regulations across the United States.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
          <Activity className="h-4 w-4" />
          <span>
            {dashboard?.states_with_legislation ?? 0} states with AV legislation
          </span>
        </div>
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
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-700 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Policies */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Policies
            </h2>
            <Link
              to="/policies"
              className="text-sm hover:underline font-medium"
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

        {/* Recent Safety Incidents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Safety Incidents
            </h2>
            <Link
              to="/safety"
              className="text-sm hover:underline font-medium"
            >
              View all
            </Link>
          </div>
          {dashboard?.recent_incidents?.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {dashboard.recent_incidents.map((incident) => (
                <li key={incident.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {incident.manufacturer} &ndash; {incident.incident_type}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {incident.city && `${incident.city}, `}
                        {incident.state}
                        {incident.date &&
                          ` \u2022 ${new Date(incident.date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <StatusBadge status={incident.severity} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No recent incidents.</p>
          )}
        </div>
      </div>
    </div>
  );
}
