/**
 * api/customers.js
 *
 * GET  /api/customers   → list all customers (mapped to frontend schema)
 * POST /api/customers   → add a new customer
 */
const { sql } = require('./_db');
const checkAuth = require('./_auth');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authorize request
  if (!checkAuth(req, res)) {
    return; // _auth.js handles the response
  }

  // ── GET /api/customers ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      // Fetch and map database fields to match frontend expectations:
      // name -> customer_details, phone -> phone_number, area_acres -> area_of_crop
      const rows = await sql`
        SELECT 
          id, 
          name AS customer_details, 
          phone AS phone_number, 
          crop_type, 
          area_acres AS area_of_crop, 
          season, 
          location 
        FROM customers
        ORDER BY id DESC
      `;
      return res.status(200).json({ data: rows });
    } catch (err) {
      console.error('GET customers error:', err);
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
      const result = await sql`
        INSERT INTO customers (name, phone, location, crop_type, season, area_acres)
        VALUES (${customer_details}, ${phone_number}, ${location}, ${crop_type}, ${season}, ${area_of_crop})
        RETURNING id, name, phone, location, crop_type, season, area_acres
      `;

      const newCustomer = result[0];

      return res.status(201).json({
        message: 'success',
        data: {
          id: newCustomer.id,
          customer_details: newCustomer.name,
          phone_number: newCustomer.phone,
          crop_type: newCustomer.crop_type,
          area_of_crop: newCustomer.area_acres,
          season: newCustomer.season,
          location: newCustomer.location
        },
      });
    } catch (err) {
      console.error('POST customer error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
