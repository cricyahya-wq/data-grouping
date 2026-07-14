/**
 * api/stats.js
 *
 * GET /api/stats  → dashboard summary stats + 5 most recently added customers (Neon PostgreSQL)
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
    const totalRes = await sql`SELECT COUNT(*)::int AS count FROM customers`;
    const cropsRes = await sql`SELECT COUNT(DISTINCT crop_type)::int AS count FROM customers`;
    const locationsRes = await sql`SELECT COUNT(DISTINCT location)::int AS count FROM customers`;
    const seasonsRes = await sql`SELECT COUNT(DISTINCT season)::int AS count FROM customers`;

    const recentlyAdded = await sql`
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
      LIMIT 5
    `;

    return res.status(200).json({
      data: {
        totalCustomers: totalRes[0]?.count || 0,
        uniqueCrops: cropsRes[0]?.count || 0,
        uniqueLocations: locationsRes[0]?.count || 0,
        uniqueSeasons: seasonsRes[0]?.count || 0,
        recentlyAdded,
      },
    });
  } catch (err) {
    console.error('GET stats error:', err);
    return res.status(500).json({ error: err.message });
  }
};
