const fs = require("fs");
const path = require("path");

/**
 * Minimal .env loader so the project has zero extra dependencies.
 * Reads backend/.env (if present) and populates process.env for any
 * keys that aren't already set (real environment variables always win).
 */
function loadDotEnv() {
  const envPath = path.join(__dirname, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const idx = trimmed.indexOf("=");
    if (idx === -1) return;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    const isQuoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (isQuoted) value = value.slice(1, -1);

    if (!(key in process.env)) process.env[key] = value;
  });
}

loadDotEnv();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5001", 10),
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  DB_PATH: process.env.DB_PATH || "data/taskflow.db",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
};

if (env.NODE_ENV === "production" && env.JWT_SECRET === "dev-secret-change-me") {
  console.warn(
    "⚠️  WARNING: JWT_SECRET is using the insecure default value. " +
      "Set a strong, random JWT_SECRET in your .env file before deploying."
  );
}

module.exports = env;
