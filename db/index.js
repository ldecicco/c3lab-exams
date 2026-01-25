"use strict";

const fs = require("fs");
const Database = require("better-sqlite3");
const { DATA_DIR, IMAGE_DIR, AVATAR_DIR, DB_PATH } = require("../config");
const schema = require("./schema");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(IMAGE_DIR, { recursive: true });
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(schema);

db.exec(`
  DROP INDEX IF EXISTS idx_exam_multi_modules_m1;
  DROP INDEX IF EXISTS idx_exam_multi_modules_m2;
  DROP INDEX IF EXISTS idx_exam_multi_module_selections_mm;
  DROP INDEX IF EXISTS idx_exam_multi_module_selections_matricola;
  DROP TABLE IF EXISTS exam_multi_module_selections;
  DROP TABLE IF EXISTS exam_multi_modules;
`);

const ensureColumn = (table, column, definition) => {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = rows.some((row) => row.name === column);
  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
};

ensureColumn("auth_sessions", "active_course_id", "INTEGER");
ensureColumn("auth_sessions", "active_exam_id", "INTEGER");
ensureColumn("exams", "is_draft", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("exams", "locked_at", "TEXT");
ensureColumn("exams", "mapping_json", "TEXT");
ensureColumn("exams", "public_access_enabled", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("exams", "public_access_password_hash", "TEXT");
ensureColumn("exams", "public_access_expires_at", "TEXT");
ensureColumn("exams", "public_access_show_notes", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("images", "source_name", "TEXT");
ensureColumn("images", "source_path", "TEXT");
ensureColumn("questions", "image_layout_mode", "TEXT NOT NULL DEFAULT 'side'");
ensureColumn("images", "source_mime_type", "TEXT");
ensureColumn("images", "thumbnail_path", "TEXT");
ensureColumn("users", "avatar_path", "TEXT");
ensureColumn("users", "avatar_thumb_path", "TEXT");
ensureColumn("users", "totp_secret", "TEXT");
ensureColumn("users", "totp_enabled", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("questions", "note", "TEXT");
ensureColumn("answers", "note", "TEXT");
ensureColumn("exam_sessions", "target_top_grade", "REAL DEFAULT 30");
ensureColumn("exam_session_students", "normalized_score", "REAL");

db.exec("DROP INDEX IF EXISTS idx_exams_draft_course;");

module.exports = db;
