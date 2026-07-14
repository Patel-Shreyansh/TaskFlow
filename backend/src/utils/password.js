const crypto = require("crypto");

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/**
 * Password hashing built entirely on Node's built-in `crypto` module
 * (scrypt + a random salt + constant-time comparison). This avoids
 * native-addon packages like bcrypt, which need to be recompiled per
 * platform and are a common source of "works on my machine" bugs
 * right after a fresh `git clone` + `npm install`.
 *
 * Stored format: "<saltHex>:<derivedKeyHex>"
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;

  const [salt, keyHex] = stored.split(":");
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
  const storedKey = Buffer.from(keyHex, "hex");

  if (storedKey.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedKey, derivedKey);
}

module.exports = { hashPassword, verifyPassword };
