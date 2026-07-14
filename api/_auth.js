/**
 * _auth.js  –  shared Bearer-token auth helper
 *
 * Returns true if the request carries a valid Authorization header.
 * The expected token is read from the PORTAL_ACCESS_TOKEN environment variable
 * which you set in Vercel → Project Settings → Environment Variables.
 */
function isAuthorized(req) {
  const expectedToken = process.env.PORTAL_ACCESS_TOKEN;
  const authHeader = req.headers['authorization'] || '';

  if (!authHeader.startsWith('Bearer ')) return false;

  const token = authHeader.slice(7); // strip "Bearer "
  return token === expectedToken;
}

function unauthorized(res) {
  res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { isAuthorized, unauthorized };
