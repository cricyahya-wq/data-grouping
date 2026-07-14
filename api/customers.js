/**
 * api/customers.js
 *
 * GET  /api/customers   → list all customers
 * POST /api/customers   → add a new customer
 */
const { getDb } = require('./_db');
const { isAuthorized, unauthorized } = require('./_auth');

module.exports = function handler(req, res) {
  // CORS – allow the Vite dev server and the deployed frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAuthorized(req)) return unauthorized(res);

  const db = getDb();

  // ── GET /api/customers ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const rows = db.prepare('SELECT * FROM customers').all();
      return res.status(200).json({ data: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/customers ─────────────────────────────────────────
  if (req.method === 'POST') {
    const { customer_details, phone_number, crop_type, area_of_crop, season, location } = req.body || {};

    if (!customer_details || !phone_number || !crop_type || !area_of_crop || !season || !location) {
      return res.status(400).json({ error: 'Please provide all details' });
    }

    try {
      const stmt = db.prepare(
        'INSERT INTO customers (customer_details, phone_number, crop_type, area_of_crop, season, location) VALUES (?, ?, ?, ?, ?, ?)'
      );
      const info = stmt.run(customer_details, phone_number, crop_type, area_of_crop, season, location);
      return res.status(201).json({
        message: 'success',
        data: { id: info.lastInsertRowid, customer_details, phone_number, crop_type, area_of_crop, season, location },
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
