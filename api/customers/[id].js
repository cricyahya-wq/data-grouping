/**
 * api/customers/[id].js
 *
 * PUT    /api/customers/:id  → edit a customer in PostgreSQL
 * DELETE /api/customers/:id  → delete a customer in PostgreSQL
 */
const { sql } = require('../_db');
const checkAuth = require('../_auth');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authorize request
  if (!checkAuth(req, res)) {
    return; // _auth.js handles the response
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing customer ID' });
  }

  // ── DELETE /api/customers/:id ───────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const result = await sql`
        DELETE FROM customers 
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      return res.status(200).json({ message: 'deleted', changes: result.length });
    } catch (err) {
      console.error('DELETE customer error:', err);
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
      const result = await sql`
        UPDATE customers
        SET 
          name = ${customer_details}, 
          phone = ${phone_number}, 
          location = ${location}, 
          crop_type = ${crop_type}, 
          season = ${season}, 
          area_acres = ${area_of_crop}
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      return res.status(200).json({ message: 'updated', changes: result.length });
    } catch (err) {
      console.error('PUT customer error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
