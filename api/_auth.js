/**
 * _auth.js  –  shared auth checking helper for Vercel Serverless Functions
 *
 * Validates the Authorization header against the API_SECRET_TOKEN or PORTAL_ACCESS_TOKEN.
 * Returns true if authorized, or sends a 401 response and returns false if unauthorized.
 */
function checkAuth(req, res) {
  const expectedToken = process.env.API_SECRET_TOKEN || process.env.PORTAL_ACCESS_TOKEN;
  const authHeader = req.headers['authorization'] || '';

  if (!expectedToken) {
    console.error('Error: API_SECRET_TOKEN or PORTAL_ACCESS_TOKEN is not configured.');
    res.status(500).json({ error: 'Internal Server Error: Auth configuration missing' });
    return false;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    return false;
  }

  const token = authHeader.slice(7); // strip "Bearer "
  if (token !== expectedToken) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return false;
  }

  return true;
}

module.exports = checkAuth;
