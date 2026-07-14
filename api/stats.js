/**
 * api/stats.js
 *
 * GET /api/stats  → dashboard summary stats + 5 most recently added customers
 */
const { getDb } = require('./_db');
const { isAuthorized, unauthorized } = require('./_auth');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAuthorized(req)) return unauthorized(res);

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const db = getDb();

    const { totalCustomers }  = db.prepare('SELECT COUNT(*) AS totalCustomers FROM customers').get();
    const { uniqueCrops }     = db.prepare('SELECT COUNT(DISTINCT crop_type) AS uniqueCrops FROM customers').get();
    const { uniqueLocations } = db.prepare('SELECT COUNT(DISTINCT location) AS uniqueLocations FROM customers').get();
    const { uniqueSeasons }   = db.prepare('SELECT COUNT(DISTINCT season) AS uniqueSeasons FROM customers').get();
    const recentlyAdded       = db.prepare('SELECT * FROM customers ORDER BY id DESC LIMIT 5').all();

    return res.status(200).json({
      data: { totalCustomers, uniqueCrops, uniqueLocations, uniqueSeasons, recentlyAdded },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
