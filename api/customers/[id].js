/**
 * api/customers/[id].js
 *
 * PUT    /api/customers/:id  → edit a customer
 * DELETE /api/customers/:id  → delete a customer
 */
const { getDb } = require('../_db');
const { isAuthorized, unauthorized } = require('../_auth');

module.exports = function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAuthorized(req)) return unauthorized(res);

  const { id } = req.query;
  const db = getDb();

  // ── DELETE /api/customers/:id ───────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const info = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
      return res.status(200).json({ message: 'deleted', changes: info.changes });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PUT /api/customers/:id ──────────────────────────────────────
  if (req.method === 'PUT') {
    const { customer_details, phone_number, crop_type, area_of_crop, season, location } = req.body || {};

    if (!customer_details || !phone_number || !crop_type || !area_of_crop || !season || !location) {
      return res.status(400).json({ error: 'Please provide all details' });
    }

    try {
      const stmt = db.prepare(`
        UPDATE customers
        SET customer_details = ?, phone_number = ?, crop_type = ?, area_of_crop = ?, season = ?, location = ?
        WHERE id = ?
      `);
      const info = stmt.run(customer_details, phone_number, crop_type, area_of_crop, season, location, id);
      return res.status(200).json({ message: 'updated', changes: info.changes });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
