/**
 * authMiddleware.js
 * Validates Bearer token on every /api request.
 * Token is read from process.env.PORTAL_ACCESS_TOKEN (set in .env).
 */
function authMiddleware(req, res, next) {
  const expectedToken = process.env.PORTAL_ACCESS_TOKEN;
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  if (token !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = authMiddleware;
