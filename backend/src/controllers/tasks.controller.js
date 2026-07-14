const db = require("../db/database");

const VALID_STATUSES = ["todo", "inprogress", "completed"];
const VALID_PRIORITIES = ["low", "medium", "high"];

function serialize(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeType: row.assignee_type,
    assigneeId: row.assignee_id,
    deadline: row.deadline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function list(req, res, next) {
  try {
    const { status, priority, search } = req.query;
    let query = "SELECT * FROM tasks WHERE owner_id = ?";
    const params = [req.user.id];

    if (status && VALID_STATUSES.includes(status)) {
      query += " AND status = ?";
      params.push(status);
    }
    if (priority && VALID_PRIORITIES.includes(priority)) {
      query += " AND priority = ?";
      params.push(priority);
    }
    if (search) {
      query += " AND title LIKE ?";
      params.push(`%${search}%`);
    }
    query += " ORDER BY created_at DESC";

    const rows = db.prepare(query).all(...params);
    res.json({ tasks: rows.map(serialize) });
  } catch (err) {
    next(err);
  }
}

function stats(req, res, next) {
  try {
    const rows = db
      .prepare("SELECT status, deadline FROM tasks WHERE owner_id = ?")
      .all(req.user.id);

    const total = rows.length;
    const completed = rows.filter((r) => r.status === "completed").length;
    const inProgress = rows.filter((r) => r.status === "inprogress").length;
    const todo = rows.filter((r) => r.status === "todo").length;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = rows.filter(
      (r) => r.deadline && r.deadline < today && r.status !== "completed"
    ).length;

    res.json({ total, completed, inProgress, todo, overdue });
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const { title, description, priority, deadline, assigneeType, assigneeId } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Task title is required" });
    }

    const safePriority = VALID_PRIORITIES.includes(priority) ? priority : "medium";
    const safeAssigneeType = ["member", "team"].includes(assigneeType) ? assigneeType : null;

    const result = db
      .prepare(
        `INSERT INTO tasks (owner_id, title, description, priority, assignee_type, assignee_id, deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.id,
        title.trim(),
        description ? description.trim() : null,
        safePriority,
        safeAssigneeType,
        safeAssigneeType ? assigneeId || null : null,
        deadline || null
      );

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ task: serialize(task) });
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  try {
    const { id } = req.params;
    const existing = db
      .prepare("SELECT * FROM tasks WHERE id = ? AND owner_id = ?")
      .get(id, req.user.id);

    if (!existing) return res.status(404).json({ error: "Task not found" });

    if (req.body.status !== undefined && !VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    if (req.body.priority !== undefined && !VALID_PRIORITIES.includes(req.body.priority)) {
      return res.status(400).json({ error: "Invalid priority value" });
    }

    const fieldMap = {
      title: "title",
      description: "description",
      status: "status",
      priority: "priority",
      assigneeType: "assignee_type",
      assigneeId: "assignee_id",
      deadline: "deadline",
    };

    const updates = [];
    const params = [];

    for (const [bodyKey, column] of Object.entries(fieldMap)) {
      if (req.body[bodyKey] !== undefined) {
        updates.push(`${column} = ?`);
        params.push(req.body[bodyKey]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No valid fields provided to update" });
    }

    updates.push("updated_at = datetime('now')");
    params.push(id, req.user.id);

    db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND owner_id = ?`).run(
      ...params
    );

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    res.json({ task: serialize(task) });
  } catch (err) {
    next(err);
  }
}

function remove(req, res, next) {
  try {
    const { id } = req.params;
    const existing = db
      .prepare("SELECT id FROM tasks WHERE id = ? AND owner_id = ?")
      .get(id, req.user.id);

    if (!existing) return res.status(404).json({ error: "Task not found" });

    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    res.json({ message: "Task deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, stats, create, update, remove };
