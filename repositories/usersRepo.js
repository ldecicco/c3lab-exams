"use strict";

const bcrypt = require("bcryptjs");
const db = require("../db");

const getUserBySessionToken = (token) => {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.avatar_path, u.avatar_thumb_path,
              u.totp_enabled,
              s.expires_at, s.active_course_id, s.active_exam_id
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`
    )
    .get(token);
  if (!row) return null;
  if (new Date(row.expires_at) <= new Date()) {
    db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    avatarPath: row.avatar_path || "",
    avatarThumbPath: row.avatar_thumb_path || "",
    totpEnabled: Boolean(row.totp_enabled),
    activeCourseId: row.active_course_id || null,
    activeExamId: row.active_exam_id || null,
  };
};

const ensureAdminUser = (username, password) => {
  const count = db.prepare("SELECT COUNT(*) AS total FROM users").get();
  if (count.total > 0) return false;
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
  ).run(username, hash, "admin");
  return true;
};

module.exports = {
  getUserBySessionToken,
  ensureAdminUser,
};
