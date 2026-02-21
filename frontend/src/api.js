const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }
  return res.json();
}

function authHeaders(username, password) {
  return { Authorization: 'Basic ' + btoa(`${username}:${password}`) };
}

// Dashboard
export const fetchDashboard = () => request('/dashboard');

// Policies
export const fetchPolicies = (params) => request('/policies' + toQuery(params));
export const fetchPolicy = (id) => request(`/policies/${id}`);
export const fetchPolicyMapStates = () => request('/policies/map/states');
export const createPolicy = (data, auth) =>
  request('/admin/policies', { method: 'POST', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const updatePolicy = (id, data, auth) =>
  request(`/admin/policies/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const deletePolicy = (id, auth) =>
  request(`/admin/policies/${id}`, { method: 'DELETE', headers: authHeaders(auth.u, auth.p) });

// Deployments
export const fetchDeployments = (params) => request('/deployments' + toQuery(params));
export const fetchDeployment = (id) => request(`/deployments/${id}`);
export const fetchDeploymentMapLocations = () => request('/deployments/map/locations');
export const createDeployment = (data, auth) =>
  request('/admin/deployments', { method: 'POST', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const updateDeployment = (id, data, auth) =>
  request(`/admin/deployments/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const deleteDeployment = (id, auth) =>
  request(`/admin/deployments/${id}`, { method: 'DELETE', headers: authHeaders(auth.u, auth.p) });

// Funding
export const fetchFunding = (params) => request('/funding' + toQuery(params));
export const fetchFundingProgram = (id) => request(`/funding/${id}`);
export const createFunding = (data, auth) =>
  request('/admin/funding', { method: 'POST', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const updateFunding = (id, data, auth) =>
  request(`/admin/funding/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const deleteFunding = (id, auth) =>
  request(`/admin/funding/${id}`, { method: 'DELETE', headers: authHeaders(auth.u, auth.p) });

// Safety
export const fetchSafety = (params) => request('/safety' + toQuery(params));
export const fetchSafetyIncident = (id) => request(`/safety/${id}`);
export const fetchSafetyStatsByManufacturer = () => request('/safety/stats/by-manufacturer');
export const fetchSafetyStatsByType = () => request('/safety/stats/by-type');
export const fetchSafetyStatsByYear = () => request('/safety/stats/by-year');
export const fetchSafetyStatsBySeverity = () => request('/safety/stats/by-severity');
export const createSafety = (data, auth) =>
  request('/admin/safety', { method: 'POST', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const updateSafety = (id, data, auth) =>
  request(`/admin/safety/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const deleteSafety = (id, auth) =>
  request(`/admin/safety/${id}`, { method: 'DELETE', headers: authHeaders(auth.u, auth.p) });

// Resources
export const fetchResources = (params) => request('/resources' + toQuery(params));
export const fetchResource = (id) => request(`/resources/${id}`);
export const createResource = (data, auth) =>
  request('/admin/resources', { method: 'POST', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const updateResource = (id, data, auth) =>
  request(`/admin/resources/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const deleteResource = (id, auth) =>
  request(`/admin/resources/${id}`, { method: 'DELETE', headers: authHeaders(auth.u, auth.p) });

// Curbside
export const fetchCurbside = (params) => request('/curbside' + toQuery(params));
export const fetchCurbsideRegulation = (id) => request(`/curbside/${id}`);
export const createCurbside = (data, auth) =>
  request('/admin/curbside', { method: 'POST', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const updateCurbside = (id, data, auth) =>
  request(`/admin/curbside/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: authHeaders(auth.u, auth.p) });
export const deleteCurbside = (id, auth) =>
  request(`/admin/curbside/${id}`, { method: 'DELETE', headers: authHeaders(auth.u, auth.p) });

// CSV export (returns download URL)
export function getExportUrl(resource, params) {
  return `${API_BASE}/${resource}/export/csv` + toQuery(params);
}

function toQuery(params) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}
