/**
 * api.js
 * Shared fetch wrapper that automatically attaches the Authorization: Bearer
 * header to every outgoing API request.
 *
 * Set VITE_PORTAL_ACCESS_TOKEN in:
 *   - frontend/.env.local  (local dev)
 *   - Vercel → Project Settings → Environment Variables  (production)
 */

// On Vercel the /api routes live on the same origin, so no base URL is needed.
// During local dev the Express backend runs on :3000, so we fall back to that.
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const TOKEN = import.meta.env.VITE_PORTAL_ACCESS_TOKEN || 'agron_secure_token_2024';

/**
 * Drop-in replacement for fetch() that injects the Bearer token.
 *
 * @param {string} url     - The request URL
 * @param {RequestInit} options - Standard fetch options (method, body, headers, …)
 * @returns {Promise<Response>}
 */
export async function fetchAPI(url, options = {}) {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    ...(options.headers || {}),
  };

  return fetch(url, { ...options, headers });
}
