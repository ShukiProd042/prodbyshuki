const jwt = require('jsonwebtoken');

function authUser(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authAdmin(req, res, next) {
  const header = req.headers['x-admin-token'];
  if (!header)
    return res.status(401).json({ error: 'Admin token required' });
  try {
    const decoded = jwt.verify(header, process.env.JWT_SECRET);
    if (decoded.role !== 'admin')
      return res.status(403).json({ error: 'Not admin' });
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid admin token' });
  }
}

module.exports = { authUser, authAdmin };
