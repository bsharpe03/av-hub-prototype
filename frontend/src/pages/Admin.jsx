import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Plus, Pencil, Trash2, LogIn, LogOut } from 'lucide-react';
import {
  fetchPolicies, createPolicy, updatePolicy, deletePolicy,
  fetchDeployments, createDeployment, updateDeployment, deleteDeployment,
  fetchFunding, createFunding, updateFunding, deleteFunding,
  fetchSafety, createSafety, updateSafety, deleteSafety,
  fetchResources, createResource, updateResource, deleteResource,
  fetchCurbside, createCurbside, updateCurbside, deleteCurbside,
} from '../api';
import DataTable from '../components/DataTable';

const RESOURCES = [
  {
    key: 'policies',
    label: 'Policies',
    fetch: fetchPolicies,
    create: createPolicy,
    update: updatePolicy,
    remove: deletePolicy,
    fields: [
      { name: 'jurisdiction', label: 'Jurisdiction', required: true },
      { name: 'state_code', label: 'State Code' },
      { name: 'policy_type', label: 'Policy Type', required: true },
      { name: 'title', label: 'Title', required: true },
      { name: 'vehicle_class', label: 'Vehicle Class' },
      { name: 'date_enacted', label: 'Date Enacted', type: 'date' },
      { name: 'status', label: 'Status', required: true },
      { name: 'summary', label: 'Summary', type: 'textarea' },
      { name: 'source_url', label: 'Source URL' },
    ],
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'title', header: 'Title' },
      { key: 'jurisdiction', header: 'Jurisdiction' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    key: 'deployments',
    label: 'Deployments',
    fetch: fetchDeployments,
    create: createDeployment,
    update: updateDeployment,
    remove: deleteDeployment,
    fields: [
      { name: 'operator', label: 'Operator', required: true },
      { name: 'program_name', label: 'Program Name' },
      { name: 'city', label: 'City', required: true },
      { name: 'state', label: 'State', required: true },
      { name: 'state_code', label: 'State Code' },
      { name: 'latitude', label: 'Latitude', type: 'number' },
      { name: 'longitude', label: 'Longitude', type: 'number' },
      { name: 'vehicle_type', label: 'Vehicle Type' },
      { name: 'operational_domain', label: 'Operational Domain' },
      { name: 'status', label: 'Status', required: true },
      { name: 'start_date', label: 'Start Date', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'source_url', label: 'Source URL' },
    ],
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'operator', header: 'Operator' },
      { key: 'city', header: 'City' },
      { key: 'state', header: 'State' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    key: 'funding',
    label: 'Funding Programs',
    fetch: fetchFunding,
    create: createFunding,
    update: updateFunding,
    remove: deleteFunding,
    fields: [
      { name: 'program_name', label: 'Program Name', required: true },
      { name: 'agency', label: 'Agency', required: true },
      { name: 'funding_type', label: 'Funding Type' },
      { name: 'total_funding', label: 'Total Funding' },
      { name: 'award_range', label: 'Award Range' },
      { name: 'application_deadline', label: 'Application Deadline', type: 'date' },
      { name: 'eligibility', label: 'Eligibility', type: 'textarea' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'av_relevance', label: 'AV Relevance', type: 'textarea' },
      { name: 'status', label: 'Status', required: true },
      { name: 'source_url', label: 'Source URL' },
    ],
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'program_name', header: 'Program Name' },
      { key: 'agency', header: 'Agency' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    key: 'safety',
    label: 'Safety Incidents',
    fetch: fetchSafety,
    create: createSafety,
    update: updateSafety,
    remove: deleteSafety,
    fields: [
      { name: 'report_id', label: 'Report ID' },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'manufacturer', label: 'Manufacturer', required: true },
      { name: 'vehicle_model', label: 'Vehicle Model' },
      { name: 'city', label: 'City' },
      { name: 'state', label: 'State' },
      { name: 'state_code', label: 'State Code' },
      { name: 'incident_type', label: 'Incident Type', required: true },
      { name: 'severity', label: 'Severity' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'source', label: 'Source' },
      { name: 'source_url', label: 'Source URL' },
    ],
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'manufacturer', header: 'Manufacturer' },
      { key: 'incident_type', header: 'Type' },
      { key: 'severity', header: 'Severity' },
      { key: 'date', header: 'Date' },
    ],
  },
  {
    key: 'resources',
    label: 'Resources',
    fetch: fetchResources,
    create: createResource,
    update: updateResource,
    remove: deleteResource,
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'author_org', label: 'Organization', required: true },
      { name: 'resource_type', label: 'Resource Type', required: true },
      { name: 'publication_date', label: 'Publication Date', type: 'date' },
      { name: 'tags', label: 'Tags (comma-separated)' },
      { name: 'topic_area', label: 'Topic Area' },
      { name: 'summary', label: 'Summary', type: 'textarea' },
      { name: 'url', label: 'URL' },
    ],
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'title', header: 'Title' },
      { key: 'author_org', header: 'Organization' },
      { key: 'resource_type', header: 'Type' },
    ],
  },
  {
    key: 'curbside',
    label: 'Curbside Regulations',
    fetch: fetchCurbside,
    create: createCurbside,
    update: updateCurbside,
    remove: deleteCurbside,
    fields: [
      { name: 'city', label: 'City', required: true },
      { name: 'state', label: 'State', required: true },
      { name: 'state_code', label: 'State Code' },
      { name: 'latitude', label: 'Latitude', type: 'number' },
      { name: 'longitude', label: 'Longitude', type: 'number' },
      { name: 'regulation_type', label: 'Regulation Type' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'applies_to', label: 'Applies To' },
      { name: 'date_adopted', label: 'Date Adopted', type: 'date' },
      { name: 'status', label: 'Status', required: true },
      { name: 'source_url', label: 'Source URL' },
    ],
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'city', header: 'City' },
      { key: 'state', header: 'State' },
      { key: 'regulation_type', header: 'Type' },
      { key: 'status', header: 'Status' },
    ],
  },
];

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (username && password) {
      onLogin({ u: username, p: password });
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#e6f0fa' }}>
            <Lock className="h-6 w-6" style={{ color: '#004F98' }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Admin Login</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-user" className="label-field">Username</label>
            <input
              id="admin-user"
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="admin-pass" className="label-field">Password</label>
            <input
              id="admin-pass"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
            <LogIn className="h-4 w-4" />
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

function RecordForm({ fields, initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(() => {
    const data = {};
    fields.forEach((f) => {
      data[f.name] = initialData?.[f.name] ?? '';
    });
    return data;
  });

  function handleChange(name, value) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const cleaned = {};
    for (const [key, value] of Object.entries(formData)) {
      if (value === '') {
        cleaned[key] = null;
      } else {
        cleaned[key] = value;
      }
    }
    onSubmit(cleaned);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
            <label htmlFor={`field-${field.name}`} className="label-field">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={`field-${field.name}`}
                className="input-field min-h-[80px]"
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
              />
            ) : (
              <input
                id={`field-${field.name}`}
                type={field.type || 'text'}
                className="input-field"
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
                required={field.required}
                step={field.type === 'number' ? 'any' : undefined}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary">
          {initialData ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Admin() {
  const [auth, setAuth] = useState(null);
  const [activeResource, setActiveResource] = useState(RESOURCES[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await activeResource.fetch();
      setData(Array.isArray(result) ? result : result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeResource]);

  useEffect(() => {
    if (auth) loadData();
  }, [auth, loadData]);

  if (!auth) {
    return <LoginForm onLogin={setAuth} />;
  }

  async function handleCreate(formData) {
    setError(null);
    try {
      await activeResource.create(formData, auth);
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdate(formData) {
    setError(null);
    try {
      await activeResource.update(editingRecord.id, formData, auth);
      setEditingRecord(null);
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(record) {
    if (!window.confirm(`Delete record #${record.id}?`)) return;
    setError(null);
    try {
      await activeResource.remove(record.id, auth);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function openEdit(record) {
    setEditingRecord(record);
    setShowForm(true);
  }

  function openCreate() {
    setEditingRecord(null);
    setShowForm(true);
  }

  const tableColumns = [
    ...activeResource.columns,
    {
      key: '_actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Admin Panel</h1>
          <p className="page-subtitle">Manage all AV Hub data</p>
        </div>
        <button
          onClick={() => setAuth(null)}
          className="btn-secondary flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      {/* Resource Tabs */}
      <div className="flex flex-wrap gap-2">
        {RESOURCES.map((res) => (
          <button
            key={res.key}
            onClick={() => {
              setActiveResource(res);
              setShowForm(false);
              setEditingRecord(null);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeResource.key === res.key
                ? 'text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            style={activeResource.key === res.key ? { backgroundColor: '#004F98' } : undefined}
          >
            {res.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingRecord ? `Edit ${activeResource.label} #${editingRecord.id}` : `New ${activeResource.label}`}
          </h2>
          <RecordForm
            fields={activeResource.fields}
            initialData={editingRecord}
            onSubmit={editingRecord ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingRecord(null); }}
          />
        </div>
      ) : (
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add {activeResource.label}
        </button>
      )}

      {/* Data Table */}
      <div className="card overflow-hidden">
        <DataTable
          columns={tableColumns}
          data={data}
          loading={loading}
          emptyMessage={`No ${activeResource.label.toLowerCase()} found.`}
        />
      </div>
    </div>
  );
}
