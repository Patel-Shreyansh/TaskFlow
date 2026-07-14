const express = require("express");
const cors = require("cors");

const env = require("./config/env");
const requestLogger = require("./middleware/logger");
const securityHeaders = require("./middleware/security");
const rateLimit = require("./middleware/rateLimit");
const authenticate = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const taskRoutes = require("./routes/tasks.routes");
const memberRoutes = require("./routes/members.routes");
const teamRoutes = require("./routes/teams.routes");

const app = express();

app.use(securityHeaders);
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth endpoints are rate-limited to slow down credential stuffing / brute force.
app.use("/api/auth", rateLimit({ windowMs: 60_000, max: 15 }), authRoutes);

// Everything below requires a valid JWT and is scoped to req.user.id.
app.use("/api/tasks", authenticate, taskRoutes);
app.use("/api/members", authenticate, memberRoutes);
app.use("/api/teams", authenticate, teamRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
