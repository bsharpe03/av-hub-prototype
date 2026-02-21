import React, { useState, useEffect, useMemo } from "react";
import { Truck, MapPin, Activity } from "lucide-react";
import { fetchDeployments, fetchDeploymentMapLocations } from "../api";
import { PointMap } from "../components/MapView";
import DataTable from "../components/DataTable";
import ExportButton from "../components/ExportButton";
import LastUpdated from "../components/LastUpdated";
import StatusBadge from "../components/StatusBadge";

const STATUS_OPTIONS = ["All", "Active", "Testing", "Paused", "Completed"];
const VEHICLE_TYPE_OPTIONS = ["All", "Passenger", "Freight", "Shuttle", "Delivery"];
const OPERATIONAL_DOMAIN_OPTIONS = ["All", "Urban", "Suburban", "Highway", "Mixed"];

const STATUS_COLORS = {
  Active: "#659637",   // Atlas green
  Testing: "#004F98",  // Atlas blue
  Paused: "#DD2323",   // Atlas red
  Completed: "#6b7280",
};

const columns = [
  { key: "operator", header: "Operator" },
  { key: "program_name", header: "Program Name" },
  { key: "city", header: "City" },
  { key: "state", header: "State" },
  { key: "vehicle_type", header: "Vehicle Type" },
  { key: "operational_domain", header: "Operational Domain" },
  {
    key: "status",
    header: "Status",
    render: (value) => <StatusBadge status={value} />,
  },
  { key: "start_date", header: "Start Date" },
];

export default function DeploymentDashboard() {
  const [deployments, setDeployments] = useState([]);
  const [mapLocations, setMapLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("All");
  const [operationalDomainFilter, setOperationalDomainFilter] = useState("All");

  // Build query params from current filter state
  const filterParams = useMemo(() => {
    const params = {};
    if (search.trim()) {
      params.search = search.trim();
    }
    if (statusFilter !== "All") {
      params.status = statusFilter;
    }
    if (vehicleTypeFilter !== "All") {
      params.vehicle_type = vehicleTypeFilter;
    }
    if (operationalDomainFilter !== "All") {
      params.operational_domain = operationalDomainFilter;
    }
    return params;
  }, [search, statusFilter, vehicleTypeFilter, operationalDomainFilter]);

  // Fetch deployments whenever filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchDeployments(filterParams)
      .then((data) => {
        if (!cancelled) {
          setDeployments(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to fetch deployments:", err);
          setDeployments([]);
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

  // Fetch map locations once on mount
  useEffect(() => {
    setMapLoading(true);

    fetchDeploymentMapLocations()
      .then((data) => {
        setMapLocations(data);
      })
      .catch((err) => {
        console.error("Failed to fetch map locations:", err);
        setMapLocations([]);
      })
      .finally(() => {
        setMapLoading(false);
      });
  }, []);

  // Compute summary stats from the current deployments data
  const summaryStats = useMemo(() => {
    const total = deployments.length;
    const activeCount = deployments.filter(
      (d) => d.status === "Active"
    ).length;
    const uniqueStates = new Set(deployments.map((d) => d.state)).size;
    const uniqueOperators = new Set(deployments.map((d) => d.operator)).size;

    return { total, activeCount, uniqueStates, uniqueOperators };
  }, [deployments]);

  // Build map markers with colors based on status
  const mapMarkers = useMemo(() => {
    return mapLocations.map((loc) => ({
      ...loc,
      color: STATUS_COLORS[loc.status] || "#6b7280",
    }));
  }, [mapLocations]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="page-header">AV Deployment Dashboard</h1>
        <p className="page-subtitle">
          Commercial AV operations and testing programs across the United States
        </p>
      </div>

      {/* Map View */}
      <div className="card">
        {mapLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Loading map data...
          </div>
        ) : (
          <PointMap locations={mapMarkers} />
        )}
      </div>

      {/* Filter Bar */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Search
            </label>
            <input
              id="search"
              type="text"
              className="input-field"
              placeholder="Search deployments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="status-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Status
            </label>
            <select
              id="status-filter"
              className="select-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="vehicle-type-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Vehicle Type
            </label>
            <select
              id="vehicle-type-filter"
              className="select-field"
              value={vehicleTypeFilter}
              onChange={(e) => setVehicleTypeFilter(e.target.value)}
            >
              {VEHICLE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="domain-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Operational Domain
            </label>
            <select
              id="domain-filter"
              className="select-field"
              value={operationalDomainFilter}
              onChange={(e) => setOperationalDomainFilter(e.target.value)}
            >
              {OPERATIONAL_DOMAIN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center space-x-3 p-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Deployments</p>
            <p className="text-2xl font-semibold text-gray-900">
              {summaryStats.total}
            </p>
          </div>
        </div>

        <div className="card flex items-center space-x-3 p-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Activity className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-semibold text-gray-900">
              {summaryStats.activeCount}
            </p>
          </div>
        </div>

        <div className="card flex items-center space-x-3 p-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <MapPin className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">States Covered</p>
            <p className="text-2xl font-semibold text-gray-900">
              {summaryStats.uniqueStates}
            </p>
          </div>
        </div>

        <div className="card flex items-center space-x-3 p-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Truck className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Operators</p>
            <p className="text-2xl font-semibold text-gray-900">
              {summaryStats.uniqueOperators}
            </p>
          </div>
        </div>
      </div>

      {/* Export and Last Updated Row */}
      <div className="flex items-center justify-between">
        <LastUpdated />
        <ExportButton resource="deployments" />
      </div>

      {/* Data Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Loading deployments...
          </div>
        ) : (
          <DataTable columns={columns} data={deployments} />
        )}
      </div>
    </div>
  );
}
