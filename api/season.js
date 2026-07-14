/**
 * api/season.js
 *
 * GET /api/customers/grouped/season
 * → customers grouped and counted by season, ordered by count DESC (Neon PostgreSQL)
 */
const { sql } = require('./_db');
const checkAuth = require('./_auth');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authorize request
  if (!checkAuth(req, res)) {
    return; // _auth.js handles the response
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rows = await sql`
      SELECT season, COUNT(id)::int AS count 
      FROM customers 
      GROUP BY season 
      ORDER BY count DESC
    `;
    return res.status(200).json({ data: rows });
  } catch (err) {
    console.error('GET season stats error:', err);
    return res.status(500).json({ error: err.message });
  }
};
