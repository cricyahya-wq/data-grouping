/**
 * api/crop_type.js
 *
 * GET /api/customers/grouped/crop_type
 * → customers grouped and counted by crop type, ordered by count DESC
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
    const rows = db
      .prepare('SELECT crop_type, COUNT(id) AS count FROM customers GROUP BY crop_type ORDER BY count DESC')
      .all();
    return res.status(200).json({ data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
