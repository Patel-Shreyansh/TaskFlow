const db = require("../db/database");

function serialize(row) {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };
}

function list(req, res, next) {
  try {
    const rows = db
      .prepare("SELECT * FROM members WHERE owner_id = ? ORDER BY name ASC")
      .all(req.user.id);
    res.json({ members: rows.map(serialize) });
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const { name, email } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Member name is required" });
    }

    const result = db
      .prepare("INSERT INTO members (owner_id, name, email) VALUES (?, ?, ?)")
      .run(req.user.id, name.trim(), email ? email.trim() : null);

    const member = db.prepare("SELECT * FROM members WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ member: serialize(member) });
  } catch (err) {
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const { id } = req.params;
    const existing = db
      .prepare("SELECT id FROM members WHERE id = ? AND owner_id = ?")
      .get(id, req.user.id);

    if (!existing) return res.status(404).json({ error: "Member not found" });

    db.prepare("DELETE FROM members WHERE id = ?").run(id);
    res.json({ message: "Member removed" });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove };
