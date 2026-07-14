const jwt = require("jsonwebtoken");
const env = require("../config/env");

/**
 * Verifies the Bearer JWT on protected routes and attaches
 * { id, username } to req.user. Every protected controller
 * scopes its DB queries by req.user.id, so users can only
 * ever see or modify their own data.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session, please log in again" });
  }
}

module.exports = authenticate;
