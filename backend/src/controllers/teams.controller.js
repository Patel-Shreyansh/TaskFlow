const db = require("../db/database");

function serialize(row, memberIds = []) {
  return { id: row.id, name: row.name, createdAt: row.created_at, memberIds };
}

function list(req, res, next) {
  try {
    const teams = db
      .prepare("SELECT * FROM teams WHERE owner_id = ? ORDER BY name ASC")
      .all(req.user.id);

    const result = teams.map((team) => {
      const memberRows = db
        .prepare("SELECT member_id FROM team_members WHERE team_id = ?")
        .all(team.id);
      return serialize(
        team,
        memberRows.map((r) => r.member_id)
      );
    });

    res.json({ teams: result });
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const { name, memberIds } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Team name is required" });
    }

    const ids = Array.isArray(memberIds) ? memberIds : [];

    // Verify every member belongs to this user before linking them.
    for (const memberId of ids) {
      const owned = db
        .prepare("SELECT id FROM members WHERE id = ? AND owner_id = ?")
        .get(memberId, req.user.id);
      if (!owned) {
        return res.status(400).json({ error: `Member ${memberId} was not found` });
      }
    }

    const result = db
      .prepare("INSERT INTO teams (owner_id, name) VALUES (?, ?)")
      .run(req.user.id, name.trim());

    const insertLink = db.prepare(
      "INSERT INTO team_members (team_id, member_id) VALUES (?, ?)"
    );
    for (const memberId of ids) {
      insertLink.run(result.lastInsertRowid, memberId);
    }

    const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ team: serialize(team, ids) });
  } catch (err) {
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const { id } = req.params;
    const existing = db
      .prepare("SELECT id FROM teams WHERE id = ? AND owner_id = ?")
      .get(id, req.user.id);

    if (!existing) return res.status(404).json({ error: "Team not found" });

    db.prepare("DELETE FROM teams WHERE id = ?").run(id);
    res.json({ message: "Team deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove };
