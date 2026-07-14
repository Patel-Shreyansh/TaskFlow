const jwt = require("jsonwebtoken");
const db = require("../db/database");
const env = require("../config/env");
const { hashPassword, verifyPassword } = require("../utils/password");

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.created_at,
    lastLogin: user.last_login,
  };
}

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    if (username.trim().length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim());
    if (existing) {
      return res.status(409).json({ error: "That username is already taken" });
    }

    const hash = hashPassword(password);
    const result = db
      .prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)")
      .run(username.trim(), email ? email.trim() : null, hash);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = signToken(user);

    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username.trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const matches = verifyPassword(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

function me(req, res, next) {
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
