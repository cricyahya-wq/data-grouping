/**
 * api.js
 *
 * Shared fetch wrapper and API helper functions.
 * Manages authorization headers and base URLs dynamically.
 */

// 1 & 2 & 3. Base URL Configuration
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : '');

/**
 * Drop-in replacement for fetch() that injects the Bearer token.
 * 4 & 5. Every request includes Authorization token from localStorage.
 */
export async function fetchAPI(url, options = {}) {
  const token = localStorage.getItem('agron_token') || 'agron_secure_token_2024';
  
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  return fetch(url, { ...options, headers });
}

// 6. Exported Helper Functions
export const getCustomers = () => 
  fetchAPI(`${API_BASE}/api/customers`).then(res => res.json());

export const addCustomer = (customer) => 
  fetchAPI(`${API_BASE}/api/customers`, {
    method: 'POST',
    body: JSON.stringify(customer),
  }).then(res => res.json());

export const updateCustomer = (id, customer) => 
  fetchAPI(`${API_BASE}/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  }).then(res => res.json());

export const deleteCustomer = (id) => 
  fetchAPI(`${API_BASE}/api/customers/${id}`, {
    method: 'DELETE',
  }).then(res => res.json());

export const getStats = () => 
  fetchAPI(`${API_BASE}/api/stats`).then(res => res.json());

export const getLocations = () => 
  fetchAPI(`${API_BASE}/api/location`).then(res => res.json());

export const getCropTypes = () => 
  fetchAPI(`${API_BASE}/api/crop_type`).then(res => res.json());

export const getSeasons = () => 
  fetchAPI(`${API_BASE}/api/season`).then(res => res.json());
