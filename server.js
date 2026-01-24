#!/usr/bin/env node
"use strict";

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const { spawn, spawnSync } = require("child_process");
const Database = require("better-sqlite3");
const PDFDocument = require("pdfkit");
const xlsx = require("xlsx");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const { requireAuth, requireRole, createRequirePageRole } = require("./middlewares/auth");
const {
  initHelmet,
  createRateLimiter,
  createCsrfProtection,
  applyCsrfToken,
  ensureCsrfLocals,
} = require("./middlewares/security");
let speakeasy;
try {
  speakeasy = require("speakeasy");
} catch (err) {
  console.warn(
    "[security] speakeasy non installato, 2FA disattivata. Esegui: npm install speakeasy"
  );
  speakeasy = null;
}
let qrcode;
try {
  qrcode = require("qrcode");
} catch (err) {
  console.warn(
    "[security] qrcode non installato, QR 2FA disattivato. Esegui: npm install qrcode"
  );
  qrcode = null;
}

const PORT = process.env.PORT || 3000;
const BASE_PATH = process.env.BASE_PATH || "";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  path: BASE_PATH ? `${BASE_PATH}/socket.io` : "/socket.io",
  cors: { origin: true, credentials: true },
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

initHelmet(app);

const DATA_DIR = path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const IMAGE_DIR = path.join(DATA_DIR, "images");
fs.mkdirSync(IMAGE_DIR, { recursive: true });
const AVATAR_DIR = path.join(DATA_DIR, "avatars");
fs.mkdirSync(AVATAR_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "exam-builder.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS login_2fa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_type TEXT NOT NULL,
    ip TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(course_id, name),
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );
  CREATE TABLE IF NOT EXISTS course_shortcuts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    snippet TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(course_id, label),
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    image_path TEXT,
    image_layout_enabled INTEGER NOT NULL DEFAULT 0,
    image_layout_mode TEXT NOT NULL DEFAULT 'side',
    image_left_width TEXT,
    image_right_width TEXT,
    image_scale TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    original_name TEXT,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    source_name TEXT,
    source_path TEXT,
    source_mime_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );
  CREATE TABLE IF NOT EXISTS question_topics (
    question_id INTEGER NOT NULL,
    topic_id INTEGER NOT NULL,
    PRIMARY KEY (question_id, topic_id),
    FOREIGN KEY(question_id) REFERENCES questions(id),
    FOREIGN KEY(topic_id) REFERENCES topics(id)
  );
  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    text TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(question_id) REFERENCES questions(id)
  );
  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    date TEXT,
    output_name TEXT,
    versions INTEGER,
    seed INTEGER,
    randomize_questions INTEGER NOT NULL DEFAULT 1,
    randomize_answers INTEGER NOT NULL DEFAULT 1,
    write_r INTEGER NOT NULL DEFAULT 1,
    header_title TEXT,
    header_department TEXT,
    header_university TEXT,
    header_note TEXT,
    header_logo TEXT,
    is_draft INTEGER NOT NULL DEFAULT 0,
    locked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );
  CREATE TABLE IF NOT EXISTS exam_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY(exam_id) REFERENCES exams(id),
    FOREIGN KEY(question_id) REFERENCES questions(id)
  );
  CREATE TABLE IF NOT EXISTS exam_question_snapshots (
    exam_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (exam_id, position),
    FOREIGN KEY(exam_id) REFERENCES exams(id)
  );
  CREATE TABLE IF NOT EXISTS exam_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    title TEXT,
    result_date TEXT,
    target_top_grade REAL DEFAULT 30,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(exam_id) REFERENCES exams(id)
  );
  CREATE TABLE IF NOT EXISTS exam_multi_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    exam_id_module1 INTEGER NOT NULL,
    exam_id_module2 INTEGER NOT NULL,
    module1_min_grade REAL NOT NULL,
    module2_min_grade REAL NOT NULL,
    weight_module1 REAL NOT NULL DEFAULT 0.5,
    weight_module2 REAL NOT NULL DEFAULT 0.5,
    final_min_grade REAL NOT NULL DEFAULT 18,
    rounding TEXT NOT NULL DEFAULT 'ceil',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(exam_id_module1) REFERENCES exams(id),
    FOREIGN KEY(exam_id_module2) REFERENCES exams(id)
  );
  CREATE TABLE IF NOT EXISTS exam_multi_module_selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    multi_module_id INTEGER NOT NULL,
    matricola TEXT NOT NULL,
    chosen_result_id_module1 INTEGER,
    chosen_result_id_module2 INTEGER,
    updated_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(multi_module_id, matricola),
    FOREIGN KEY(multi_module_id) REFERENCES exam_multi_modules(id),
    FOREIGN KEY(chosen_result_id_module1) REFERENCES exam_session_students(id),
    FOREIGN KEY(chosen_result_id_module2) REFERENCES exam_session_students(id),
    FOREIGN KEY(updated_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS course_multi_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    course_id_module1 INTEGER NOT NULL,
    course_id_module2 INTEGER NOT NULL,
    module1_min_grade REAL NOT NULL,
    module2_min_grade REAL NOT NULL,
    weight_module1 REAL NOT NULL DEFAULT 0.5,
    weight_module2 REAL NOT NULL DEFAULT 0.5,
    final_min_grade REAL NOT NULL DEFAULT 18,
    rounding TEXT NOT NULL DEFAULT 'ceil',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(course_id_module1) REFERENCES courses(id),
    FOREIGN KEY(course_id_module2) REFERENCES courses(id)
  );
  CREATE TABLE IF NOT EXISTS course_multi_module_selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    multi_module_id INTEGER NOT NULL,
    matricola TEXT NOT NULL,
    chosen_result_id_module1 INTEGER,
    chosen_result_id_module2 INTEGER,
    updated_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(multi_module_id, matricola),
    FOREIGN KEY(multi_module_id) REFERENCES course_multi_modules(id),
    FOREIGN KEY(chosen_result_id_module1) REFERENCES exam_session_students(id),
    FOREIGN KEY(chosen_result_id_module2) REFERENCES exam_session_students(id),
    FOREIGN KEY(updated_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS exam_session_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    matricola TEXT NOT NULL,
    nome TEXT,
    cognome TEXT,
    versione INTEGER,
    answers_json TEXT NOT NULL,
    overrides_json TEXT,
    normalized_score REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id, matricola),
    FOREIGN KEY(session_id) REFERENCES exam_sessions(id)
  );
  CREATE INDEX IF NOT EXISTS idx_images_course ON images(course_id);
  CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
  CREATE INDEX IF NOT EXISTS idx_exam_snapshots_exam ON exam_question_snapshots(exam_id);
  CREATE INDEX IF NOT EXISTS idx_questions_updated ON questions(updated_at);
  CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam ON exam_sessions(exam_id);
  CREATE INDEX IF NOT EXISTS idx_exam_session_students_session ON exam_session_students(session_id);
  CREATE INDEX IF NOT EXISTS idx_exam_multi_modules_m1 ON exam_multi_modules(exam_id_module1);
  CREATE INDEX IF NOT EXISTS idx_exam_multi_modules_m2 ON exam_multi_modules(exam_id_module2);
  CREATE INDEX IF NOT EXISTS idx_exam_multi_module_selections_mm ON exam_multi_module_selections(multi_module_id);
  CREATE INDEX IF NOT EXISTS idx_exam_multi_module_selections_matricola ON exam_multi_module_selections(matricola);
  CREATE INDEX IF NOT EXISTS idx_course_multi_modules_m1 ON course_multi_modules(course_id_module1);
  CREATE INDEX IF NOT EXISTS idx_course_multi_modules_m2 ON course_multi_modules(course_id_module2);
  CREATE INDEX IF NOT EXISTS idx_course_multi_module_selections_mm ON course_multi_module_selections(multi_module_id);
  CREATE INDEX IF NOT EXISTS idx_course_multi_module_selections_matricola ON course_multi_module_selections(matricola);
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
  CREATE INDEX IF NOT EXISTS idx_course_shortcuts_course ON course_shortcuts(course_id);
`);

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

const isQuestionLocked = (questionId) =>
  Boolean(
    db
      .prepare(
        `SELECT 1
           FROM exam_questions eq
           JOIN exams e ON e.id = eq.exam_id
          WHERE eq.question_id = ? AND e.is_draft = 0
          LIMIT 1`
      )
      .get(questionId)
  );

const getExamQuestions = (examId) => {
  const questionRows = db
    .prepare(
      `SELECT eq.position, q.id, q.text, q.type, q.image_path, q.image_layout_enabled,
              q.image_layout_mode, q.image_left_width, q.image_right_width, q.image_scale,
              i.thumbnail_path AS image_thumbnail_path
         FROM exam_questions eq
         JOIN questions q ON q.id = eq.question_id
         LEFT JOIN images i ON i.file_path = q.image_path
        WHERE eq.exam_id = ?
        ORDER BY eq.position`
    )
    .all(examId);
  return questionRows.map((row) => {
    const answers = db
      .prepare(
        "SELECT position, text, is_correct FROM answers WHERE question_id = ? ORDER BY position"
      )
      .all(row.id)
      .map((ans) => ({
        position: ans.position,
        text: ans.text,
        isCorrect: Boolean(ans.is_correct),
      }));
    const topics = db
      .prepare(
        `SELECT t.name
           FROM question_topics qt
           JOIN topics t ON t.id = qt.topic_id
          WHERE qt.question_id = ?
          ORDER BY t.name`
      )
      .all(row.id)
      .map((t) => t.name);
    return {
      id: row.id,
      position: row.position,
      text: row.text,
      type: row.type,
      imagePath: row.image_path || "",
      imageThumbnailPath: row.image_thumbnail_path || "",
      imageLayoutEnabled: Boolean(row.image_layout_enabled),
      imageLayoutMode: row.image_layout_mode || "side",
      imageLeftWidth: row.image_left_width || "",
      imageRightWidth: row.image_right_width || "",
      imageScale: row.image_scale || "",
      answers,
      topics,
    };
  });
};

const getExamResults = (examId) =>
  db
    .prepare(
      `SELECT ess.id AS result_id,
              ess.matricola,
              ess.nome,
              ess.cognome,
              ess.normalized_score,
              ess.session_id,
              ess.updated_at AS result_updated_at,
              es.result_date,
              es.updated_at AS session_updated_at
         FROM exam_session_students ess
         JOIN exam_sessions es ON es.id = ess.session_id
        WHERE es.exam_id = ?`
    )
    .all(examId)
    .map((row) => ({
      ...row,
      normalized_score: row.normalized_score === null ? null : Number(row.normalized_score),
    }));

const getExamSnapshotQuestions = (examId) => {
  const rows = db
    .prepare(
      `SELECT position, snapshot_json
         FROM exam_question_snapshots
        WHERE exam_id = ?
        ORDER BY position`
    )
    .all(examId);
  return rows.map((row) => {
    const snapshot = JSON.parse(row.snapshot_json);
    return { ...snapshot, position: row.position };
  });
};

const normalizeAnswerSet = (arr) =>
  Array.from(new Set(arr))
    .filter((val) => Number.isFinite(val))
    .sort((a, b) => a - b)
    .join(",");

const getSelectedOriginalAnswers = (student, questionIndex, mapping) => {
  if (!mapping) return [];
  const version = Number(student.versione);
  if (!Number.isFinite(version) || version < 1 || version > mapping.Nversions) {
    return [];
  }
  const qdict = mapping.questiondictionary?.[version - 1] || [];
  const adict = mapping.randomizedanswersdictionary?.[version - 1] || [];
  const displayedIndex = Number(qdict[questionIndex] || 0) - 1;
  if (displayedIndex < 0) return [];
  const selected = String(student.answers?.[displayedIndex] || "").split("");
  const selectedIdx = selected
    .map((letter) => ANSWER_OPTIONS.indexOf(letter) + 1)
    .filter((idx) => idx > 0);
  const answerMap = adict[questionIndex] || [];
  return selectedIdx
    .map((idx) => Number(answerMap[idx - 1]))
    .filter((idx) => Number.isFinite(idx));
};

app.use(express.text({ type: ["text/plain", "application/octet-stream"], limit: "5mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.raw({ type: "application/vnd.ms-excel", limit: "5mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.set("trust proxy", 1);

const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 7);
const PUBLIC_ACCESS_TTL_DAYS = Number(process.env.PUBLIC_ACCESS_TTL_DAYS || 30);

const USE_SECURE_COOKIES = process.env.NODE_ENV !== "development";
const REQUIRE_2FA = process.env.NODE_ENV !== "development";
const SESSION_COOKIE_OPTIONS = (expiresAt) => ({
  httpOnly: true,
  sameSite: "strict",
  secure: USE_SECURE_COOKIES,
  expires: expiresAt,
});

const getRequestIp = (req) => {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || "";
};

const logSecurityEvent = (req, type, details = "", userId = null) => {
  try {
    db.prepare(
      "INSERT INTO security_events (user_id, event_type, ip, details) VALUES (?, ?, ?, ?)"
    ).run(userId, type, getRequestIp(req), details || "");
  } catch (err) {
    console.warn("[security] log event failed", err.message);
  }
};

const csrfProtection = createCsrfProtection({ useSecureCookies: USE_SECURE_COOKIES });

const createSession = (userId) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  db.prepare(
    "INSERT INTO auth_sessions (user_id, token, expires_at) VALUES (?, ?, ?)"
  ).run(userId, token, expiresAt.toISOString());
  return { token, expiresAt };
};

const TWO_FA_TTL_MINUTES = Number(process.env.TWO_FA_TTL_MINUTES || 5);

const createTwoFaToken = (userId) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TWO_FA_TTL_MINUTES);
  db.prepare(
    "INSERT INTO login_2fa (user_id, token, expires_at) VALUES (?, ?, ?)"
  ).run(userId, token, expiresAt.toISOString());
  return { token, expiresAt };
};

const getUserFromToken = (token) => {
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

const loadUser = (req, res, next) => {
  const token = req.cookies?.session_token;
  const user = getUserFromToken(token);
  req.user = user || null;
  req.activeCourseId = user?.activeCourseId ?? null;
  req.activeExamId = user?.activeExamId ?? null;
  req.sessionToken = token || null;
  res.locals.user = user || null;
  res.locals.requireTwoFactor = REQUIRE_2FA && Boolean(user && !user.totpEnabled);
  res.locals.activeCourseId = user?.activeCourseId ?? null;
  if (user?.activeCourseId) {
    const course = db
      .prepare("SELECT name FROM courses WHERE id = ?")
      .get(user.activeCourseId);
    res.locals.activeCourseName = course?.name || null;
  } else {
    res.locals.activeCourseName = null;
  }
  if (user?.activeExamId) {
    const exam = db
      .prepare("SELECT title FROM exams WHERE id = ?")
      .get(user.activeExamId);
    res.locals.activeExamTitle = exam?.title || null;
  } else {
    res.locals.activeExamTitle = null;
  }
  next();
};

app.use(loadUser);

app.use((req, res, next) => {
  if (!REQUIRE_2FA || !req.user || req.user.totpEnabled) return next();
  const rawPath = req.path || "";
  const normalizedPath =
    BASE_PATH && rawPath.startsWith(BASE_PATH)
      ? rawPath.slice(BASE_PATH.length) || "/"
      : rawPath;
  if (!normalizedPath.startsWith("/api") && !normalizedPath.startsWith("/auth")) return next();
  const allowed = [
    "/auth/logout",
    "/auth/me",
    "/api/2fa/setup/start",
    "/api/2fa/setup/verify",
    "/api/2fa/disable",
    "/api/users/me/password",
  ];
  if (allowed.includes(normalizedPath)) return next();
  res.status(403).json({ error: "2FA richiesto" });
});

app.use((req, res, next) => {
  if (!REQUIRE_2FA || !req.user || req.user.totpEnabled) return next();
  if (req.method !== "GET") return next();
  const rawPath = req.path || "";
  const pathOnly =
    BASE_PATH && rawPath.startsWith(BASE_PATH)
      ? rawPath.slice(BASE_PATH.length) || "/"
      : rawPath;
  const allowedPrefixes = ["/2fa-setup", "/logout", "/auth", "/api/2fa"];
  if (allowedPrefixes.some((prefix) => pathOnly.startsWith(prefix))) return next();
  if (pathOnly.includes(".")) return next();
  res.redirect(BASE_PATH + "/2fa-setup");
});

app.use(applyCsrfToken(csrfProtection));
app.use(ensureCsrfLocals(BASE_PATH));

const requirePageRole = createRequirePageRole(BASE_PATH);

const ensureAdminUser = () => {
  const count = db.prepare("SELECT COUNT(*) AS total FROM users").get();
  if (count.total > 0) return;
  const username = process.env.ADMIN_USER || "admin";
  const password = process.env.ADMIN_PASS || "admin";
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
  ).run(username, hash, "admin");
  console.log(`Admin user creato: ${username}`);
};

ensureAdminUser();

const router = express.Router();

const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Troppi tentativi di login. Riprova tra un minuto." },
});

const publicResultsLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Troppe richieste. Riprova tra un minuto." },
});

const publicExamsLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Troppe richieste. Riprova tra un minuto." },
});

router.get("/", (req, res) => res.redirect(BASE_PATH + "/home"));
router.get("/login", (req, res) => res.render("login"));
router.get("/2fa-setup", requireAuth, (req, res) => res.render("twofa"));
router.get("/home", requirePageRole("admin", "creator", "evaluator"), (req, res) =>
  res.render("home")
);
router.get("/valutazione", (req, res) => res.render("index"));
router.get("/valutazione/", (req, res) => res.render("index"));
router.get("/index", (req, res) => res.redirect(BASE_PATH + "/valutazione"));
router.get("/index.html", (req, res) => res.redirect(BASE_PATH + "/valutazione"));
router.get("/questions", requirePageRole("admin", "creator"), (req, res) =>
  res.render("questions")
);
router.get("/questions.html", requirePageRole("admin", "creator"), (req, res) =>
  res.render("questions")
);
router.get("/exam-builder", requirePageRole("admin", "creator"), (req, res) =>
  res.render("exam-builder")
);
router.get("/exam-builder.html", requirePageRole("admin", "creator"), (req, res) =>
  res.render("exam-builder")
);
router.get("/dashboard", requirePageRole("admin", "creator"), (req, res) =>
  res.render("dashboard")
);
router.get("/dashboard.html", requirePageRole("admin", "creator"), (req, res) =>
  res.render("dashboard")
);
router.get("/esame-completo", requirePageRole("admin", "creator", "evaluator"), (req, res) =>
  res.render("esame-completo")
);
router.get("/esame-completo.html", requirePageRole("admin", "creator", "evaluator"), (req, res) =>
  res.render("esame-completo")
);
router.get("/admin", requirePageRole("admin"), (req, res) => res.render("admin"));
router.get("/admin.html", requirePageRole("admin"), (req, res) =>
  res.render("admin")
);
router.get("/guida", requireAuth, (req, res) => res.render("guida"));
router.get("/guida.html", requireAuth, (req, res) => res.render("guida"));

router.get("/logout", (req, res) => {
  const token = req.cookies?.session_token;
  if (token) {
    db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
  }
  res.clearCookie("session_token", {
    httpOnly: true,
    sameSite: "strict",
    secure: USE_SECURE_COOKIES,
  });
  if (req.user) {
    logSecurityEvent(req, "logout", "", req.user.id);
  }
  res.redirect(BASE_PATH + "/login");
});

router.post("/auth/login", loginLimiter, (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!username || !password) {
    res.status(400).json({ error: "Credenziali mancanti" });
    return;
  }
  const user = db
    .prepare("SELECT id, username, password_hash, role, totp_enabled FROM users WHERE username = ?")
    .get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logSecurityEvent(req, "login_failed", `username=${username}`);
    res.status(401).json({ error: "Credenziali non valide" });
    return;
  }
  if (REQUIRE_2FA && user.totp_enabled) {
    if (!speakeasy) {
      res.status(500).json({ error: "2FA non disponibile sul server." });
      return;
    }
    const pending = createTwoFaToken(user.id);
    logSecurityEvent(req, "login_otp_required", "", user.id);
    res.json({ requiresOtp: true, tempToken: pending.token });
    return;
  }
  const session = createSession(user.id);
  res.cookie("session_token", session.token, SESSION_COOKIE_OPTIONS(session.expiresAt));
  logSecurityEvent(req, "login_success", "", user.id);
  res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
});

router.post("/auth/login-2fa", loginLimiter, (req, res) => {
  if (!REQUIRE_2FA) {
    res.status(400).json({ error: "2FA disabilitata in sviluppo." });
    return;
  }
  const tempToken = String(req.body.tempToken || "");
  const otp = String(req.body.otp || "").trim();
  if (!tempToken || !otp) {
    res.status(400).json({ error: "Dati mancanti" });
    return;
  }
  const pending = db
    .prepare("SELECT user_id, expires_at FROM login_2fa WHERE token = ?")
    .get(tempToken);
  if (!pending) {
    res.status(401).json({ error: "Token non valido" });
    return;
  }
  if (new Date(pending.expires_at) <= new Date()) {
    db.prepare("DELETE FROM login_2fa WHERE token = ?").run(tempToken);
    res.status(401).json({ error: "Token scaduto" });
    return;
  }
  const user = db
    .prepare("SELECT id, username, role, totp_secret FROM users WHERE id = ?")
    .get(pending.user_id);
  if (!user || !user.totp_secret || !speakeasy) {
    res.status(401).json({ error: "2FA non configurata" });
    return;
  }
  const ok = speakeasy.totp.verify({
    secret: user.totp_secret,
    encoding: "base32",
    token: otp,
    window: 1,
  });
  if (!ok) {
    res.status(401).json({ error: "Codice non valido" });
    return;
  }
  db.prepare("DELETE FROM login_2fa WHERE token = ?").run(tempToken);
  const session = createSession(user.id);
  res.cookie("session_token", session.token, SESSION_COOKIE_OPTIONS(session.expiresAt));
  logSecurityEvent(req, "login_success", "", user.id);
  res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
});

router.post("/auth/logout", (req, res) => {
  const token = req.cookies?.session_token;
  if (token) {
    db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
  }
  res.clearCookie("session_token", {
    httpOnly: true,
    sameSite: "strict",
    secure: USE_SECURE_COOKIES,
  });
  if (req.user) {
    logSecurityEvent(req, "logout", "", req.user.id);
  }
  res.json({ ok: true });
});

router.get("/api/session/course", requireAuth, (req, res) => {
  const courseId = req.activeCourseId;
  if (!Number.isFinite(Number(courseId))) {
    res.json({ course: null });
    return;
  }
  const course = db
    .prepare("SELECT id, name, code FROM courses WHERE id = ?")
    .get(courseId);
  res.json({ course: course || null });
});

router.post("/api/session/course", requireAuth, (req, res) => {
  const courseId = Number(req.body?.courseId);
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "courseId mancante" });
    return;
  }
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId);
  if (!course) {
    res.status(404).json({ error: "Corso non trovato" });
    return;
  }
  if (!req.sessionToken) {
    res.status(400).json({ error: "Sessione non valida" });
    return;
  }
  db.prepare(
    "UPDATE auth_sessions SET active_course_id = ?, active_exam_id = NULL WHERE token = ?"
  ).run(courseId, req.sessionToken);
  res.json({ ok: true });
});

router.get("/api/session/exam", requireAuth, (req, res) => {
  const examId = req.activeExamId;
  if (!Number.isFinite(Number(examId))) {
    res.json({ exam: null });
    return;
  }
  const exam = db
    .prepare("SELECT id, course_id, title, date FROM exams WHERE id = ?")
    .get(examId);
  if (!exam) {
    res.json({ exam: null });
    return;
  }
  res.json({ exam });
});

router.post("/api/session/exam", requireAuth, (req, res) => {
  const examId = Number(req.body?.examId);
  if (!Number.isFinite(examId)) {
    res.status(400).json({ error: "examId mancante" });
    return;
  }
  const exam = db
    .prepare("SELECT id, course_id FROM exams WHERE id = ?")
    .get(examId);
  if (!exam) {
    res.status(404).json({ error: "Traccia non trovata" });
    return;
  }
  if (Number.isFinite(Number(req.activeCourseId)) && exam.course_id !== req.activeCourseId) {
    res.status(400).json({ error: "Traccia non appartiene al corso attivo" });
    return;
  }
  if (!req.sessionToken) {
    res.status(400).json({ error: "Sessione non valida" });
    return;
  }
  db.prepare("UPDATE auth_sessions SET active_exam_id = ? WHERE token = ?").run(
    examId,
    req.sessionToken
  );
  res.json({ ok: true });
});

router.get("/auth/me", (req, res) => {
  res.json({ user: req.user || null });
});

router.get("/api/users", requireRole("admin"), (req, res) => {
  const users = db
    .prepare("SELECT id, username, role, created_at FROM users ORDER BY username")
    .all();
  res.json({ users });
});

router.post("/api/users", requireRole("admin"), (req, res) => {
  const payload = req.body || {};
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "");
  const role = String(payload.role || "").trim();
  if (!username || !password || !role) {
    res.status(400).json({ error: "Dati mancanti" });
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db
      .prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)")
      .run(username, hash, role);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: "Username già presente" });
  }
});

router.put("/api/users/:id", requireRole("admin"), (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const current = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId);
  if (!current) {
    res.status(404).json({ error: "Utente non trovato." });
    return;
  }
  const payload = req.body || {};
  const updates = [];
  const params = [];
  if (payload.username) {
    updates.push("username = ?");
    params.push(String(payload.username).trim());
  }
  if (payload.role) {
    if (current.role === "admin" && String(payload.role).trim() !== "admin") {
      res.status(400).json({ error: "Non puoi cambiare il ruolo di un amministratore." });
      return;
    }
    updates.push("role = ?");
    params.push(String(payload.role).trim());
  }
  if (payload.password) {
    updates.push("password_hash = ?");
    params.push(bcrypt.hashSync(String(payload.password), 10));
  }
  if (!updates.length) {
    res.json({ ok: true });
    return;
  }
  params.push(userId);
  try {
    db.prepare(`UPDATE users SET ${updates.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(...params);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Username già presente" });
  }
});

router.delete("/api/users/:id", requireRole("admin"), (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId);
  if (!target) {
    res.status(404).json({ error: "Utente non trovato." });
    return;
  }
  if (target.role === "admin") {
    res.status(400).json({ error: "Non puoi eliminare un amministratore." });
    return;
  }
  if (req.user?.id === userId) {
    res.status(400).json({ error: "Non puoi eliminare il tuo utente." });
    return;
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  res.json({ ok: true });
});

router.post("/api/users/me/avatar", requireAuth, (req, res) => {
  const payload = req.body || {};
  const originalBase64 = String(payload.originalBase64 || "");
  const croppedBase64 = String(payload.croppedBase64 || "");
  const originalName = String(payload.originalName || "");
  if (!originalBase64 || !croppedBase64) {
    res.status(400).json({ error: "Immagine mancante" });
    return;
  }

  const ext = detectExtension(originalName, originalBase64) || ".png";
  const baseName = `avatar-${req.user.id}-${Date.now()}`;
  const originalFile = `${baseName}${ext}`;
  const thumbFile = `${baseName}-thumb.png`;
  const originalAbs = path.join(AVATAR_DIR, originalFile);
  const thumbAbs = path.join(AVATAR_DIR, thumbFile);

  try {
    fs.writeFileSync(
      originalAbs,
      Buffer.from(stripDataUrl(originalBase64), "base64")
    );
    fs.writeFileSync(
      thumbAbs,
      Buffer.from(stripDataUrl(croppedBase64), "base64")
    );
  } catch (err) {
    res.status(500).json({ error: "Salvataggio immagine fallito" });
    return;
  }

  const originalRel = path
    .relative(__dirname, originalAbs)
    .replace(/\\/g, "/");
  const thumbRel = path.relative(__dirname, thumbAbs).replace(/\\/g, "/");
  const current = db
    .prepare("SELECT avatar_path, avatar_thumb_path FROM users WHERE id = ?")
    .get(req.user.id);

  db.prepare(
    `UPDATE users
        SET avatar_path = ?, avatar_thumb_path = ?, updated_at = datetime('now')
      WHERE id = ?`
  ).run(originalRel, thumbRel, req.user.id);

  const removeIfExists = (relPath) => {
    if (!relPath) return;
    if (relPath === originalRel || relPath === thumbRel) return;
    const absPath = path.join(__dirname, relPath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  };
  removeIfExists(current?.avatar_path);
  removeIfExists(current?.avatar_thumb_path);

  res.json({ avatar_path: originalRel, avatar_thumb_path: thumbRel });
});

router.post("/api/2fa/setup/start", requireAuth, async (req, res) => {
  if (!speakeasy) {
    res.status(500).json({ error: "2FA non disponibile sul server." });
    return;
  }
  const userId = req.user.id;
  const username = req.user.username || "utente";
  const secret = speakeasy.generateSecret({
    name: `C3LAB (${username})`,
  });
  if (!secret.base32) {
    res.status(500).json({ error: "Errore generazione 2FA" });
    return;
  }
  db.prepare("UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?").run(
    secret.base32,
    userId
  );
  let qrCodeDataUrl = "";
  if (qrcode && secret.otpauth_url) {
    try {
      qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);
    } catch (err) {
      qrCodeDataUrl = "";
    }
  }
  res.json({
    otpauthUrl: secret.otpauth_url,
    qrCodeDataUrl,
    secret: secret.base32,
  });
});

router.post("/api/2fa/setup/verify", requireAuth, (req, res) => {
  if (!speakeasy) {
    res.status(500).json({ error: "2FA non disponibile sul server." });
    return;
  }
  const token = String(req.body.token || "").trim();
  if (!token) {
    res.status(400).json({ error: "Codice mancante" });
    return;
  }
  const user = db.prepare("SELECT totp_secret FROM users WHERE id = ?").get(req.user.id);
  if (!user || !user.totp_secret) {
    res.status(400).json({ error: "2FA non inizializzata" });
    return;
  }
  const ok = speakeasy.totp.verify({
    secret: user.totp_secret,
    encoding: "base32",
    token,
    window: 1,
  });
  if (!ok) {
    res.status(400).json({ error: "Codice non valido" });
    return;
  }
  db.prepare("UPDATE users SET totp_enabled = 1 WHERE id = ?").run(req.user.id);
  logSecurityEvent(req, "2fa_enabled", "", req.user.id);
  res.json({ ok: true });
});

router.post("/api/2fa/disable", requireAuth, (req, res) => {
  const password = String(req.body.password || "");
  if (!password) {
    res.status(400).json({ error: "Password mancante" });
    return;
  }
  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE id = ?")
    .get(req.user.id);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(400).json({ error: "Password non valida" });
    return;
  }
  db.prepare("UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?").run(
    req.user.id
  );
  logSecurityEvent(req, "2fa_disabled", "", req.user.id);
  res.json({ ok: true });
});

router.get("/api/db/tables", requireRole("admin"), (req, res) => {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all()
    .map((row) => row.name);
  res.json({ tables });
});

const getDbTableColumns = (tableName) => {
  const rows = db
    .prepare(`PRAGMA table_info("${tableName.replace(/"/g, '""')}")`)
    .all();
  return rows.map((row) => row.name);
};

router.post("/api/db/query", requireRole("admin"), (req, res) => {
  const payload = req.body || {};
  const table = String(payload.table || "").trim();
  if (!table) {
    res.status(400).json({ error: "Tabella mancante" });
    return;
  }
  const columns = getDbTableColumns(table);
  if (!columns.length) {
    res.status(400).json({ error: "Tabella non valida" });
    return;
  }
  const limit = Math.min(Math.max(Number(payload.limit) || 100, 1), 2000);
  const offset = Math.max(Number(payload.offset) || 0, 0);
  const search = String(payload.search || "").trim();
  const orderBy = String(payload.orderBy || "").trim();
  const orderDir =
    String(payload.orderDir || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";

  const quotedColumns = columns.map((col) => `"${col.replace(/"/g, '""')}"`);
  const whereParts = [];
  const whereParams = [];
  if (search) {
    const like = `%${search}%`;
    columns.forEach((col) => {
      whereParts.push(`CAST("${col.replace(/"/g, '""')}" AS TEXT) LIKE ?`);
      whereParams.push(like);
    });
  }
  const whereClause = whereParts.length ? ` WHERE ${whereParts.join(" OR ")}` : "";
  const orderClause = columns.includes(orderBy)
    ? ` ORDER BY "${orderBy.replace(/"/g, '""')}" ${orderDir}`
    : "";

  const total = db
    .prepare(`SELECT COUNT(*) as total FROM "${table.replace(/"/g, '""')}"${whereClause}`)
    .get(...whereParams)?.total;

  const rows = db
    .prepare(
      `SELECT ${quotedColumns.join(", ")} FROM "${table.replace(/"/g, '""')}"${whereClause}${orderClause} LIMIT ? OFFSET ?`
    )
    .all(...whereParams, limit, offset);

  res.json({ columns, rows, total: Number(total || 0) });
});

router.post("/api/db/export", requireRole("admin"), (req, res) => {
  const payload = req.body || {};
  const table = String(payload.table || "").trim();
  if (!table) {
    res.status(400).json({ error: "Tabella mancante" });
    return;
  }
  const columns = getDbTableColumns(table);
  if (!columns.length) {
    res.status(400).json({ error: "Tabella non valida" });
    return;
  }
  const limit = Math.min(Math.max(Number(payload.limit) || 1000, 1), 10000);
  const search = String(payload.search || "").trim();
  const orderBy = String(payload.orderBy || "").trim();
  const orderDir =
    String(payload.orderDir || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";

  const quotedColumns = columns.map((col) => `"${col.replace(/"/g, '""')}"`);
  const whereParts = [];
  const whereParams = [];
  if (search) {
    const like = `%${search}%`;
    columns.forEach((col) => {
      whereParts.push(`CAST("${col.replace(/"/g, '""')}" AS TEXT) LIKE ?`);
      whereParams.push(like);
    });
  }
  const whereClause = whereParts.length ? ` WHERE ${whereParts.join(" OR ")}` : "";
  const orderClause = columns.includes(orderBy)
    ? ` ORDER BY "${orderBy.replace(/"/g, '""')}" ${orderDir}`
    : "";

  const rows = db
    .prepare(
      `SELECT ${quotedColumns.join(", ")} FROM "${table.replace(/"/g, '""')}"${whereClause}${orderClause} LIMIT ?`
    )
    .all(...whereParams, limit);

  const escapeCsv = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    if (text.includes('"') || text.includes(",") || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const csvLines = [];
  csvLines.push(columns.map(escapeCsv).join(","));
  rows.forEach((row) => {
    csvLines.push(columns.map((col) => escapeCsv(row[col])).join(","));
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${table}.csv"`
  );
  res.send(csvLines.join("\n"));
});

router.post("/api/users/me/password", requireAuth, (req, res) => {
  const userId = req.user.id;
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Password mancanti." });
    return;
  }
  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE id = ?")
    .get(userId);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    logSecurityEvent(req, "password_change_failed", "", userId);
    res.status(400).json({ error: "Password attuale non valida." });
    return;
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(hash, userId);
  if (req.sessionToken) {
    db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(req.sessionToken);
  }
  const session = createSession(userId);
  res.cookie("session_token", session.token, SESSION_COOKIE_OPTIONS(session.expiresAt));
  logSecurityEvent(req, "password_change", "", userId);
  res.json({ ok: true });
});

router.get("/api/public-exams", publicExamsLimiter, (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.id, e.title, e.date, c.id AS course_id, c.name AS course_name
         FROM exams e
         JOIN courses c ON c.id = e.course_id
        WHERE e.public_access_enabled = 1
          AND e.is_draft = 0
          AND (e.public_access_expires_at IS NULL OR e.public_access_expires_at > datetime('now'))
          AND EXISTS (
            SELECT 1
            FROM exam_session_students ess
            JOIN exam_sessions es ON es.id = ess.session_id
           WHERE es.exam_id = e.id
          )
        ORDER BY e.date DESC, e.updated_at DESC`
    )
    .all();
  res.json({ exams: rows });
});

const getPublicResultsPayload = ({ examId, matricola, password }) => {
  if (!Number.isFinite(examId) || !matricola || !password) {
    const err = new Error("Dati mancanti");
    err.status = 400;
    throw err;
  }
  const exam = db
    .prepare(
      `SELECT e.id, e.title, e.date, e.mapping_json, e.public_access_enabled, e.is_draft,
              e.public_access_password_hash, e.public_access_expires_at,
              e.public_access_show_notes,
              EXISTS (
                SELECT 1
                  FROM exam_session_students ess
                  JOIN exam_sessions es ON es.id = ess.session_id
                 WHERE es.exam_id = e.id
                 LIMIT 1
              ) AS has_results,
              c.name AS course_name
         FROM exams e
         JOIN courses c ON c.id = e.course_id
        WHERE e.id = ?`
    )
    .get(examId);
  if (!exam) {
    const err = new Error("Traccia non trovata");
    err.status = 404;
    throw err;
  }
  if (!exam.public_access_enabled) {
    const err = new Error("Accesso non abilitato per questa traccia.");
    err.status = 403;
    throw err;
  }
  if (exam.is_draft) {
    const err = new Error("Traccia non chiusa.");
    err.status = 403;
    throw err;
  }
  if (exam.public_access_expires_at && new Date(exam.public_access_expires_at) <= new Date()) {
    const err = new Error("Accesso scaduto.");
    err.status = 403;
    throw err;
  }
  if (!exam.has_results) {
    const err = new Error("Risultati non disponibili.");
    err.status = 403;
    throw err;
  }
  if (!bcrypt.compareSync(password, exam.public_access_password_hash || "")) {
    const err = new Error("Password non valida.");
    err.status = 401;
    throw err;
  }
  if (!exam.mapping_json) {
    const err = new Error("Mapping non disponibile.");
    err.status = 400;
    throw err;
  }
  let mapping;
  try {
    mapping = JSON.parse(exam.mapping_json);
  } catch {
    const err = new Error("Mapping non valido.");
    err.status = 400;
    throw err;
  }
  const studentRow = db
    .prepare(
      `SELECT ess.matricola, ess.nome, ess.cognome, ess.versione, ess.answers_json, ess.overrides_json
         FROM exam_sessions es
         JOIN exam_session_students ess ON ess.session_id = es.id
        WHERE es.exam_id = ? AND ess.matricola = ?
        ORDER BY ess.updated_at DESC
        LIMIT 1`
    )
    .get(examId, matricola);
  if (!studentRow) {
    const err = new Error("Matricola non trovata.");
    err.status = 404;
    throw err;
  }
  const student = {
    matricola: studentRow.matricola,
    nome: studentRow.nome || "",
    cognome: studentRow.cognome || "",
    versione: studentRow.versione,
    answers: JSON.parse(studentRow.answers_json || "[]"),
    overrides: JSON.parse(studentRow.overrides_json || "[]"),
  };

  const allStudents = db
    .prepare(
      `SELECT ess.versione, ess.answers_json, ess.overrides_json
         FROM exam_sessions es
         JOIN exam_session_students ess ON ess.session_id = es.id
        WHERE es.exam_id = ?`
    )
    .all(examId)
    .map((row) => ({
      versione: row.versione,
      answers: JSON.parse(row.answers_json || "[]"),
      overrides: JSON.parse(row.overrides_json || "[]"),
    }));

  const scores = allStudents
    .map((s) => gradeStudent(s, mapping))
    .filter((val) => val !== null);
  const maxPoints = getMaxPoints(mapping);
  const rawGrade = Math.round(((gradeStudent(student, mapping) || 0) / maxPoints) * 300) / 10;
  const grades = scores.map((points) => (maxPoints ? (points / maxPoints) * 30 : 0));
  const top = grades.length ? Math.max(...grades) : null;
  const factor = top && top > 0 ? 30 / top : null;
  const normalizedGrade = factor
    ? Math.round(rawGrade * factor)
    : Math.round(rawGrade);

  const allowNotes = Boolean(exam.public_access_show_notes) && Boolean(exam.has_results);

  const questionRows = db
    .prepare(
      `SELECT eq.position, q.id, q.text, q.note, q.type
         FROM exam_questions eq
         JOIN questions q ON q.id = eq.question_id
        WHERE eq.exam_id = ?
        ORDER BY eq.position`
    )
    .all(examId);
  const questions = questionRows.map((row) => {
    const answers = db
      .prepare(
        "SELECT position, text, note, is_correct FROM answers WHERE question_id = ? ORDER BY position"
      )
      .all(row.id)
      .map((ans) => ({
        position: ans.position,
        text: ans.text,
        note: allowNotes ? ans.note || "" : "",
        isCorrect: Boolean(ans.is_correct),
      }));
    const topics = db
      .prepare(
        `SELECT t.name
           FROM question_topics qt
           JOIN topics t ON t.id = qt.topic_id
          WHERE qt.question_id = ?
          ORDER BY t.name`
      )
      .all(row.id)
      .map((t) => t.name);
    return {
      id: row.id,
      position: row.position,
      text: row.text,
      note: allowNotes ? row.note || "" : "",
      type: row.type,
      answers,
      topics,
    };
  });

  const qdict = mapping.questiondictionary[student.versione - 1];
  const adict = mapping.randomizedanswersdictionary[student.versione - 1];
  const displayedToOriginal = [];
  qdict.forEach((displayed, original) => {
    displayedToOriginal[displayed - 1] = original;
  });

  const displayedQuestions = displayedToOriginal.map((originalIndex, displayedIndex) => {
    const q = questions[originalIndex];
    const order = adict[originalIndex];
    const selectedLetters = String(student.answers[displayedIndex] || "").split("");
    const orderSafe = Array.isArray(order) ? order : [];
    const correctLetters = orderSafe
      .map((originalAnswerIndex, idx) => {
        const answer = q.answers[originalAnswerIndex - 1];
        return answer?.isCorrect ? ANSWER_OPTIONS[idx] || String(idx + 1) : null;
      })
      .filter(Boolean);
    const displayedAnswers = orderSafe.map((originalAnswerIndex, idx) => {
      const answer = q.answers[originalAnswerIndex - 1];
      const letter = ANSWER_OPTIONS[idx] || String(idx + 1);
      return {
        letter,
        text: answer.text,
        isCorrect: Boolean(answer.isCorrect),
        selected: selectedLetters.includes(letter),
      };
    });
    const pointsTotal = getQuestionPoints(mapping.correctiondictionary?.[originalIndex] || []) || 0;
    const override = student.overrides?.[originalIndex];
    let pointsEarned = 0;
    let isCorrect = false;
    let isOverride = false;
    if (typeof override === "number" && Number.isFinite(override)) {
      pointsEarned = override;
      isOverride = true;
      isCorrect = false;
    } else {
      const selectedSet = selectedLetters.slice().sort().join(",");
      const correctSet = correctLetters.slice().sort().join(",");
      if (selectedSet && selectedSet === correctSet) {
        pointsEarned = pointsTotal;
        isCorrect = true;
      }
    }
    return {
      index: displayedIndex + 1,
      text: q.text,
      type: q.type,
      note: q.note || "",
      topics: q.topics || [],
      answers: displayedAnswers,
      selectedLetters,
      correctLetters,
      pointsTotal,
      pointsEarned,
      isCorrect,
      isOverride,
    };
  });

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      date: exam.date || "",
      courseName: exam.course_name,
    },
    student: {
      matricola: student.matricola,
      nome: student.nome,
      cognome: student.cognome,
      versione: student.versione,
    },
    grade: {
      raw: rawGrade,
      normalized: normalizedGrade,
      maxPoints,
    },
    questions: displayedQuestions,
  };
};

router.post("/api/public-results", publicResultsLimiter, (req, res) => {
  const examId = Number(req.body.examId);
  const matricola = String(req.body.matricola || "").trim();
  const password = String(req.body.password || "");
  try {
    const payload = getPublicResultsPayload({ examId, matricola, password });
    res.json(payload);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Errore accesso" });
  }
});

router.post("/api/study-advice-prompt", (req, res) => {
  const examId = Number(req.body.examId);
  const matricola = String(req.body.matricola || "").trim();
  const password = String(req.body.password || "");
  console.log(`[study-advice-prompt] Request: examId=${examId}, matricola=${matricola}`);
  try {
    const payload = getPublicResultsPayload({ examId, matricola, password });
    console.log(`[study-advice-prompt] Payload retrieved successfully`);
    const prompt = generateStudyAdvicePrompt(payload);
    console.log(`[study-advice-prompt] Prompt generated, length: ${prompt.length}`);
    res.json({ prompt });
  } catch (err) {
    console.error(`[study-advice-prompt] Error:`, err);
    res.status(err.status || 500).json({ error: err.message || "Errore accesso" });
  }
});

router.post("/api/study-advice-prompt-admin", requireAuth, (req, res) => {
  const examId = Number(req.body.examId);
  const matricola = String(req.body.matricola || "").trim();

  console.log(`[study-advice-prompt-admin] Request: examId=${examId}, matricola=${matricola}`);
  console.log(`[study-advice-prompt-admin] Session:`, req.session);

  try {
    // Admin version - bypass password check, use session data
    // Just use the public payload function with a dummy password since admin has access
    const studentRow = db
      .prepare(
        `SELECT ess.matricola, ess.nome, ess.cognome, ess.versione, ess.answers_json, ess.overrides_json
           FROM exam_sessions es
           JOIN exam_session_students ess ON ess.session_id = es.id
          WHERE es.exam_id = ? AND ess.matricola = ?
          ORDER BY ess.updated_at DESC
          LIMIT 1`
      )
      .get(examId, matricola);

    if (!studentRow) {
      return res.status(404).json({ error: "Studente non trovato" });
    }

    // Get exam with mapping
    const exam = db
      .prepare(
        `SELECT e.id, e.title, e.date, e.mapping_json,
                c.name AS course_name
           FROM exams e
           JOIN courses c ON c.id = e.course_id
          WHERE e.id = ?`
      )
      .get(examId);

    if (!exam || !exam.mapping_json) {
      return res.status(404).json({ error: "Traccia non trovata o mapping non disponibile" });
    }

    // Reuse the logic from getPublicResultsPayload by calling it directly
    // Build a minimal payload to generate the prompt
    const payload = buildStudentPayloadForPrompt(examId, matricola, exam, studentRow);
    const prompt = generateStudyAdvicePrompt(payload);
    console.log(`[study-advice-prompt-admin] Prompt generated, length: ${prompt.length}`);
    res.json({ prompt });
  } catch (err) {
    console.error(`[study-advice-prompt-admin] Error:`, err);
    res.status(500).json({ error: err.message || "Errore generazione prompt" });
  }
});

const buildStudentPayloadForPrompt = (examId, matricola, exam, studentRow) => {
  const mapping = JSON.parse(exam.mapping_json);
  const student = {
    matricola: studentRow.matricola,
    nome: studentRow.nome || "",
    cognome: studentRow.cognome || "",
    versione: studentRow.versione,
    answers: JSON.parse(studentRow.answers_json || "[]"),
    overrides: JSON.parse(studentRow.overrides_json || "[]"),
  };

  const allStudents = db
    .prepare(
      `SELECT ess.versione, ess.answers_json, ess.overrides_json
         FROM exam_sessions es
         JOIN exam_session_students ess ON ess.session_id = es.id
        WHERE es.exam_id = ?`
    )
    .all(examId)
    .map((row) => ({
      versione: row.versione,
      answers: JSON.parse(row.answers_json || "[]"),
      overrides: JSON.parse(row.overrides_json || "[]"),
    }));

  const scores = allStudents
    .map((s) => gradeStudent(s, mapping))
    .filter((val) => val !== null);
  const maxPoints = getMaxPoints(mapping);
  const rawGrade = Math.round(((gradeStudent(student, mapping) || 0) / maxPoints) * 300) / 10;
  const grades = scores.map((points) => (maxPoints ? (points / maxPoints) * 30 : 0));
  const top = grades.length ? Math.max(...grades) : null;
  const factor = top && top > 0 ? 30 / top : null;
  const normalizedGrade = factor
    ? Math.round(rawGrade * factor)
    : Math.round(rawGrade);

  const questionRows = db
    .prepare(
      `SELECT eq.position, q.id, q.text, q.type
         FROM exam_questions eq
         JOIN questions q ON q.id = eq.question_id
        WHERE eq.exam_id = ?
        ORDER BY eq.position`
    )
    .all(examId);
  const questions = questionRows.map((row) => {
    const answers = db
      .prepare(
        "SELECT position, text, is_correct FROM answers WHERE question_id = ? ORDER BY position"
      )
      .all(row.id)
      .map((ans) => ({
        position: ans.position,
        text: ans.text,
        isCorrect: Boolean(ans.is_correct),
      }));
    const topics = db
      .prepare(
        `SELECT t.name
           FROM question_topics qt
           JOIN topics t ON t.id = qt.topic_id
          WHERE qt.question_id = ?
          ORDER BY t.name`
      )
      .all(row.id)
      .map((t) => t.name);
    return {
      id: row.id,
      position: row.position,
      text: row.text,
      type: row.type,
      answers,
      topics,
    };
  });

  const qdict = mapping.questiondictionary[student.versione - 1];
  const adict = mapping.randomizedanswersdictionary[student.versione - 1];
  const displayedToOriginal = [];
  qdict.forEach((displayed, original) => {
    displayedToOriginal[displayed - 1] = original;
  });

  const displayedQuestions = displayedToOriginal.map((originalIndex, displayedIndex) => {
    const q = questions[originalIndex];
    const order = adict[originalIndex];
    const selectedLetters = String(student.answers[displayedIndex] || "").split("");
    const orderSafe = Array.isArray(order) ? order : [];
    const correctLetters = orderSafe
      .map((originalAnswerIndex, idx) => {
        const answer = q.answers[originalAnswerIndex - 1];
        return answer?.isCorrect ? ANSWER_OPTIONS[idx] || String(idx + 1) : null;
      })
      .filter(Boolean);
    const displayedAnswers = orderSafe.map((originalAnswerIndex, idx) => {
      const answer = q.answers[originalAnswerIndex - 1];
      const letter = ANSWER_OPTIONS[idx] || String(idx + 1);
      return {
        letter,
        text: answer.text,
        isCorrect: Boolean(answer.isCorrect),
        selected: selectedLetters.includes(letter),
      };
    });
    const pointsTotal = getQuestionPoints(mapping.correctiondictionary?.[originalIndex] || []) || 0;
    const override = student.overrides?.[originalIndex];
    let pointsEarned = 0;
    let isCorrect = false;
    let isOverride = false;
    if (typeof override === "number" && Number.isFinite(override)) {
      pointsEarned = override;
      isOverride = true;
      isCorrect = false;
    } else {
      const selectedSet = selectedLetters.slice().sort().join(",");
      const correctSet = correctLetters.slice().sort().join(",");
      if (selectedSet && selectedSet === correctSet) {
        pointsEarned = pointsTotal;
        isCorrect = true;
      }
    }
    return {
      index: displayedIndex + 1,
      text: q.text,
      type: q.type,
      topics: q.topics || [],
      answers: displayedAnswers,
      selectedLetters,
      correctLetters,
      pointsTotal,
      pointsEarned,
      isCorrect,
      isOverride,
    };
  });

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      date: exam.date || "",
      courseName: exam.course_name,
    },
    student: {
      matricola: student.matricola,
      nome: student.nome,
      cognome: student.cognome,
      versione: student.versione,
    },
    grade: {
      raw: rawGrade,
      normalized: normalizedGrade,
      maxPoints,
    },
    questions: displayedQuestions,
  };
};

const generateStudyAdvicePrompt = (payload) => {
  const { student, exam, grade, questions } = payload;

  // Calculate statistics
  const totalQuestions = questions.length;
  const correctAnswers = questions.filter(q => q.isCorrect).length;
  const wrongAnswers = totalQuestions - correctAnswers;

  // Group questions by topic for summary
  const topicPerformance = {};
  questions.forEach(q => {
    const topics = (q.topics && q.topics.length > 0) ? q.topics : ["Generale"];
    topics.forEach(topic => {
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { correct: 0, wrong: 0 };
      }
      if (q.isCorrect) {
        topicPerformance[topic].correct++;
      } else {
        topicPerformance[topic].wrong++;
      }
    });
  });

  const topicSummary = Object.entries(topicPerformance).map(([topic, perf]) => {
    const total = perf.correct + perf.wrong;
    const successRate = total > 0 ? Math.round((perf.correct / total) * 100) : 0;
    return `- ${topic}: ${perf.correct}/${total} corrette (${successRate}%)`;
  }).join('\n');

  // Detailed question breakdown
  const questionDetails = questions.map((q, idx) => {
    const topicsList = (q.topics && q.topics.length > 0) ? q.topics.join(', ') : 'Generale';
    const status = q.isCorrect ? '✓ CORRETTA' : '✗ ERRATA';
    const statusNote = q.isOverride ? ' (punteggio manuale)' : '';

    let detail = `\n### Domanda ${idx + 1} [${status}${statusNote}]\n`;
    detail += `**Argomento**: ${topicsList}\n`;
    detail += `**Punti**: ${q.pointsEarned}/${q.pointsTotal}\n\n`;
    detail += `**Testo domanda**:\n${q.text}\n\n`;
    detail += `**Opzioni di risposta**:\n`;

    q.answers.forEach(ans => {
      const marker = ans.isCorrect ? '[CORRETTA]' : '';
      const selected = ans.selected ? '← SELEZIONATA' : '';
      detail += `${ans.letter}. ${ans.text} ${marker} ${selected}\n`;
    });

    detail += `\n**Risposta dello studente**: ${q.selectedLetters.length > 0 ? q.selectedLetters.join(', ') : 'Nessuna risposta'}\n`;
    detail += `**Risposta corretta**: ${q.correctLetters.join(', ')}\n`;

    return detail;
  }).join('\n---\n');

  const successPercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  const prompt = `Sei un assistente educativo del Politecnico di Bari. Il tuo compito è fornire consigli di studio personalizzati a uno studente basandoti sui risultati del suo esame.

## CONTESTO ESAME
- Corso: ${exam.courseName}
- Esame: ${exam.title}
- Data: ${exam.date || 'N/A'}
- Studente: ${student.nome} ${student.cognome}

## PERFORMANCE GENERALE
- Voto: ${grade.normalized}/30
- Risposte corrette: ${correctAnswers}/${totalQuestions} (${successPercentage}%)
- Risposte errate: ${wrongAnswers}/${totalQuestions}

## PERFORMANCE PER ARGOMENTO (Sommario)
${topicSummary}

## DETTAGLIO DOMANDE ED RISPOSTE
${questionDetails}

## RICHIESTA
Analizza attentamente tutte le domande sopra riportate (sia corrette che errate) e fornisci consigli di studio personalizzati seguendo queste linee guida:

1. **Analisi delle lacune**: Basandoti sulle domande sbagliate, identifica i 2-3 concetti/argomenti dove lo studente ha più difficoltà
2. **Priorità di studio**: Ordina gli argomenti per importanza/urgenza di ripasso
3. **Consigli specifici**: Per ogni argomento critico:
   - Cosa rivedere (concetti specifici, formule, teoremi menzionati nelle domande)
   - Come studiare (esercizi simili, ripasso teoria, esempi pratici)
   - Risorse consigliate (capitoli del libro, video, esercizi mirati)
4. **Punti di forza**: Menziona brevemente cosa lo studente ha fatto bene guardando le domande corrette
5. **Piano d'azione**: Suggerisci un ordine di studio pratico e concreto

Sii:
- Costruttivo ed incoraggiante
- Specifico e concreto facendo riferimento alle domande vere dell'esame
- Onesto sulle aree da migliorare
- Completo ma conciso (max 500 parole)

Rispondi in italiano in tono professionale ma amichevole.`;

  return prompt;
};

const generateTeachingImprovementPrompt = (examId) => {
  // Get exam info
  const exam = db
    .prepare(
      `SELECT e.id, e.title, e.date, e.mapping_json,
              c.name AS course_name
         FROM exams e
         JOIN courses c ON c.id = e.course_id
        WHERE e.id = ?`
    )
    .get(examId);

  if (!exam || !exam.mapping_json) {
    throw new Error("Traccia non trovata o mapping non disponibile");
  }

  const mapping = JSON.parse(exam.mapping_json);

  // Verify mapping has necessary fields
  if (!mapping.questiondictionary || !mapping.randomizedanswersdictionary) {
    throw new Error("Mapping dell'esame non completo o non valido");
  }

  // Get all students who took the exam
  const allStudents = db
    .prepare(
      `SELECT ess.matricola, ess.nome, ess.cognome, ess.versione, ess.answers_json, ess.overrides_json
         FROM exam_sessions es
         JOIN exam_session_students ess ON ess.session_id = es.id
        WHERE es.exam_id = ?`
    )
    .all(examId)
    .map((row) => ({
      matricola: row.matricola,
      nome: row.nome || "",
      cognome: row.cognome || "",
      versione: row.versione,
      answers: JSON.parse(row.answers_json || "[]"),
      overrides: JSON.parse(row.overrides_json || "[]"),
    }))
    .filter((student) => {
      // Exclude students without any answers (absent students)
      const hasAnswers = student.answers && student.answers.some(a => a && String(a).trim() !== "");
      const hasOverrides = student.overrides && Object.keys(student.overrides).some(k => student.overrides[k] !== null && student.overrides[k] !== undefined);
      return hasAnswers || hasOverrides;
    });

  if (allStudents.length === 0) {
    throw new Error("Nessuno studente ha completato l'esame");
  }

  // Get all questions
  const questionRows = db
    .prepare(
      `SELECT eq.position, q.id, q.text, q.type
         FROM exam_questions eq
         JOIN questions q ON q.id = eq.question_id
        WHERE eq.exam_id = ?
        ORDER BY eq.position`
    )
    .all(examId);

  const questions = questionRows.map((row) => {
    const answers = db
      .prepare(
        "SELECT position, text, is_correct FROM answers WHERE question_id = ? ORDER BY position"
      )
      .all(row.id)
      .map((ans) => ({
        position: ans.position,
        text: ans.text,
        isCorrect: Boolean(ans.is_correct),
      }));
    const topics = db
      .prepare(
        `SELECT t.name
           FROM question_topics qt
           JOIN topics t ON t.id = qt.topic_id
          WHERE qt.question_id = ?
          ORDER BY t.name`
      )
      .all(row.id)
      .map((t) => t.name);
    return {
      id: row.id,
      position: row.position,
      text: row.text,
      type: row.type,
      answers,
      topics: topics.length > 0 ? topics : ["Generale"],
    };
  });

  // Calculate statistics per question
  const maxPoints = getMaxPoints(mapping);
  const questionStats = questions.map((q, originalIndex) => {
    let totalAttempts = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    allStudents.forEach((student) => {
      const qdict = mapping.questiondictionary?.[student.versione - 1];
      const adict = mapping.randomizedanswersdictionary?.[student.versione - 1];

      // Skip if student has invalid version or mapping is missing
      if (!qdict || !Array.isArray(qdict) || !adict || !Array.isArray(adict)) {
        return;
      }

      const displayedToOriginal = [];
      qdict.forEach((displayed, original) => {
        displayedToOriginal[displayed - 1] = original;
      });

      const displayedIndex = displayedToOriginal.indexOf(originalIndex);
      if (displayedIndex === -1) return;

      totalAttempts++;

      const order = adict[originalIndex];
      const selectedLetters = String(student.answers[displayedIndex] || "").split("");
      const orderSafe = Array.isArray(order) ? order : [];
      const correctLetters = orderSafe
        .map((originalAnswerIndex, idx) => {
          const answer = q.answers[originalAnswerIndex - 1];
          return answer?.isCorrect ? ANSWER_OPTIONS[idx] || String(idx + 1) : null;
        })
        .filter(Boolean);

      const pointsTotal = getQuestionPoints(mapping.correctiondictionary?.[originalIndex] || []) || 0;
      const override = student.overrides?.[originalIndex];
      let pointsEarned = 0;
      let isCorrect = false;

      if (typeof override === "number" && Number.isFinite(override)) {
        pointsEarned = override;
      } else {
        const selectedSet = selectedLetters.slice().sort().join(",");
        const correctSet = correctLetters.slice().sort().join(",");
        if (selectedSet && selectedSet === correctSet) {
          pointsEarned = pointsTotal;
          isCorrect = true;
        }
      }

      totalPoints += pointsTotal;
      earnedPoints += pointsEarned;

      if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const successRate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

    return {
      index: originalIndex + 1,
      text: q.text,
      type: q.type,
      topics: q.topics,
      answers: q.answers,
      totalAttempts,
      correctCount,
      wrongCount,
      successRate,
      avgPoints: totalAttempts > 0 ? (earnedPoints / totalAttempts).toFixed(2) : 0,
      maxPoints: totalAttempts > 0 ? (totalPoints / totalAttempts).toFixed(2) : 0,
    };
  });

  // Calculate overall statistics
  const totalStudents = allStudents.length;
  const grades = allStudents.map((s) => {
    const score = gradeStudent(s, mapping) || 0;
    return maxPoints ? (score / maxPoints) * 30 : 0;
  });
  const avgGrade = grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : 0;
  const minGrade = grades.length > 0 ? Math.min(...grades).toFixed(1) : 0;
  const maxGrade = grades.length > 0 ? Math.max(...grades).toFixed(1) : 0;

  // Calculate topic performance
  const topicPerformance = {};
  questionStats.forEach((qstat) => {
    qstat.topics.forEach((topic) => {
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = {
          questionsCount: 0,
          totalSuccessRate: 0,
          questions: [],
        };
      }
      topicPerformance[topic].questionsCount++;
      topicPerformance[topic].totalSuccessRate += qstat.successRate;
      topicPerformance[topic].questions.push({
        index: qstat.index,
        text: qstat.text.substring(0, 80) + "...",
        successRate: qstat.successRate,
      });
    });
  });

  const topicSummary = Object.entries(topicPerformance)
    .map(([topic, data]) => {
      const avgSuccess = Math.round(data.totalSuccessRate / data.questionsCount);
      return { topic, avgSuccess, questionsCount: data.questionsCount, data };
    })
    .sort((a, b) => a.avgSuccess - b.avgSuccess);

  // Generate the prompt
  const topicSummaryText = topicSummary
    .map((t) => `- ${t.topic}: ${t.avgSuccess}% di risposte corrette (${t.questionsCount} domande)`)
    .join("\n");

  const problematicQuestions = questionStats
    .filter((q) => q.successRate < 60)
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, 10);

  const problematicQuestionsText = problematicQuestions
    .map((q) => {
      const topicsList = q.topics.join(", ");
      let detail = `\n### Domanda ${q.index} [${q.successRate}% di successo]\n`;
      detail += `**Argomento**: ${topicsList}\n`;
      detail += `**Statistiche**: ${q.correctCount}/${q.totalAttempts} corrette, ${q.wrongCount} errate\n`;
      detail += `**Punti medi**: ${q.avgPoints}/${q.maxPoints}\n\n`;
      detail += `**Testo domanda**:\n${q.text}\n\n`;
      detail += `**Opzioni di risposta**:\n`;
      q.answers.forEach((ans, idx) => {
        const marker = ans.isCorrect ? "[CORRETTA]" : "";
        detail += `${ANSWER_OPTIONS[idx] || idx + 1}. ${ans.text} ${marker}\n`;
      });
      return detail;
    })
    .join("\n---\n");

  const prompt = `Sei un consulente pedagogico esperto del Politecnico di Bari. Il tuo compito è fornire consigli al professore su come migliorare l'insegnamento basandoti sui risultati complessivi dell'esame.

## CONTESTO ESAME
- Corso: ${exam.course_name}
- Esame: ${exam.title}
- Data: ${exam.date || "N/A"}
- Numero studenti: ${totalStudents}

## STATISTICHE GENERALI
- Voto medio: ${avgGrade}/30
- Voto minimo: ${minGrade}/30
- Voto massimo: ${maxGrade}/30
- Numero domande: ${questions.length}

## PERFORMANCE PER ARGOMENTO
${topicSummaryText}

## DOMANDE PIÙ PROBLEMATICHE
${problematicQuestionsText}

## RICHIESTA
Analizza attentamente i dati sopra riportati e fornisci consigli al professore seguendo queste linee guida:

1. **Analisi critica**: Identifica i 2-3 argomenti dove la classe ha avuto le maggiori difficoltà
2. **Cause possibili**: Suggerisci possibili motivi per cui gli studenti hanno faticato su questi argomenti:
   - Concetti troppo astratti senza esempi pratici?
   - Insufficiente tempo dedicato in aula?
   - Prerequisiti non consolidati?
   - Formulazione delle domande poco chiara?
3. **Strategie didattiche**: Per ogni argomento critico, proponi strategie concrete:
   - Metodi di insegnamento alternativi
   - Esercitazioni pratiche mirate
   - Materiali didattici supplementari
   - Approcci per rendere i concetti più accessibili
4. **Punti di forza**: Evidenzia gli argomenti dove la classe ha performato bene
5. **Raccomandazioni per il prossimo anno**:
   - Modifiche al programma o all'ordine degli argomenti
   - Più tempo su certi topic
   - Nuove modalità di valutazione

Sii:
- Costruttivo e orientato alle soluzioni
- Specifico riferendoti ai dati reali dell'esame
- Onesto nell'identificare aree critiche
- Pratico con suggerimenti attuabili
- Conciso ma completo (max 600 parole)

Rispondi in italiano in tono professionale e rispettoso.`;

  return prompt;
};

router.post("/api/teaching-improvement-prompt", requireAuth, (req, res) => {
  const examId = Number(req.body.examId);
  console.log(`[teaching-improvement-prompt] Request: examId=${examId}`);

  try {
    const prompt = generateTeachingImprovementPrompt(examId);
    console.log(`[teaching-improvement-prompt] Prompt generated, length: ${prompt.length}`);
    res.json({ prompt });
  } catch (err) {
    console.error(`[teaching-improvement-prompt] Error:`, err);
    res.status(500).json({ error: err.message || "Errore generazione prompt" });
  }
});

const extractListBlock = (text, key) => {
  const marker = `${key}=list(`;
  const start = text.indexOf(marker);
  if (start === -1) throw new Error(`Missing ${key}`);
  let idx = start + marker.length;
  let depth = 1;
  while (idx < text.length && depth > 0) {
    const ch = text[idx];
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    idx += 1;
  }
  return text.slice(start + key.length + 1, idx);
};

const toJsonArray = (expr) => {
  const normalized = expr.replace(/\s+/g, "");
  const jsonish = normalized
    .replace(/list\(/g, "[")
    .replace(/c\(/g, "[")
    .replace(/\)/g, "]");
  return JSON.parse(jsonish);
};

const extractNumber = (text, key) => {
  const match = text.match(new RegExp(`${key}\\s*=\\s*(\\d+)`));
  if (!match) throw new Error(`Missing ${key}`);
  return Number(match[1]);
};

const sanitizeFileBase = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const detectExtension = (originalName, dataBase64) => {
  const ext = path.extname(originalName || "").toLowerCase();
  if (ext) return ext;
  const match = String(dataBase64 || "").match(/^data:([^;]+);base64,/);
  if (!match) return "";
  const mime = match[1];
  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
  };
  return map[mime] || "";
};

const canThumbnailExtension = (ext) => [".pdf", ".ps", ".eps"].includes(ext);

const generateThumbnail = (inputPath, destDir, baseName, ext = "") => {
  const thumbName = `${baseName}-thumb.png`;
  const thumbPath = path.join(destDir, thumbName);
  const cropFlags = [];
  if (ext === ".pdf") {
    cropFlags.push("-dUseCropBox");
  } else if (ext === ".eps" || ext === ".ps") {
    cropFlags.push("-dEPSCrop");
  }
  const args = [
    "-dSAFER",
    "-dBATCH",
    "-dNOPAUSE",
    "-sDEVICE=pngalpha",
    "-r150",
    "-dFirstPage=1",
    "-dLastPage=1",
    ...cropFlags,
    `-sOutputFile=${thumbPath}`,
    inputPath,
  ];
  const result = spawnSync("gs", args, { stdio: "ignore" });
  if (result.status === 0 && fs.existsSync(thumbPath)) {
    return thumbPath;
  }
  if (fs.existsSync(thumbPath)) {
    fs.unlinkSync(thumbPath);
  }
  return null;
};

const stripDataUrl = (dataBase64) => {
  const parts = String(dataBase64 || "").split(",");
  return parts.length > 1 ? parts[1] : parts[0];
};

const convertRtoMapping = (text) => {
  const qblock = extractListBlock(text, "questiondictionary");
  const ablock = extractListBlock(text, "randomizedanswersdictionary");
  const cblock = extractListBlock(text, "correctiondictionary");

  const questiondictionary = toJsonArray(qblock);
  const randomizedanswersdictionary = toJsonArray(ablock);
  const correctiondictionary = toJsonArray(cblock);

  const Nversions = extractNumber(text, "Nversions");
  const Nquestions = extractNumber(text, "Nquestions");
  const nanswersMatch = text.match(/Nanswers\s*=\s*c\(([^)]*)\)/);
  if (!nanswersMatch) throw new Error("Missing Nanswers");
  const Nanswers = toJsonArray(`c(${nanswersMatch[1]})`);

  return {
    Nversions,
    Nquestions,
    Nanswers,
    questiondictionary,
    randomizedanswersdictionary,
    correctiondictionary,
  };
};

const collectLatexAssets = (latex) => {
  const assets = new Set();
  const includeRe = /\\includegraphics(?:\[[^\]]*\])?{([^}]+)}/g;
  let match = includeRe.exec(latex);
  while (match) {
    assets.add(match[1]);
    match = includeRe.exec(latex);
  }
  const logoMatch = latex.match(/\\newcommand\{\\examlogo\}\{([^}]+)\}/);
  if (logoMatch && logoMatch[1]) assets.add(logoMatch[1]);
  return Array.from(assets);
};

const copyLatexAssets = (assets, destDir) => {
  assets.forEach((asset) => {
    const clean = asset.trim();
    if (!clean) return;
    const src = path.isAbsolute(clean) ? clean : path.join(__dirname, clean);
    if (!fs.existsSync(src)) return;
    const dest = path.join(destDir, clean);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  });
};

const runPdflatex = (outputDir, jobName, texArg, cwd = outputDir) =>
  new Promise((resolve) => {
    const args = [
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-output-directory",
      outputDir,
      "-jobname",
      jobName,
      texArg,
    ];
    const pdflatex = spawn("pdflatex", args, { cwd });
    let stdout = "";
    let stderr = "";
    pdflatex.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    pdflatex.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    pdflatex.on("close", (code) => {
      const logPath = path.join(cwd, `${jobName}.log`);
      const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
      resolve({
        ok: code === 0,
        stdout,
        stderr,
        log,
      });
    });
  });

const TRACE_JOB_TTL_MS = 60 * 60 * 1000;
const traceJobs = new Map();

const emitTraceJob = (jobId, event, payload) => {
  io.to(jobId).emit(event, payload);
};

const cleanupTraceJob = (jobId) => {
  const job = traceJobs.get(jobId);
  if (!job) return;
  if (job.tmpDir && fs.existsSync(job.tmpDir)) {
    try {
      fs.rmSync(job.tmpDir, { recursive: true, force: true });
    } catch {}
  }
  traceJobs.delete(jobId);
};

io.on("connection", (socket) => {
  socket.on("job:join", (jobId) => {
    if (jobId) socket.join(jobId);
  });
});

const mergePdfs = async (outputPath, inputPaths) => {
  if (!inputPaths.length) return { ok: false, error: "Nessun PDF da unire" };
  const tryPdfunite = () =>
    new Promise((resolve) => {
      const proc = spawn("pdfunite", [...inputPaths, outputPath]);
      proc.on("close", (code) => resolve(code === 0));
      proc.on("error", () => resolve(false));
    });
  const tryGhostscript = () =>
    new Promise((resolve) => {
      const args = [
        "-dBATCH",
        "-dNOPAUSE",
        "-sDEVICE=pdfwrite",
        `-sOutputFile=${outputPath}`,
        ...inputPaths,
      ];
      const proc = spawn("gs", args);
      proc.on("close", (code) => resolve(code === 0));
      proc.on("error", () => resolve(false));
    });
  if (await tryPdfunite()) return { ok: true };
  if (await tryGhostscript()) return { ok: true };
  return { ok: false, error: "pdfunite/gs non disponibili per unire i PDF" };
};

router.post("/api/mapping", (req, res) => {
  try {
    const mapping = convertRtoMapping(req.body || "");
    res.json(mapping);
  } catch (err) {
    res.status(400).json({ error: err.message || "Invalid R file" });
  }
});

router.get("/api/courses", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.code,
              EXISTS (SELECT 1 FROM exams e WHERE e.course_id = c.id LIMIT 1) AS has_exams,
              EXISTS (SELECT 1 FROM topics t WHERE t.course_id = c.id LIMIT 1) AS has_topics,
              EXISTS (SELECT 1 FROM images i WHERE i.course_id = c.id LIMIT 1) AS has_images
         FROM courses c
        ORDER BY c.name`
    )
    .all();

  const exams = db
    .prepare("SELECT id, course_id, mapping_json FROM exams")
    .all()
    .map((row) => ({
      id: row.id,
      courseId: row.course_id,
      mappingJson: row.mapping_json,
    }));
  const students = db
    .prepare(
      `SELECT es.exam_id, ess.versione, ess.answers_json, ess.overrides_json
         FROM exam_sessions es
         JOIN exam_session_students ess ON ess.session_id = es.id`
    )
    .all();

  const byExam = new Map();
  students.forEach((row) => {
    if (!byExam.has(row.exam_id)) byExam.set(row.exam_id, []);
    byExam.get(row.exam_id).push({
      versione: row.versione,
      answers: JSON.parse(row.answers_json || "[]"),
      overrides: JSON.parse(row.overrides_json || "[]"),
    });
  });

  const courseStats = new Map();
  exams.forEach((exam) => {
    if (!courseStats.has(exam.courseId)) {
      courseStats.set(exam.courseId, {
        examsCount: 0,
        studentsCount: 0,
        normalizedSum: 0,
      });
    }
    const stats = courseStats.get(exam.courseId);
    stats.examsCount += 1;
    if (!exam.mappingJson) return;
    let mapping;
    try {
      mapping = JSON.parse(exam.mappingJson);
    } catch {
      return;
    }
    const examStudents = byExam.get(exam.id) || [];
    const scores = examStudents
      .map((student) => gradeStudent(student, mapping))
      .filter((val) => val !== null);
    if (!scores.length) return;
    const maxPoints = getMaxPoints(mapping);
    const grades = scores.map((points) => (maxPoints ? (points / maxPoints) * 30 : 0));
    const top = Math.max(...grades);
    const factor = top > 0 ? 30 / top : null;
    const normalized = grades.map((grade) => Math.round((factor ? grade * factor : grade)));
    const avg =
      normalized.reduce((sum, val) => sum + val, 0) / normalized.length;
    stats.studentsCount += normalized.length;
    stats.normalizedSum += avg * normalized.length;
  });

  res.json({
    courses: rows.map((row) => {
      const stats = courseStats.get(row.id) || {
        examsCount: 0,
        studentsCount: 0,
        normalizedSum: 0,
      };
      const avgNormalized =
        stats.studentsCount > 0
          ? Math.round((stats.normalizedSum / stats.studentsCount) * 10) / 10
          : null;
      return {
        ...row,
        has_exams: Boolean(row.has_exams),
        has_topics: Boolean(row.has_topics),
        has_images: Boolean(row.has_images),
        exams_count: stats.examsCount,
        students_count: stats.studentsCount,
        avg_normalized: avgNormalized,
      };
    }),
  });
});

router.post("/api/courses", requireRole("admin"), (req, res) => {
  const payload = req.body || {};
  const name = String(payload.name || "").trim();
  const code = String(payload.code || "").trim();
  if (!name) {
    res.status(400).json({ error: "Nome corso mancante" });
    return;
  }
  const existing = db.prepare("SELECT id, name, code FROM courses WHERE name = ?").get(name);
  if (existing) {
    res.json({ course: existing });
    return;
  }
  const info = db
    .prepare("INSERT INTO courses (name, code) VALUES (?, ?)")
    .run(name, code || null);
  const course = db.prepare("SELECT id, name, code FROM courses WHERE id = ?").get(info.lastInsertRowid);
  res.json({ course });
});

router.put("/api/courses/:id", requireRole("admin"), (req, res) => {
  const courseId = Number(req.params.id);
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const payload = req.body || {};
  const name = String(payload.name || "").trim();
  const code = String(payload.code || "").trim();
  if (!name) {
    res.status(400).json({ error: "Nome corso mancante" });
    return;
  }
  const exists = db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId);
  if (!exists) {
    res.status(404).json({ error: "Corso non trovato" });
    return;
  }
  try {
    db.prepare(
      "UPDATE courses SET name = ?, code = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(name, code || null, courseId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Nome corso già esistente" });
  }
});

router.get("/api/topics", requireRole("admin", "creator"), (req, res) => {
  const courseId = Number(req.query.courseId);
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "courseId mancante" });
    return;
  }
  const rows = db
    .prepare(
      `SELECT t.id, t.name, COUNT(qt.question_id) AS question_count
         FROM topics t
         LEFT JOIN question_topics qt ON qt.topic_id = t.id
        WHERE t.course_id = ?
        GROUP BY t.id
        ORDER BY t.name`
    )
    .all(courseId);
  res.json({ topics: rows });
});

router.get("/api/shortcuts", requireRole("admin", "creator"), (req, res) => {
  const courseId = Number(req.query.courseId);
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "courseId non valido." });
    return;
  }
  const shortcuts = db
    .prepare(
      `SELECT id, course_id AS courseId, label, snippet, created_at AS createdAt, updated_at AS updatedAt
         FROM course_shortcuts
        WHERE course_id = ?
        ORDER BY label COLLATE NOCASE`
    )
    .all(courseId);
  res.json({ shortcuts });
});

router.post("/api/shortcuts", requireRole("admin"), (req, res) => {
  const courseId = Number(req.body?.courseId);
  const label = String(req.body?.label || "").trim();
  const snippet = String(req.body?.snippet || "").trim();
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "Corso non valido." });
    return;
  }
  if (!label || !snippet) {
    res.status(400).json({ error: "Label e testo sono obbligatori." });
    return;
  }
  try {
    const result = db
      .prepare(
        `INSERT INTO course_shortcuts (course_id, label, snippet)
         VALUES (?, ?, ?)`
      )
      .run(courseId, label, snippet);
    const shortcut = db
      .prepare(
        `SELECT id, course_id AS courseId, label, snippet, created_at AS createdAt, updated_at AS updatedAt
           FROM course_shortcuts
          WHERE id = ?`
      )
      .get(result.lastInsertRowid);
    res.status(201).json({ shortcut });
  } catch (err) {
    if (String(err.message || "").includes("UNIQUE")) {
      res.status(400).json({ error: "Esiste già una scorciatoia con questa descrizione." });
      return;
    }
    res.status(500).json({ error: "Errore creazione scorciatoia." });
  }
});

router.put("/api/shortcuts/:id", requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  const courseId = Number(req.body?.courseId);
  const label = String(req.body?.label || "").trim();
  const snippet = String(req.body?.snippet || "").trim();
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido." });
    return;
  }
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "Corso non valido." });
    return;
  }
  if (!label || !snippet) {
    res.status(400).json({ error: "Label e testo sono obbligatori." });
    return;
  }
  try {
    const updated = db
      .prepare(
        `UPDATE course_shortcuts
            SET course_id = ?, label = ?, snippet = ?, updated_at = datetime('now')
          WHERE id = ?`
      )
      .run(courseId, label, snippet, id);
    if (updated.changes === 0) {
      res.status(404).json({ error: "Scorciatoia non trovata." });
      return;
    }
    const shortcut = db
      .prepare(
        `SELECT id, course_id AS courseId, label, snippet, created_at AS createdAt, updated_at AS updatedAt
           FROM course_shortcuts
          WHERE id = ?`
      )
      .get(id);
    res.json({ shortcut });
  } catch (err) {
    if (String(err.message || "").includes("UNIQUE")) {
      res.status(400).json({ error: "Esiste già una scorciatoia con questa descrizione." });
      return;
    }
    res.status(500).json({ error: "Errore aggiornamento scorciatoia." });
  }
});

router.delete("/api/shortcuts/:id", requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido." });
    return;
  }
  const result = db.prepare("DELETE FROM course_shortcuts WHERE id = ?").run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Scorciatoia non trovata." });
    return;
  }
  res.json({ ok: true });
});

router.post("/api/topics", requireRole("admin"), (req, res) => {
  const payload = req.body || {};
  const courseId = Number(payload.courseId);
  const name = String(payload.name || "").trim();
  if (!Number.isFinite(courseId) || !name) {
    res.status(400).json({ error: "Payload non valido" });
    return;
  }
  const existing = db
    .prepare("SELECT id, name FROM topics WHERE course_id = ? AND name = ?")
    .get(courseId, name);
  if (existing) {
    res.json({ topic: existing });
    return;
  }
  const info = db
    .prepare("INSERT INTO topics (course_id, name) VALUES (?, ?)")
    .run(courseId, name);
  const topic = db
    .prepare("SELECT id, name FROM topics WHERE id = ?")
    .get(info.lastInsertRowid);
  res.json({ topic });
});

router.put("/api/topics/:id", requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const payload = req.body || {};
  const courseId = Number(payload.courseId);
  const name = String(payload.name || "").trim();
  if (!Number.isFinite(courseId) || !name) {
    res.status(400).json({ error: "Payload non valido" });
    return;
  }
  const exists = db.prepare("SELECT id FROM topics WHERE id = ?").get(id);
  if (!exists) {
    res.status(404).json({ error: "Argomento non trovato" });
    return;
  }
  try {
    db.prepare(
      "UPDATE topics SET course_id = ?, name = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(courseId, name, id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Argomento già esistente" });
  }
});

router.delete("/api/topics/:id", requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const used = db
    .prepare("SELECT 1 FROM question_topics WHERE topic_id = ? LIMIT 1")
    .get(id);
  if (used) {
    res.status(400).json({ error: "Argomento in uso da una domanda" });
    return;
  }
  db.prepare("DELETE FROM topics WHERE id = ?").run(id);
  res.json({ ok: true });
});

router.get("/api/images", requireRole("admin", "creator"), (req, res) => {
  const courseId = Number(req.query.courseId);
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "courseId mancante" });
    return;
  }
  const rows = db
    .prepare(
      `SELECT id, name, description, original_name, file_path, mime_type,
              thumbnail_path,
              source_name, source_path, source_mime_type
         FROM images
        WHERE course_id = ?
        ORDER BY created_at DESC`
    )
    .all(courseId);
  const updatedRows = rows.map((row) => {
    if (!row.thumbnail_path) {
      const ext = path.extname(row.file_path || "").toLowerCase();
      if (canThumbnailExtension(ext)) {
        const absPath = path.join(__dirname, row.file_path);
        if (fs.existsSync(absPath)) {
          const baseName = path.parse(absPath).name;
          const destDir = path.dirname(absPath);
          const thumbAbs = generateThumbnail(absPath, destDir, baseName, ext);
          if (thumbAbs) {
            const thumbRel = path.relative(__dirname, thumbAbs).replace(/\\/g, "/");
            db.prepare(
              "UPDATE images SET thumbnail_path = ?, updated_at = datetime('now') WHERE id = ?"
            ).run(thumbRel, row.id);
            return { ...row, thumbnail_path: thumbRel };
          }
        }
      }
    }
    return row;
  });
  res.json({ images: updatedRows });
});

router.post("/api/images", requireRole("admin", "creator"), (req, res) => {
  const payload = req.body || {};
  const courseId = Number(payload.courseId);
  const name = String(payload.name || "").trim();
  const description = String(payload.description || "").trim();
  const originalName = String(payload.originalName || "").trim();
  const dataBase64 = String(payload.dataBase64 || "").trim();
  const sourceOriginalName = String(payload.sourceOriginalName || "").trim();
  const sourceBase64 = String(payload.sourceBase64 || "").trim();
  if (!Number.isFinite(courseId) || !dataBase64) {
    res.status(400).json({ error: "Payload non valido" });
    return;
  }
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId);
  if (!course) {
    res.status(404).json({ error: "Corso non trovato" });
    return;
  }
  const ext = detectExtension(originalName, dataBase64);
  if (!ext) {
    res.status(400).json({ error: "Estensione file non valida" });
    return;
  }
  const base = sanitizeFileBase(name || originalName || "immagine");
  const fileName = `${Date.now()}-${base || "immagine"}${ext}`;
  const destDir = path.join(IMAGE_DIR, String(courseId));
  fs.mkdirSync(destDir, { recursive: true });
  const filePath = path.join(destDir, fileName);
  const buffer = Buffer.from(stripDataUrl(dataBase64), "base64");
  fs.writeFileSync(filePath, buffer);
  const relPath = path.relative(__dirname, filePath).replace(/\\/g, "/");
  const baseName = path.parse(fileName).name;
  const thumbnailAbs = canThumbnailExtension(ext)
    ? generateThumbnail(filePath, destDir, baseName, ext)
    : null;
  const thumbnailRel = thumbnailAbs
    ? path.relative(__dirname, thumbnailAbs).replace(/\\/g, "/")
    : null;
  let sourceRelPath = null;
  if (sourceBase64) {
    const sourceExt =
      detectExtension(sourceOriginalName, sourceBase64) || ".bin";
    const sourceName = `${Date.now()}-${base || "immagine"}-source${sourceExt}`;
    const sourcePath = path.join(destDir, sourceName);
    const sourceBuffer = Buffer.from(stripDataUrl(sourceBase64), "base64");
    fs.writeFileSync(sourcePath, sourceBuffer);
    sourceRelPath = path.relative(__dirname, sourcePath).replace(/\\/g, "/");
  }
  const info = db
    .prepare(
      `INSERT INTO images (
        course_id,
        name,
        description,
        original_name,
        file_path,
        mime_type,
        thumbnail_path,
        source_name,
        source_path,
        source_mime_type
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      courseId,
      name || originalName || fileName,
      description || null,
      originalName || null,
      relPath,
      String(payload.mimeType || "") || null,
      thumbnailRel,
      sourceOriginalName || null,
      sourceRelPath,
      String(payload.sourceMimeType || "") || null
    );
  const image = db
    .prepare(
      `SELECT id, name, description, original_name, file_path, mime_type,
              thumbnail_path,
              source_name, source_path, source_mime_type
         FROM images WHERE id = ?`
    )
    .get(info.lastInsertRowid);
  res.json({ image });
});

router.delete("/api/images/:id", requireRole("admin", "creator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const image = db
    .prepare("SELECT id, file_path, source_path, thumbnail_path FROM images WHERE id = ?")
    .get(id);
  if (!image) {
    res.status(404).json({ error: "Immagine non trovata" });
    return;
  }
  const used = db
    .prepare("SELECT 1 FROM questions WHERE image_path = ? LIMIT 1")
    .get(image.file_path);
  if (used) {
    res.status(400).json({ error: "Immagine usata in una domanda" });
    return;
  }
  const absPath = path.join(__dirname, image.file_path);
  if (fs.existsSync(absPath)) {
    fs.unlinkSync(absPath);
  }
  if (image.thumbnail_path) {
    const thumbAbs = path.join(__dirname, image.thumbnail_path);
    if (fs.existsSync(thumbAbs)) {
      fs.unlinkSync(thumbAbs);
    }
  }
  if (image.source_path) {
    const sourceAbs = path.join(__dirname, image.source_path);
    if (fs.existsSync(sourceAbs)) {
      fs.unlinkSync(sourceAbs);
    }
  }
  db.prepare("DELETE FROM images WHERE id = ?").run(id);
  res.json({ ok: true });
});

router.post("/api/images/:id/thumbnail", requireRole("admin", "creator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const image = db
    .prepare(
      "SELECT id, file_path, thumbnail_path FROM images WHERE id = ?"
    )
    .get(id);
  if (!image) {
    res.status(404).json({ error: "Immagine non trovata" });
    return;
  }
  const absPath = path.join(__dirname, image.file_path);
  if (!fs.existsSync(absPath)) {
    res.status(404).json({ error: "File immagine non trovato" });
    return;
  }
  const ext = path.extname(absPath).toLowerCase();
  if (!canThumbnailExtension(ext)) {
    res.status(400).json({ error: "Thumbnail non supportata per questo formato" });
    return;
  }
  const baseName = path.parse(absPath).name;
  const destDir = path.dirname(absPath);
  const thumbAbs = generateThumbnail(absPath, destDir, baseName, ext);
  if (!thumbAbs) {
    res.status(500).json({ error: "Impossibile generare la thumbnail" });
    return;
  }
  const thumbRel = path.relative(__dirname, thumbAbs).replace(/\\/g, "/");
  db.prepare(
    "UPDATE images SET thumbnail_path = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(thumbRel, id);
  res.json({ thumbnail_path: thumbRel });
});

router.delete("/api/courses/:id", requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const hasTopics = db
    .prepare("SELECT 1 FROM topics WHERE course_id = ? LIMIT 1")
    .get(id);
  if (hasTopics) {
    res.status(400).json({ error: "Corso con argomenti associati" });
    return;
  }
  const hasExams = db
    .prepare("SELECT 1 FROM exams WHERE course_id = ? LIMIT 1")
    .get(id);
  if (hasExams) {
    res.status(400).json({ error: "Corso con esami associati" });
    return;
  }
  const hasImages = db
    .prepare("SELECT 1 FROM images WHERE course_id = ? LIMIT 1")
    .get(id);
  if (hasImages) {
    res.status(400).json({ error: "Corso con immagini associate" });
    return;
  }
  db.prepare("DELETE FROM courses WHERE id = ?").run(id);
  res.json({ ok: true });
});

router.get("/api/questions", requireRole("admin", "creator"), (req, res) => {
  const courseId = Number(req.query.courseId);
  const topicId = Number(req.query.topicId);
  const search = String(req.query.search || "").trim();
  const unusedOnly = String(req.query.unusedOnly || "") === "1";
  const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
  const params = [];
  const where = [];
  if (Number.isFinite(courseId)) {
    where.push("c.id = ?");
    params.push(courseId);
  }
  if (Number.isFinite(topicId)) {
    where.push("t.id = ?");
    params.push(topicId);
  }
  if (search) {
    where.push("q.text LIKE ?");
    params.push(`%${search}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const havingSql = unusedOnly ? "HAVING is_used = 0" : "";
  const stmt = db.prepare(`
    SELECT q.id, q.text, q.note, q.type, q.image_path, q.image_layout_enabled,
           q.image_layout_mode, q.image_left_width, q.image_right_width, q.image_scale,
           i.thumbnail_path AS image_thumbnail_path,
           GROUP_CONCAT(DISTINCT t.name) AS topics,
           MAX(e.date) AS last_exam_date,
           (
             SELECT e2.title
               FROM exam_questions eq2
               JOIN exams e2 ON e2.id = eq2.exam_id
              WHERE eq2.question_id = q.id
              ORDER BY e2.date DESC, e2.id DESC
              LIMIT 1
           ) AS last_exam_title,
           MAX(CASE WHEN e.id IS NOT NULL THEN 1 ELSE 0 END) AS is_used,
           MAX(CASE WHEN e.is_draft = 0 THEN 1 ELSE 0 END) AS is_locked
      FROM questions q
      LEFT JOIN question_topics qt ON qt.question_id = q.id
      LEFT JOIN topics t ON t.id = qt.topic_id
      LEFT JOIN courses c ON c.id = t.course_id
      LEFT JOIN images i ON i.file_path = q.image_path
      LEFT JOIN exam_questions eq ON eq.question_id = q.id
      LEFT JOIN exams e ON e.id = eq.exam_id
      ${whereSql}
     GROUP BY q.id
     ${havingSql}
     ORDER BY q.updated_at DESC
     LIMIT ${limit}
  `);
  const includeAnswers = String(req.query.includeAnswers || "") === "1";
  const rows = stmt.all(...params).map((row) => {
    const base = {
      ...row,
      topics: row.topics ? row.topics.split(",") : [],
      last_exam_date: row.last_exam_date || "",
      is_used: Boolean(row.is_used),
      is_locked: Boolean(row.is_locked),
      image_layout_enabled: Boolean(row.image_layout_enabled),
    };
    if (!includeAnswers) return base;
    const answers = db
      .prepare(
        "SELECT position, text, note, is_correct FROM answers WHERE question_id = ? ORDER BY position"
      )
      .all(row.id)
      .map((ans) => ({
        position: ans.position,
        text: ans.text,
        note: ans.note || "",
        isCorrect: Boolean(ans.is_correct),
      }));
    return { ...base, answers };
  });
  res.json({ questions: rows });
});

router.post("/api/questions", requireRole("admin", "creator"), (req, res) => {
  const payload = req.body || {};
  const courseId = Number(payload.courseId);
  const question = payload.question || {};
  const topics = Array.isArray(question.topics) ? question.topics : [];
  if (!Number.isFinite(courseId) || !question.text) {
    res.status(400).json({ error: "Payload non valido" });
    return;
  }
  if (!topics.length) {
    res.status(400).json({ error: "Seleziona almeno un argomento" });
    return;
  }
  const questionId = insertQuestion(question, courseId);
  res.json({ questionId });
});

router.post("/api/questions/:id/duplicate", requireRole("admin", "creator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const requestedCourseId = Number((req.body || {}).courseId);
    const question = db
    .prepare(
      `SELECT q.id, q.text, q.note, q.type, q.image_path, q.image_layout_enabled,
              q.image_layout_mode, q.image_left_width, q.image_right_width, q.image_scale,
              i.thumbnail_path AS image_thumbnail_path
         FROM questions q
         LEFT JOIN images i ON i.file_path = q.image_path
        WHERE q.id = ?`
    )
    .get(id);
  if (!question) {
    res.status(404).json({ error: "Domanda non trovata" });
    return;
  }
  const topics = db
    .prepare(
      `SELECT t.name
         FROM question_topics qt
         JOIN topics t ON t.id = qt.topic_id
        WHERE qt.question_id = ?
        ORDER BY t.name`
    )
    .all(id)
    .map((row) => row.name);
  const answers = db
    .prepare(
      "SELECT position, text, note, is_correct FROM answers WHERE question_id = ? ORDER BY position"
    )
    .all(id)
    .map((row) => ({
      text: row.text,
      note: row.note || "",
      isCorrect: Boolean(row.is_correct),
    }));
  const courseRow = db
    .prepare(
      `SELECT t.course_id
         FROM topics t
         JOIN question_topics qt ON qt.topic_id = t.id
        WHERE qt.question_id = ?
        LIMIT 1`
    )
    .get(id);
  const courseId = courseRow ? courseRow.course_id : requestedCourseId;
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "Corso non trovato per la domanda" });
    return;
  }
  const questionId = insertQuestion(
    {
      text: question.text,
      note: question.note || "",
      type: question.type,
      imagePath: question.image_path,
      imageLayoutEnabled: Boolean(question.image_layout_enabled),
      imageLayoutMode: question.image_layout_mode || "side",
      imageLeftWidth: question.image_left_width,
      imageRightWidth: question.image_right_width,
      imageScale: question.image_scale,
      answers,
      topics,
    },
    courseId
  );
  res.json({ questionId });
});

router.put("/api/questions/:id", requireRole("admin", "creator"), (req, res) => {
  const id = Number(req.params.id);
  const payload = req.body || {};
  const courseId = Number(payload.courseId);
  const question = payload.question || {};
  const topics = Array.isArray(question.topics) ? question.topics : [];
  if (!Number.isFinite(id) || !Number.isFinite(courseId) || !question.text) {
    res.status(400).json({ error: "Payload non valido" });
    return;
  }
  if (!topics.length) {
    res.status(400).json({ error: "Seleziona almeno un argomento" });
    return;
  }
  const exists = db.prepare("SELECT id FROM questions WHERE id = ?").get(id);
  if (!exists) {
    res.status(404).json({ error: "Domanda non trovata" });
    return;
  }
  if (isQuestionLocked(id)) {
    res.status(400).json({ error: "Domanda bloccata: usata in una traccia chiusa" });
    return;
  }
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE questions
          SET text = ?, note = ?, type = ?, image_path = ?, image_layout_enabled = ?,
              image_layout_mode = ?, image_left_width = ?, image_right_width = ?, image_scale = ?,
              updated_at = datetime('now')
        WHERE id = ?`
    ).run(
      question.text,
      question.note || null,
      question.type,
      question.imagePath || null,
      question.imageLayoutEnabled ? 1 : 0,
      question.imageLayoutMode || "side",
      question.imageLeftWidth || null,
      question.imageRightWidth || null,
      question.imageScale || null,
      id
    );
    db.prepare("DELETE FROM answers WHERE question_id = ?").run(id);
    db.prepare("DELETE FROM question_topics WHERE question_id = ?").run(id);
    const answers = Array.isArray(question.answers) ? question.answers : [];
    const insertAnswer = db.prepare(
      "INSERT INTO answers (question_id, position, text, note, is_correct) VALUES (?, ?, ?, ?, ?)"
    );
    answers.forEach((answer, idx) => {
      insertAnswer.run(
        id,
        idx + 1,
        answer.text || "",
        answer.note || null,
        answer.isCorrect ? 1 : 0
      );
    });
    const topics = Array.isArray(question.topics) ? question.topics : [];
    const topicIds = upsertTopics(courseId, topics);
    const insertQt = db.prepare(
      "INSERT OR IGNORE INTO question_topics (question_id, topic_id) VALUES (?, ?)"
    );
    topicIds.forEach((topicId) => insertQt.run(id, topicId));
  });
  tx();
  res.json({ questionId: id });
});

router.delete("/api/questions/:id", requireRole("admin", "creator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const used = db
    .prepare("SELECT 1 FROM exam_questions WHERE question_id = ? LIMIT 1")
    .get(id);
  if (used) {
    res.status(400).json({ error: "Domanda usata in una traccia" });
    return;
  }
  db.prepare("DELETE FROM answers WHERE question_id = ?").run(id);
  db.prepare("DELETE FROM question_topics WHERE question_id = ?").run(id);
  db.prepare("DELETE FROM questions WHERE id = ?").run(id);
  res.json({ ok: true });
});

router.get("/api/questions/:id", requireRole("admin", "creator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const question = db
    .prepare(
      `SELECT id, text, type, image_path, image_layout_enabled,
              image_layout_mode, image_left_width, image_right_width, image_scale
         FROM questions
        WHERE id = ?`
    )
    .get(id);
  if (!question) {
    res.status(404).json({ error: "Domanda non trovata" });
    return;
  }
  const answers = db
    .prepare(
      "SELECT position, text, note, is_correct FROM answers WHERE question_id = ? ORDER BY position"
    )
    .all(id)
    .map((row) => ({
      position: row.position,
      text: row.text,
      note: row.note || "",
      isCorrect: Boolean(row.is_correct),
    }));
  const topicRows = db
    .prepare(
      `SELECT t.id, t.name, t.course_id
         FROM question_topics qt
         JOIN topics t ON t.id = qt.topic_id
        WHERE qt.question_id = ?
        ORDER BY t.name`
    )
    .all(id)
    .map((row) => ({
      id: row.id,
      name: row.name,
      courseId: row.course_id,
    }));
  const courseId = topicRows.length ? topicRows[0].courseId : null;
  const topics = topicRows.map((row) => row.name);
  const topicIds = topicRows.map((row) => row.id);
  res.json({
    question: {
      id: question.id,
      courseId,
      text: question.text,
      note: question.note || "",
      type: question.type,
      imagePath: question.image_path || "",
      imageThumbnailPath: question.image_thumbnail_path || "",
      imageLayoutEnabled: Boolean(question.image_layout_enabled),
      imageLayoutMode: question.image_layout_mode || "side",
      imageLeftWidth: question.image_left_width || "",
      imageRightWidth: question.image_right_width || "",
      imageScale: question.image_scale || "",
      answers,
      topics,
      topicIds,
    },
  });
});

router.get("/api/exams", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.id, e.title, e.date, e.updated_at, e.course_id,
              e.is_draft, e.locked_at,
              e.public_access_enabled, e.public_access_expires_at,
              c.name AS course_name,
              COUNT(eq.id) AS question_count,
              EXISTS (
                SELECT 1
                  FROM exam_session_students ess
                  JOIN exam_sessions es ON es.id = ess.session_id
                 WHERE es.exam_id = e.id
                 LIMIT 1
              ) AS has_results
         FROM exams e
         JOIN courses c ON c.id = e.course_id
         LEFT JOIN exam_questions eq ON eq.exam_id = e.id
        GROUP BY e.id
        ORDER BY e.updated_at DESC`
    )
    .all();
  res.json({ exams: rows });
});

router.get("/api/multi-modules", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const courseId = Number(req.query.courseId);
  const rows = db
    .prepare(
      `SELECT mm.*,
              c1.name AS module1_name,
              c2.name AS module2_name
         FROM course_multi_modules mm
         JOIN courses c1 ON c1.id = mm.course_id_module1
         JOIN courses c2 ON c2.id = mm.course_id_module2
        WHERE (? IS NULL OR mm.course_id_module1 = ? OR mm.course_id_module2 = ?)
        ORDER BY mm.updated_at DESC`
    )
    .all(
      Number.isFinite(courseId) ? courseId : null,
      Number.isFinite(courseId) ? courseId : null,
      Number.isFinite(courseId) ? courseId : null
    );
  res.json({ multiModules: rows });
});

router.get("/api/multi-modules/:id", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const row = db
    .prepare(
      `SELECT mm.*,
              c1.name AS module1_name,
              c2.name AS module2_name
         FROM course_multi_modules mm
         JOIN courses c1 ON c1.id = mm.course_id_module1
         JOIN courses c2 ON c2.id = mm.course_id_module2
        WHERE mm.id = ?`
    )
    .get(id);
  if (!row) {
    res.status(404).json({ error: "Gruppo non trovato" });
    return;
  }
  res.json({ multiModule: row });
});

router.post("/api/multi-modules", requireRole("admin", "creator"), (req, res) => {
  const payload = req.body || {};
  const name = String(payload.name || "").trim();
  const courseIdModule1 = Number(payload.courseIdModule1);
  const courseIdModule2 = Number(payload.courseIdModule2);
  const module1MinGrade = Number(payload.module1MinGrade);
  const module2MinGrade = Number(payload.module2MinGrade);
  const weightModule1 = Number.isFinite(Number(payload.weightModule1))
    ? Number(payload.weightModule1)
    : 0.5;
  const weightModule2 = Number.isFinite(Number(payload.weightModule2))
    ? Number(payload.weightModule2)
    : 0.5;

  if (!name || !Number.isFinite(courseIdModule1) || !Number.isFinite(courseIdModule2)) {
    res.status(400).json({ error: "Dati non validi" });
    return;
  }
  if (!Number.isFinite(module1MinGrade) || !Number.isFinite(module2MinGrade)) {
    res.status(400).json({ error: "Soglie non valide" });
    return;
  }
  if (courseIdModule1 === courseIdModule2) {
    res.status(400).json({ error: "I due moduli devono essere diversi" });
    return;
  }
  const courses = db
    .prepare("SELECT id FROM courses WHERE id IN (?, ?)")
    .all(courseIdModule1, courseIdModule2);
  if (courses.length !== 2) {
    res.status(400).json({ error: "Corsi non trovati" });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO course_multi_modules
        (name, course_id_module1, course_id_module2, module1_min_grade, module2_min_grade,
         weight_module1, weight_module2, final_min_grade, rounding)
       VALUES (?, ?, ?, ?, ?, ?, ?, 18, 'ceil')`
    )
    .run(
      name,
      courseIdModule1,
      courseIdModule2,
      module1MinGrade,
      module2MinGrade,
      weightModule1,
      weightModule2
    );
  res.json({ id: info.lastInsertRowid });
});

router.patch("/api/multi-modules/:id", requireRole("admin", "creator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const payload = req.body || {};
  const current = db
    .prepare("SELECT * FROM course_multi_modules WHERE id = ?")
    .get(id);
  if (!current) {
    res.status(404).json({ error: "Gruppo non trovato" });
    return;
  }
  const name = String(payload.name || current.name).trim();
  const module1MinGrade = Number.isFinite(Number(payload.module1MinGrade))
    ? Number(payload.module1MinGrade)
    : current.module1_min_grade;
  const module2MinGrade = Number.isFinite(Number(payload.module2MinGrade))
    ? Number(payload.module2MinGrade)
    : current.module2_min_grade;
  const weightModule1 = Number.isFinite(Number(payload.weightModule1))
    ? Number(payload.weightModule1)
    : current.weight_module1;
  const weightModule2 = Number.isFinite(Number(payload.weightModule2))
    ? Number(payload.weightModule2)
    : current.weight_module2;

  db.prepare(
    `UPDATE course_multi_modules
        SET name = ?,
            module1_min_grade = ?,
            module2_min_grade = ?,
            weight_module1 = ?,
            weight_module2 = ?,
            updated_at = datetime('now')
      WHERE id = ?`
  ).run(name, module1MinGrade, module2MinGrade, weightModule1, weightModule2, id);
  res.json({ ok: true });
});

router.delete("/api/multi-modules/:id", requireRole("admin", "creator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM course_multi_module_selections WHERE multi_module_id = ?").run(id);
    db.prepare("DELETE FROM course_multi_modules WHERE id = ?").run(id);
  });
  tx();
  res.json({ ok: true });
});

router.post(
  "/api/multi-modules/:id/selection",
  requireRole("admin", "creator", "evaluator"),
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id non valido" });
      return;
    }
    const payload = req.body || {};
    const matricola = String(payload.matricola || "").trim();
    const chosen1 = Number(payload.chosenResultIdModule1);
    const chosen2 = Number(payload.chosenResultIdModule2);
    if (!matricola) {
      res.status(400).json({ error: "Matricola non valida" });
      return;
    }
    const group = db
      .prepare(
        "SELECT course_id_module1, course_id_module2 FROM course_multi_modules WHERE id = ?"
      )
      .get(id);
    if (!group) {
      res.status(404).json({ error: "Gruppo non trovato" });
      return;
    }
    const validateChoice = (resultId, courseId) => {
      if (!Number.isFinite(resultId)) return null;
      const row = db
        .prepare(
          `SELECT ess.id
             FROM exam_session_students ess
             JOIN exam_sessions es ON es.id = ess.session_id
             JOIN exams e ON e.id = es.exam_id
            WHERE ess.id = ? AND e.course_id = ?`
        )
        .get(resultId, courseId);
      return row ? resultId : null;
    };
    const safeChosen1 = validateChoice(chosen1, group.course_id_module1);
    const safeChosen2 = validateChoice(chosen2, group.course_id_module2);
    if (Number.isFinite(chosen1) && !safeChosen1) {
      res.status(400).json({ error: "Scelta modulo 1 non valida" });
      return;
    }
    if (Number.isFinite(chosen2) && !safeChosen2) {
      res.status(400).json({ error: "Scelta modulo 2 non valida" });
      return;
    }
    db.prepare(
      `INSERT INTO course_multi_module_selections
        (multi_module_id, matricola, chosen_result_id_module1, chosen_result_id_module2, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(multi_module_id, matricola)
       DO UPDATE SET
         chosen_result_id_module1 = excluded.chosen_result_id_module1,
         chosen_result_id_module2 = excluded.chosen_result_id_module2,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`
    ).run(
      id,
      matricola,
      safeChosen1 || null,
      safeChosen2 || null,
      req.user?.id || null
    );
    res.json({ ok: true });
  }
);

router.get(
  "/api/multi-modules/:id/results",
  requireRole("admin", "creator", "evaluator"),
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Id non valido" });
      return;
    }
    const multi = db
      .prepare(
        `SELECT mm.*,
                c1.name AS module1_name,
                c2.name AS module2_name
           FROM course_multi_modules mm
           JOIN courses c1 ON c1.id = mm.course_id_module1
           JOIN courses c2 ON c2.id = mm.course_id_module2
          WHERE mm.id = ?`
      )
      .get(id);
    if (!multi) {
      res.status(404).json({ error: "Gruppo non trovato" });
      return;
    }
    const results1 = db
      .prepare(
        `SELECT ess.id AS result_id,
                ess.matricola,
                ess.nome,
                ess.cognome,
                ess.normalized_score,
                ess.session_id,
                e.id AS exam_id,
                e.title AS exam_title,
                ess.updated_at AS result_updated_at,
                es.result_date,
                es.updated_at AS session_updated_at
           FROM exam_session_students ess
           JOIN exam_sessions es ON es.id = ess.session_id
           JOIN exams e ON e.id = es.exam_id
          WHERE e.course_id = ?`
      )
      .all(multi.course_id_module1)
      .map((row) => ({
        ...row,
        normalized_score: row.normalized_score === null ? null : Number(row.normalized_score),
      }));
    const results2 = db
      .prepare(
        `SELECT ess.id AS result_id,
                ess.matricola,
                ess.nome,
                ess.cognome,
                ess.normalized_score,
                ess.session_id,
                e.id AS exam_id,
                e.title AS exam_title,
                ess.updated_at AS result_updated_at,
                es.result_date,
                es.updated_at AS session_updated_at
           FROM exam_session_students ess
           JOIN exam_sessions es ON es.id = ess.session_id
           JOIN exams e ON e.id = es.exam_id
          WHERE e.course_id = ?`
      )
      .all(multi.course_id_module2)
      .map((row) => ({
        ...row,
        normalized_score: row.normalized_score === null ? null : Number(row.normalized_score),
      }));
    const selections = db
      .prepare(
        `SELECT matricola, chosen_result_id_module1, chosen_result_id_module2
           FROM course_multi_module_selections
          WHERE multi_module_id = ?`
      )
      .all(id);

    const selectionMap = new Map();
    selections.forEach((row) => {
      selectionMap.set(row.matricola, {
        chosen1: row.chosen_result_id_module1,
        chosen2: row.chosen_result_id_module2,
      });
    });

    const toTimestamp = (val) => (val ? new Date(val).getTime() : 0);
    const pickLatest = (items) =>
      [...items].sort((a, b) => {
        const tA = Math.max(
          toTimestamp(a.result_updated_at),
          toTimestamp(a.session_updated_at),
          toTimestamp(a.result_date)
        );
        const tB = Math.max(
          toTimestamp(b.result_updated_at),
          toTimestamp(b.session_updated_at),
          toTimestamp(b.result_date)
        );
        return tB - tA;
      })[0];

    const buildMap = (rows) => {
      const map = new Map();
      rows.forEach((row) => {
        if (!map.has(row.matricola)) map.set(row.matricola, []);
        map.get(row.matricola).push(row);
      });
      return map;
    };

    const map1 = buildMap(results1);
    const map2 = buildMap(results2);
    const matricole = new Set([
      ...map1.keys(),
      ...map2.keys(),
      ...selectionMap.keys(),
    ]);

    const students = Array.from(matricole).map((matricola) => {
      const attempts1 = map1.get(matricola) || [];
      const attempts2 = map2.get(matricola) || [];
      const selection = selectionMap.get(matricola) || {};
      const chosen1 =
        attempts1.find((row) => row.result_id === selection.chosen1) || null;
      const chosen2 =
        attempts2.find((row) => row.result_id === selection.chosen2) || null;
      const latest1 = attempts1.length ? pickLatest(attempts1) : null;
      const latest2 = attempts2.length ? pickLatest(attempts2) : null;
      const active1 = chosen1 || latest1 || null;
      const active2 = chosen2 || latest2 || null;

      const score1 = active1 ? active1.normalized_score : null;
      const score2 = active2 ? active2.normalized_score : null;
      const passed1 =
        Number.isFinite(score1) && score1 >= Number(multi.module1_min_grade);
      const passed2 =
        Number.isFinite(score2) && score2 >= Number(multi.module2_min_grade);
      let finalScore = null;
      let finalPassed = false;
      let status = "incomplete";
      if (Number.isFinite(score1) && Number.isFinite(score2)) {
        if (passed1 && passed2) {
          finalScore = Math.ceil(
            score1 * Number(multi.weight_module1) +
              score2 * Number(multi.weight_module2)
          );
          finalPassed = finalScore >= Number(multi.final_min_grade);
          status = finalPassed ? "passed" : "not_passed";
        } else {
          status = "not_passed";
        }
      }

      const nome = active1?.nome || active2?.nome || "";
      const cognome = active1?.cognome || active2?.cognome || "";
      return {
        matricola,
        nome,
        cognome,
        module1: {
          score: score1,
          passed: passed1,
          resultId: active1?.result_id || null,
          sessionId: active1?.session_id || null,
          resultDate: active1?.result_date || null,
          isManual: Boolean(chosen1),
          attempts: attempts1.map((row) => ({
            resultId: row.result_id,
            sessionId: row.session_id,
            examId: row.exam_id,
            examTitle: row.exam_title,
            score: row.normalized_score,
            resultDate: row.result_date,
            updatedAt: row.result_updated_at,
          })),
        },
        module2: {
          score: score2,
          passed: passed2,
          resultId: active2?.result_id || null,
          sessionId: active2?.session_id || null,
          resultDate: active2?.result_date || null,
          isManual: Boolean(chosen2),
          attempts: attempts2.map((row) => ({
            resultId: row.result_id,
            sessionId: row.session_id,
            examId: row.exam_id,
            examTitle: row.exam_title,
            score: row.normalized_score,
            resultDate: row.result_date,
            updatedAt: row.result_updated_at,
          })),
        },
        finalScore,
        finalPassed,
        status,
      };
    });

    res.json({
      multiModule: {
        id: multi.id,
        name: multi.name,
        module1MinGrade: multi.module1_min_grade,
        module2MinGrade: multi.module2_min_grade,
        weightModule1: multi.weight_module1,
        weightModule2: multi.weight_module2,
        finalMinGrade: multi.final_min_grade,
        rounding: multi.rounding,
        module1: {
          id: multi.course_id_module1,
          name: multi.module1_name,
        },
        module2: {
          id: multi.course_id_module2,
          name: multi.module2_name,
        },
      },
      students,
    });
  }
);

const ANSWER_OPTIONS = ["A", "B", "C", "D", "E", "F"];

const normalizeSet = (arr) =>
  Array.from(new Set(arr))
    .sort((a, b) => a - b)
    .join(",");

const getQuestionPoints = (row) => {
  const correctCount = row.filter((val) => val > 0).length;
  if (correctCount > 1) return 1;
  return row.reduce((acc, val) => (val > 0 ? acc + val : acc), 0);
};

const getMaxPoints = (mapping) =>
  mapping.correctiondictionary.reduce(
    (sum, row) => sum + getQuestionPoints(row),
    0
  );

const gradeStudent = (student, mapping) => {
  if (!mapping) return null;
  const version = Number(student.versione);
  if (!Number.isFinite(version) || version < 1 || version > mapping.Nversions) {
    return null;
  }
  const qdict = mapping.questiondictionary[version - 1];
  const adict = mapping.randomizedanswersdictionary[version - 1];
  const cdict = mapping.correctiondictionary;
  let total = 0;
  for (let q = 0; q < mapping.Nquestions; q += 1) {
    const override = student.overrides?.[q];
    if (typeof override === "number" && Number.isFinite(override)) {
      total += override;
      continue;
    }
    const displayedIndex = (qdict[q] || 1) - 1;
    const selected = String(student.answers?.[displayedIndex] || "");
    const selectedIdx = selected
      .split("")
      .map((letter) => ANSWER_OPTIONS.indexOf(letter) + 1)
      .filter((idx) => idx > 0);
    const originalSelected = selectedIdx.map((idx) => adict[q][idx - 1]);
    const correctIdx = cdict[q]
      .map((val, i) => (val > 0 ? i + 1 : null))
      .filter(Boolean);
    if (normalizeSet(originalSelected) === normalizeSet(correctIdx)) {
      total += getQuestionPoints(cdict[q]);
    }
  }
  return total;
};

router.get("/api/exams/stats", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const exams = db
    .prepare("SELECT id, mapping_json FROM exams")
    .all()
    .map((row) => ({ id: row.id, mappingJson: row.mapping_json }));

  const students = db
    .prepare(
      `SELECT es.exam_id, ess.versione, ess.answers_json, ess.overrides_json
         FROM exam_sessions es
         JOIN exam_session_students ess ON ess.session_id = es.id`
    )
    .all();

  const byExam = new Map();
  students.forEach((row) => {
    if (!byExam.has(row.exam_id)) byExam.set(row.exam_id, []);
    byExam.get(row.exam_id).push({
      versione: row.versione,
      answers: JSON.parse(row.answers_json || "[]"),
      overrides: JSON.parse(row.overrides_json || "[]"),
    });
  });

  const stats = {};
  exams.forEach((exam) => {
    if (!exam.mappingJson) {
      stats[exam.id] = { studentsCount: 0, avgNormalized: null };
      return;
    }
    let mapping;
    try {
      mapping = JSON.parse(exam.mappingJson);
    } catch {
      stats[exam.id] = { studentsCount: 0, avgNormalized: null };
      return;
    }
    const examStudents = byExam.get(exam.id) || [];
    const scores = examStudents
      .map((student) => gradeStudent(student, mapping))
      .filter((val) => val !== null);
    if (!scores.length) {
      stats[exam.id] = { studentsCount: 0, avgNormalized: null };
      return;
    }
    const maxPoints = getMaxPoints(mapping);
    const grades = scores.map((points) => (maxPoints ? (points / maxPoints) * 30 : 0));
    const top = Math.max(...grades);
    const factor = top > 0 ? 30 / top : null;
    const normalized = grades.map((grade) =>
      Math.round((factor ? grade * factor : grade))
    );
    const avg =
      normalized.reduce((sum, val) => sum + val, 0) / normalized.length;
    stats[exam.id] = {
      studentsCount: scores.length,
      avgNormalized: Math.round(avg * 10) / 10,
    };
  });

  res.json({ stats });
});

router.get("/api/exams/:id", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const exam = db
    .prepare(
      `SELECT id, course_id, title, date, output_name, versions, seed,
              randomize_questions, randomize_answers, write_r,
              header_title, header_department, header_university, header_note, header_logo,
              is_draft, locked_at,
              EXISTS (
                SELECT 1
                  FROM exam_session_students ess
                  JOIN exam_sessions es ON es.id = ess.session_id
                 WHERE es.exam_id = exams.id
                 LIMIT 1
              ) AS has_results,
              public_access_enabled, public_access_expires_at, public_access_show_notes
         FROM exams WHERE id = ?`
    )
    .get(id);
  if (!exam) {
    res.status(404).json({ error: "Esame non trovato" });
    return;
  }
  let questions = [];
  if (exam.is_draft) {
    questions = getExamQuestions(id);
  } else {
    questions = getExamSnapshotQuestions(id);
    if (!questions.length) {
      questions = getExamQuestions(id);
    }
  }
  res.json({
    exam: {
      id: exam.id,
      courseId: exam.course_id,
      title: exam.title,
      date: exam.date || "",
      outputName: exam.output_name || "",
      versions: exam.versions,
      seed: exam.seed,
      randomizeQuestions: Boolean(exam.randomize_questions),
      randomizeAnswers: Boolean(exam.randomize_answers),
      writeR: Boolean(exam.write_r),
      headerTitle: exam.header_title || "",
      headerDepartment: exam.header_department || "",
      headerUniversity: exam.header_university || "",
      headerNote: exam.header_note || "",
      headerLogo: exam.header_logo || "",
      isDraft: Boolean(exam.is_draft),
      lockedAt: exam.locked_at || "",
      hasResults: Boolean(exam.has_results),
      publicAccessEnabled: Boolean(exam.public_access_enabled),
      publicAccessHasPassword: Boolean(exam.public_access_password_hash),
      publicAccessExpiresAt: exam.public_access_expires_at || "",
      publicAccessShowNotes: Boolean(exam.public_access_show_notes),
    },
    questions,
  });
});

router.post("/api/exams/:id/public-access", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const examId = Number(req.params.id);
  if (!Number.isFinite(examId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const payload = req.body || {};
  const enabled = Boolean(payload.enabled);
  const showNotes = Boolean(payload.showNotes);
  if (!enabled) {
    db.prepare(
      `UPDATE exams
          SET public_access_enabled = 0,
              public_access_password_hash = NULL,
              public_access_expires_at = NULL,
              public_access_show_notes = 0
        WHERE id = ?`
    ).run(examId);
    if (req.user) {
      logSecurityEvent(req, "public_access_disabled", `examId=${examId}`, req.user.id);
    }
    res.json({ ok: true });
    return;
  }
  if (showNotes) {
    const hasResults = db
      .prepare(
        `SELECT 1
           FROM exam_session_students ess
           JOIN exam_sessions es ON es.id = ess.session_id
          WHERE es.exam_id = ?
          LIMIT 1`
      )
      .get(examId);
    if (!hasResults) {
      res.status(400).json({ error: "Le note sono visibili solo dopo la correzione." });
      return;
    }
  }
  const password = String(payload.password || "");
  const expiresAtRaw = payload.expiresAt ? String(payload.expiresAt).trim() : "";
  let expiresAt = null;
  if (expiresAtRaw) {
    expiresAt = new Date(expiresAtRaw);
  } else {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + PUBLIC_ACCESS_TTL_DAYS);
    expiresAt = fallback;
  }
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    res.status(400).json({ error: "Scadenza non valida" });
    return;
  }
  let hash = null;
  if (password) {
    hash = bcrypt.hashSync(password, 10);
  } else {
    const existing = db
      .prepare("SELECT public_access_password_hash FROM exams WHERE id = ?")
      .get(examId);
    if (!existing || !existing.public_access_password_hash) {
      res.status(400).json({ error: "Password mancante" });
      return;
    }
    hash = existing.public_access_password_hash;
  }
  db.prepare(
    `UPDATE exams
        SET public_access_enabled = 1,
            public_access_password_hash = ?,
            public_access_expires_at = ?,
            public_access_show_notes = ?
      WHERE id = ?`
  ).run(hash, expiresAt.toISOString(), showNotes ? 1 : 0, examId);
  if (req.user) {
    logSecurityEvent(
      req,
      "public_access_enabled",
      `examId=${examId}; expires=${expiresAt.toISOString()}; showNotes=${showNotes ? 1 : 0}`,
      req.user.id
    );
  }
  res.json({ ok: true });
});

router.get("/api/exams/draft", requireRole("admin", "creator"), (req, res) => {
  const courseId = Number(req.query.courseId);
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "courseId mancante" });
    return;
  }
  const draft = db
    .prepare(
      `SELECT id, course_id, title, date, output_name, versions, seed,
              randomize_questions, randomize_answers, write_r,
              header_title, header_department, header_university, header_note, header_logo,
              is_draft, locked_at
         FROM exams
        WHERE course_id = ? AND is_draft = 1
        LIMIT 1`
    )
    .get(courseId);
  if (!draft) {
    res.json({ exam: null, questions: [] });
    return;
  }
  const questions = getExamQuestions(draft.id);
  res.json({
    exam: {
      id: draft.id,
      courseId: draft.course_id,
      title: draft.title,
      date: draft.date || "",
      outputName: draft.output_name || "",
      versions: draft.versions,
      seed: draft.seed,
      randomizeQuestions: Boolean(draft.randomize_questions),
      randomizeAnswers: Boolean(draft.randomize_answers),
      writeR: Boolean(draft.write_r),
      headerTitle: draft.header_title || "",
      headerDepartment: draft.header_department || "",
      headerUniversity: draft.header_university || "",
      headerNote: draft.header_note || "",
      headerLogo: draft.header_logo || "",
      isDraft: Boolean(draft.is_draft),
      lockedAt: draft.locked_at || "",
    },
    questions,
  });
});

const upsertTopics = (courseId, topics) => {
  const ids = [];
  const insertStmt = db.prepare(
    "INSERT OR IGNORE INTO topics (course_id, name) VALUES (?, ?)"
  );
  const selectStmt = db.prepare(
    "SELECT id FROM topics WHERE course_id = ? AND name = ?"
  );
  topics.forEach((topic) => {
    const name = String(topic || "").trim();
    if (!name) return;
    insertStmt.run(courseId, name);
    const row = selectStmt.get(courseId, name);
    if (row) ids.push(row.id);
  });
  return ids;
};

const insertQuestion = (question, courseId) => {
  const info = db
    .prepare(
      `INSERT INTO questions
        (text, note, type, image_path, image_layout_enabled, image_layout_mode, image_left_width, image_right_width, image_scale)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      question.text,
      question.note || null,
      question.type,
      question.imagePath || null,
      question.imageLayoutEnabled ? 1 : 0,
      question.imageLayoutMode || "side",
      question.imageLeftWidth || null,
      question.imageRightWidth || null,
      question.imageScale || null
    );
  const questionId = info.lastInsertRowid;
  const answers = Array.isArray(question.answers) ? question.answers : [];
  const insertAnswer = db.prepare(
    "INSERT INTO answers (question_id, position, text, note, is_correct) VALUES (?, ?, ?, ?, ?)"
  );
  answers.forEach((answer, idx) => {
    insertAnswer.run(
      questionId,
      idx + 1,
      answer.text || "",
      answer.note || null,
      answer.isCorrect ? 1 : 0
    );
  });
  const topics = Array.isArray(question.topics) ? question.topics : [];
  const topicIds = upsertTopics(courseId, topics);
  const insertQt = db.prepare(
    "INSERT OR IGNORE INTO question_topics (question_id, topic_id) VALUES (?, ?)"
  );
  topicIds.forEach((topicId) => {
    insertQt.run(questionId, topicId);
  });
  return questionId;
};

const replaceExamQuestions = (examId, questions, courseId) => {
  db.prepare("DELETE FROM exam_questions WHERE exam_id = ?").run(examId);
  const insertEq = db.prepare(
    "INSERT INTO exam_questions (exam_id, question_id, position) VALUES (?, ?, ?)"
  );
  questions.forEach((question, idx) => {
    const questionId = Number(question.questionId || question.id);
    if (Number.isFinite(questionId)) {
      insertEq.run(examId, questionId, idx + 1);
      return;
    }
    if (question.text) {
      const createdId = insertQuestion(question, courseId);
      insertEq.run(examId, createdId, idx + 1);
    }
  });
};

router.post("/api/exams", requireRole("admin", "creator"), (req, res) => {
  const payload = req.body || {};
  const exam = payload.exam || {};
  const courseId = Number(exam.courseId);
  const title = String(exam.title || "").trim();
  const isDraft = Boolean(exam.isDraft);
  if (!Number.isFinite(courseId) || !title) {
    res.status(400).json({ error: "Corso o titolo mancante" });
    return;
  }
  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO exams
          (course_id, title, date, output_name, versions, seed,
           randomize_questions, randomize_answers, write_r,
           header_title, header_department, header_university, header_note, header_logo,
           is_draft, locked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        courseId,
        title,
        exam.date || null,
        exam.outputName || null,
        exam.versions || null,
        exam.seed || null,
        exam.randomizeQuestions ? 1 : 0,
        exam.randomizeAnswers ? 1 : 0,
        exam.writeR ? 1 : 0,
        exam.headerTitle || null,
        exam.headerDepartment || null,
        exam.headerUniversity || null,
        exam.headerNote || null,
        exam.headerLogo || null,
        isDraft ? 1 : 0,
        isDraft ? null : null
      );
    const examId = info.lastInsertRowid;
    const questions = Array.isArray(payload.questions) ? payload.questions : [];
    replaceExamQuestions(examId, questions, courseId);
    return examId;
  });
  const examId = tx();
  res.json({ examId });
});

router.put("/api/exams/:id", requireRole("admin", "creator"), (req, res) => {
  const examId = Number(req.params.id);
  if (!Number.isFinite(examId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const payload = req.body || {};
  const exam = payload.exam || {};
  const courseId = Number(exam.courseId);
  const title = String(exam.title || "").trim();
  if (!Number.isFinite(courseId) || !title) {
    res.status(400).json({ error: "Corso o titolo mancante" });
    return;
  }
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE exams
          SET course_id = ?, title = ?, date = ?, output_name = ?, versions = ?, seed = ?,
              randomize_questions = ?, randomize_answers = ?, write_r = ?,
              header_title = ?, header_department = ?, header_university = ?, header_note = ?, header_logo = ?,
              updated_at = datetime('now')
        WHERE id = ?`
    ).run(
      courseId,
      title,
      exam.date || null,
      exam.outputName || null,
      exam.versions || null,
      exam.seed || null,
      exam.randomizeQuestions ? 1 : 0,
      exam.randomizeAnswers ? 1 : 0,
      exam.writeR ? 1 : 0,
      exam.headerTitle || null,
      exam.headerDepartment || null,
      exam.headerUniversity || null,
      exam.headerNote || null,
      exam.headerLogo || null,
      examId
    );
    const questions = Array.isArray(payload.questions) ? payload.questions : [];
    replaceExamQuestions(examId, questions, courseId);
  });
  tx();
  res.json({ examId });
});

router.post("/api/exams/draft", (req, res) => {
  const payload = req.body || {};
  const exam = payload.exam || {};
  const courseId = Number(exam.courseId);
  const title = String(exam.title || "").trim();
  if (!Number.isFinite(courseId) || !title) {
    res.status(400).json({ error: "Corso o titolo mancante" });
    return;
  }
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  const tx = db.transaction(() => {
    const existing = db
      .prepare("SELECT id FROM exams WHERE course_id = ? AND is_draft = 1 LIMIT 1")
      .get(courseId);
    if (existing) {
      db.prepare(
        `UPDATE exams
            SET title = ?, date = ?, output_name = ?, versions = ?, seed = ?,
                randomize_questions = ?, randomize_answers = ?, write_r = ?,
                header_title = ?, header_department = ?, header_university = ?, header_note = ?, header_logo = ?,
                updated_at = datetime('now')
          WHERE id = ?`
      ).run(
        title,
        exam.date || null,
        exam.outputName || null,
        exam.versions || null,
        exam.seed || null,
        exam.randomizeQuestions ? 1 : 0,
        exam.randomizeAnswers ? 1 : 0,
        exam.writeR ? 1 : 0,
        exam.headerTitle || null,
        exam.headerDepartment || null,
        exam.headerUniversity || null,
        exam.headerNote || null,
        exam.headerLogo || null,
        existing.id
      );
      replaceExamQuestions(existing.id, questions, courseId);
      return existing.id;
    }
    const info = db
      .prepare(
        `INSERT INTO exams
          (course_id, title, date, output_name, versions, seed,
           randomize_questions, randomize_answers, write_r,
           header_title, header_department, header_university, header_note, header_logo,
           is_draft, locked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)`
      )
      .run(
        courseId,
        title,
        exam.date || null,
        exam.outputName || null,
        exam.versions || null,
        exam.seed || null,
        exam.randomizeQuestions ? 1 : 0,
        exam.randomizeAnswers ? 1 : 0,
        exam.writeR ? 1 : 0,
        exam.headerTitle || null,
        exam.headerDepartment || null,
        exam.headerUniversity || null,
        exam.headerNote || null,
        exam.headerLogo || null
      );
    const examId = info.lastInsertRowid;
    replaceExamQuestions(examId, questions, courseId);
    return examId;
  });
  const examId = tx();
  res.json({ examId });
});

router.post("/api/exams/:id/lock", requireRole("admin", "creator"), async (req, res) => {
  const examId = Number(req.params.id);
  if (!Number.isFinite(examId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const exam = db
    .prepare("SELECT id, is_draft, mapping_json, versions FROM exams WHERE id = ?")
    .get(examId);
  if (!exam) {
    res.status(404).json({ error: "Esame non trovato" });
    return;
  }
  if (!exam.is_draft && exam.mapping_json) {
    const hasSnapshots = db
      .prepare(
        "SELECT 1 FROM exam_question_snapshots WHERE exam_id = ? LIMIT 1"
      )
      .get(examId);
    if (!hasSnapshots) {
      const questions = getExamQuestions(examId);
      const insertSnapshot = db.prepare(
        "INSERT INTO exam_question_snapshots (exam_id, position, question_id, snapshot_json) VALUES (?, ?, ?, ?)"
      );
      db.prepare("DELETE FROM exam_question_snapshots WHERE exam_id = ?").run(examId);
      questions.forEach((question) => {
        insertSnapshot.run(
          examId,
          question.position,
          question.id,
          JSON.stringify(question)
        );
      });
    }
    res.json({ ok: true });
    return;
  }

  const payload = req.body || {};
  const latex = typeof payload.latex === "string" ? payload.latex : "";
  const versions = Number(payload.versions || exam.versions || 1);
  if (!latex.trim()) {
    res.status(400).json({ error: "LaTeX mancante per generare il mapping" });
    return;
  }
  if (!Number.isFinite(versions) || versions < 1) {
    res.status(400).json({ error: "Numero versioni non valido" });
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "c3lab-exam-"));
  const texPath = path.join(tmpDir, "exam.tex");
  fs.writeFileSync(texPath, latex, "utf8");
  copyLatexAssets(collectLatexAssets(latex), tmpDir);
  const texInput = texPath.replace(/\\/g, "/");

  const jobName = "exam-map";
  const texArg = `\\def\\myversion{1}\\def\\mynumversions{${versions}}\\def\\myoutput{exam}\\input{${texInput}}`;
  const first = await runPdflatex(tmpDir, jobName, texArg, __dirname);
  if (!first.ok) {
    res.status(400).json({
      error: "Errore compilazione LaTeX",
      log: first.log || first.stderr || first.stdout,
    });
    return;
  }
  const second = await runPdflatex(tmpDir, jobName, texArg, __dirname);
  if (!second.ok) {
    res.status(400).json({
      error: "Errore compilazione LaTeX",
      log: second.log || second.stderr || second.stdout,
    });
    return;
  }
  const rFile = fs
    .readdirSync(tmpDir)
    .find((name) => name.toLowerCase().endsWith(".r"));
  if (!rFile) {
    res.status(500).json({ error: "File .r non generato" });
    return;
  }
  const rText = fs.readFileSync(path.join(tmpDir, rFile), "utf8");
  let mappingJson = null;
  try {
    const mapping = convertRtoMapping(rText);
    mappingJson = JSON.stringify(mapping);
  } catch (err) {
    res.status(400).json({ error: err.message || "Errore parsing mapping" });
    return;
  }

  const questions = getExamQuestions(examId);
  const insertSnapshot = db.prepare(
    "INSERT INTO exam_question_snapshots (exam_id, position, question_id, snapshot_json) VALUES (?, ?, ?, ?)"
  );
  db.prepare("DELETE FROM exam_question_snapshots WHERE exam_id = ?").run(examId);
  questions.forEach((question) => {
    insertSnapshot.run(
      examId,
      question.position,
      question.id,
      JSON.stringify(question)
    );
  });
  db.prepare(
    "UPDATE exams SET is_draft = 0, locked_at = datetime('now'), mapping_json = ? WHERE id = ?"
  ).run(mappingJson, examId);
  res.json({ ok: true });
});

router.post("/api/exams/:id/unlock", requireRole("admin", "creator"), (req, res) => {
  const examId = Number(req.params.id);
  if (!Number.isFinite(examId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const hasResults = db
    .prepare(
      `SELECT 1
         FROM exam_session_students ess
         JOIN exam_sessions es ON es.id = ess.session_id
        WHERE es.exam_id = ?
        LIMIT 1`
    )
    .get(examId);
  if (hasResults) {
    res.status(409).json({ error: "Impossibile sbloccare: esistono risultati salvati." });
    return;
  }
  const exam = db
    .prepare("SELECT id, course_id, is_draft FROM exams WHERE id = ?")
    .get(examId);
  if (!exam) {
    res.status(404).json({ error: "Esame non trovato" });
    return;
  }
  if (exam.is_draft) {
    res.json({ ok: true });
    return;
  }
  db.prepare("DELETE FROM exam_question_snapshots WHERE exam_id = ?").run(examId);
  db.prepare(
    "UPDATE exams SET is_draft = 1, locked_at = NULL WHERE id = ?"
  ).run(examId);
  res.json({ ok: true });
});

router.get("/api/exams/:id/mapping", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const examId = Number(req.params.id);
  if (!Number.isFinite(examId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const row = db
    .prepare(
      "SELECT id, is_draft, mapping_json FROM exams WHERE id = ?"
    )
    .get(examId);
  if (!row) {
    res.status(404).json({ error: "Esame non trovato" });
    return;
  }
  if (row.is_draft) {
    res.status(400).json({ error: "La traccia non e chiusa" });
    return;
  }
  if (!row.mapping_json) {
    res.status(404).json({ error: "Mapping non disponibile" });
    return;
  }
  res.json({ mapping: JSON.parse(row.mapping_json) });
});

router.get("/api/exams/:id/sessions", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const examId = Number(req.params.id);
  if (!Number.isFinite(examId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const exists = db.prepare("SELECT id FROM exams WHERE id = ?").get(examId);
  if (!exists) {
    res.status(404).json({ error: "Esame non trovato" });
    return;
  }
  const rows = db
    .prepare(
      `SELECT s.id, s.title, s.result_date, s.created_at, s.updated_at,
              COUNT(st.id) AS student_count
         FROM exam_sessions s
         LEFT JOIN exam_session_students st ON st.session_id = s.id
        WHERE s.exam_id = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC`
    )
    .all(examId);
  res.json({ sessions: rows });
});

router.get("/api/exams/:id/cheating", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const examId = Number(req.params.id);
  const sessionId = Number(req.query.sessionId);
  const permutations = Math.min(5000, Math.max(100, Number(req.query.permutations) || 5000));
  const pairSample = Math.min(10000, Math.max(200, Number(req.query.pairSample) || 2000));
  const alpha = Math.min(0.999, Math.max(0.9, Number(req.query.alpha) || 0.99));
  if (!Number.isFinite(examId) || !Number.isFinite(sessionId)) {
    res.status(400).json({ error: "Parametri mancanti" });
    return;
  }
  const exam = db
    .prepare("SELECT id, mapping_json, is_draft FROM exams WHERE id = ?")
    .get(examId);
  if (!exam) {
    res.status(404).json({ error: "Esame non trovato" });
    return;
  }
  if (exam.is_draft || !exam.mapping_json) {
    res.status(400).json({ error: "Mapping non disponibile: traccia non chiusa" });
    return;
  }
  const session = db
    .prepare("SELECT id, exam_id FROM exam_sessions WHERE id = ?")
    .get(sessionId);
  if (!session || session.exam_id !== examId) {
    res.status(400).json({ error: "Sessione non valida" });
    return;
  }
  const mapping = JSON.parse(exam.mapping_json);
  const questionCount = Math.min(
    Number(mapping.Nquestions || 0) || mapping.correctiondictionary?.length || 0,
    mapping.correctiondictionary?.length || 0
  );
  if (!questionCount) {
    res.status(400).json({ error: "Mapping non valido" });
    return;
  }
  const students = db
    .prepare(
      `SELECT matricola, nome, cognome, versione, answers_json
         FROM exam_session_students
        WHERE session_id = ?
        ORDER BY created_at DESC`
    )
    .all(sessionId)
    .map((row) => ({
      matricola: row.matricola,
      nome: row.nome || "",
      cognome: row.cognome || "",
      versione: row.versione,
      answers: JSON.parse(row.answers_json || "[]"),
    }))
    .filter((student) => Number.isFinite(Number(student.versione)));

  if (students.length < 2) {
    res.json({ threshold: null, pairs: [], totalPairs: 0 });
    return;
  }

  const correctSets = mapping.correctiondictionary.map((row) =>
    normalizeAnswerSet(
      row
        .map((val, idx) => (val > 0 ? idx + 1 : null))
        .filter(Boolean)
    )
  );

  const signaturesByQuestion = Array.from({ length: questionCount }, () =>
    Array.from({ length: students.length }, () => null)
  );
  const correctCounts = Array.from({ length: questionCount }, () => 0);
  const totalCounts = Array.from({ length: questionCount }, () => 0);

  students.forEach((student, sIdx) => {
    for (let q = 0; q < questionCount; q += 1) {
      const selected = getSelectedOriginalAnswers(student, q, mapping);
      const signature = normalizeAnswerSet(selected);
      const isCorrect = signature && signature === correctSets[q];
      totalCounts[q] += 1;
      if (isCorrect) {
        correctCounts[q] += 1;
        signaturesByQuestion[q][sIdx] = null;
      } else if (signature) {
        signaturesByQuestion[q][sIdx] = signature;
      } else {
        signaturesByQuestion[q][sIdx] = null;
      }
    }
  });

  const pCorr = correctCounts.map((count, idx) =>
    totalCounts[idx] ? count / totalCounts[idx] : 0.01
  );
  const weights = pCorr.map((p) => -Math.log(Math.max(p, 1e-6)));

  const pairs = [];
  for (let i = 0; i < students.length; i += 1) {
    for (let j = i + 1; j < students.length; j += 1) {
      let score = 0;
      const matches = [];
      for (let q = 0; q < questionCount; q += 1) {
        const sigI = signaturesByQuestion[q][i];
        if (!sigI) continue;
        const sigJ = signaturesByQuestion[q][j];
        if (sigI && sigI === sigJ) {
          score += weights[q];
          matches.push(q + 1);
        }
      }
      if (matches.length) {
        pairs.push({
          studentA: students[i],
          studentB: students[j],
          score: Math.round(score * 1000) / 1000,
          matchCount: matches.length,
          matchQuestions: matches,
        });
      }
    }
  }

  const totalPairs = (students.length * (students.length - 1)) / 2;
  const samplePairs = [];
  const maxSample = Math.min(pairSample, totalPairs);
  if (maxSample === totalPairs) {
    for (let i = 0; i < students.length; i += 1) {
      for (let j = i + 1; j < students.length; j += 1) {
        samplePairs.push([i, j]);
      }
    }
  } else {
    const seen = new Set();
    while (samplePairs.length < maxSample) {
      const i = Math.floor(Math.random() * students.length);
      const j = Math.floor(Math.random() * students.length);
      if (i === j) continue;
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      const key = `${a}-${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      samplePairs.push([a, b]);
    }
  }

  const nullScores = [];
  for (let p = 0; p < permutations; p += 1) {
    const permuted = signaturesByQuestion.map((col) => {
      const copy = col.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
      }
      return copy;
    });
    for (let k = 0; k < samplePairs.length; k += 1) {
      const [i, j] = samplePairs[k];
      let score = 0;
      for (let q = 0; q < questionCount; q += 1) {
        const sigI = permuted[q][i];
        if (!sigI) continue;
        if (sigI === permuted[q][j]) score += weights[q];
      }
      nullScores.push(score);
    }
  }
  nullScores.sort((a, b) => a - b);
  const cutoffIndex = Math.floor(nullScores.length * alpha);
  const threshold = nullScores[Math.min(cutoffIndex, nullScores.length - 1)] || null;

  const suspicious = threshold
    ? pairs.filter((pair) => pair.score >= threshold)
    : [];
  suspicious.sort((a, b) => b.score - a.score);

  res.json({
    threshold,
    permutations,
    pairSample: maxSample,
    totalPairs,
    pairs: suspicious,
  });
});

router.post("/api/exams/:id/sessions", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const examId = Number(req.params.id);
  if (!Number.isFinite(examId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const exists = db.prepare("SELECT id FROM exams WHERE id = ?").get(examId);
  if (!exists) {
    res.status(404).json({ error: "Esame non trovato" });
    return;
  }
  const payload = req.body || {};
  const title = payload.title ? String(payload.title).trim() : null;
  const resultDate = payload.resultDate ? String(payload.resultDate).trim() : null;
  const hasTargetTopGrade = Object.prototype.hasOwnProperty.call(payload, "targetTopGrade");
  const targetTopGrade = Number(payload.targetTopGrade);
  const targetTopGradeValue = Number.isFinite(targetTopGrade) ? targetTopGrade : null;
  const info = hasTargetTopGrade
    ? db
        .prepare(
          `INSERT INTO exam_sessions (exam_id, title, result_date, target_top_grade, created_at, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .run(examId, title, resultDate, targetTopGradeValue)
    : db
        .prepare(
          `INSERT INTO exam_sessions (exam_id, title, result_date, created_at, updated_at)
           VALUES (?, ?, ?, datetime('now'), datetime('now'))`
        )
        .run(examId, title, resultDate);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get("/api/sessions/:id", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const sessionId = Number(req.params.id);
  if (!Number.isFinite(sessionId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const session = db
    .prepare(
      `SELECT id, exam_id, title, result_date, target_top_grade, created_at, updated_at
         FROM exam_sessions WHERE id = ?`
    )
    .get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Sessione non trovata" });
    return;
  }
  const students = db
    .prepare(
      `SELECT matricola, nome, cognome, versione, answers_json, overrides_json, normalized_score
         FROM exam_session_students
        WHERE session_id = ?
        ORDER BY created_at DESC`
    )
    .all(sessionId)
    .map((row) => ({
      matricola: row.matricola,
      nome: row.nome || "",
      cognome: row.cognome || "",
      versione: row.versione,
      answers: JSON.parse(row.answers_json || "[]"),
      overrides: JSON.parse(row.overrides_json || "[]"),
      normalizedScore: row.normalized_score,
    }));
  res.json({ session, students });
});

router.put("/api/sessions/:id", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const sessionId = Number(req.params.id);
  if (!Number.isFinite(sessionId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const session = db.prepare("SELECT id FROM exam_sessions WHERE id = ?").get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Sessione non trovata" });
    return;
  }
  const payload = req.body || {};
  const title = payload.title ? String(payload.title).trim() : null;
  const resultDate = payload.resultDate ? String(payload.resultDate).trim() : null;
  const students = Array.isArray(payload.students) ? payload.students : [];
  const includeNormalization = payload.includeNormalization === true;
  const targetTopGrade = Number(payload.targetTopGrade);
  const targetTopGradeValue = Number.isFinite(targetTopGrade) ? targetTopGrade : null;
  const existingScores = includeNormalization
    ? null
    : new Map(
        db
          .prepare(
            `SELECT matricola, normalized_score
               FROM exam_session_students
              WHERE session_id = ?`
          )
          .all(sessionId)
          .map((row) => [String(row.matricola).trim(), row.normalized_score])
      );

  const updateSessionBasic = db.prepare(
    `UPDATE exam_sessions
        SET title = ?, result_date = ?, updated_at = datetime('now')
      WHERE id = ?`
  );
  const updateSessionWithNormalization = db.prepare(
    `UPDATE exam_sessions
        SET title = ?, result_date = ?, target_top_grade = ?, updated_at = datetime('now')
      WHERE id = ?`
  );
  const deleteStudents = db.prepare(
    "DELETE FROM exam_session_students WHERE session_id = ?"
  );
  const insertStudent = db.prepare(
    `INSERT INTO exam_session_students
      (session_id, matricola, nome, cognome, versione, answers_json, overrides_json, normalized_score, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  );

  const tx = db.transaction(() => {
    if (includeNormalization) {
      updateSessionWithNormalization.run(title, resultDate, targetTopGradeValue, sessionId);
    } else {
      updateSessionBasic.run(title, resultDate, sessionId);
    }
    deleteStudents.run(sessionId);
    students.forEach((student) => {
      if (!student || !student.matricola) return;
      const answers = Array.isArray(student.answers) ? student.answers : [];
      const overrides = Array.isArray(student.overrides) ? student.overrides : [];
      const normalizedScore = Number(student.normalizedScore);
      const normalizedValue = includeNormalization
        ? (Number.isFinite(normalizedScore) ? normalizedScore : null)
        : existingScores.get(String(student.matricola).trim()) ?? null;
      insertStudent.run(
        sessionId,
        String(student.matricola).trim(),
        student.nome ? String(student.nome).trim() : "",
        student.cognome ? String(student.cognome).trim() : "",
        student.versione ? Number(student.versione) : null,
        JSON.stringify(answers),
        JSON.stringify(overrides),
        normalizedValue
      );
    });
  });

  try {
    tx();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Errore salvataggio sessione" });
  }
});

router.delete("/api/sessions/:id", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const sessionId = Number(req.params.id);
  if (!Number.isFinite(sessionId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const session = db.prepare("SELECT id FROM exam_sessions WHERE id = ?").get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Sessione non trovata" });
    return;
  }
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM exam_session_students WHERE session_id = ?").run(sessionId);
    db.prepare("DELETE FROM exam_sessions WHERE id = ?").run(sessionId);
  });
  tx();
  res.json({ ok: true });
});

router.delete("/api/exams/:id", requireRole("admin", "creator"), (req, res) => {
  const examId = Number(req.params.id);
  if (!Number.isFinite(examId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const hasResults = db
    .prepare(
      `SELECT 1
         FROM exam_session_students ess
         JOIN exam_sessions es ON es.id = ess.session_id
        WHERE es.exam_id = ?
        LIMIT 1`
    )
    .get(examId);
  if (hasResults) {
    res.status(409).json({ error: "Esistono risultati salvati. Svuota i risultati prima di eliminare la traccia." });
    return;
  }
  const tx = db.transaction(() => {
    db.prepare(
      `DELETE FROM exam_session_students
        WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = ?)`
    ).run(examId);
    db.prepare("DELETE FROM exam_sessions WHERE exam_id = ?").run(examId);
    db.prepare("DELETE FROM exam_question_snapshots WHERE exam_id = ?").run(examId);
    db.prepare("DELETE FROM exam_questions WHERE exam_id = ?").run(examId);
    db.prepare("DELETE FROM exams WHERE id = ?").run(examId);
  });
  tx();
  res.json({ ok: true });
});

router.post("/api/exams/:id/clear-results", requireRole("admin", "creator"), (req, res) => {
  const examId = Number(req.params.id);
  if (!Number.isFinite(examId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const exam = db.prepare("SELECT id FROM exams WHERE id = ?").get(examId);
  if (!exam) {
    res.status(404).json({ error: "Esame non trovato" });
    return;
  }
  const tx = db.transaction(() => {
    db.prepare(
      `DELETE FROM exam_session_students
        WHERE session_id IN (SELECT id FROM exam_sessions WHERE exam_id = ?)`
    ).run(examId);
    db.prepare("DELETE FROM exam_sessions WHERE exam_id = ?").run(examId);
  });
  tx();
  res.json({ ok: true });
});

router.post("/api/import-esse3", requireRole("admin", "creator", "evaluator"), (req, res) => {
  try {
    if (!req.body || !req.body.length) {
      res.status(400).json({ error: "File vuoto" });
      return;
    }
    const workbook = xlsx.read(req.body, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "", range: 19 });
    if (!rows.length) {
      res.status(400).json({ error: "Nessuna riga trovata" });
      return;
    }

    const normalize = (val) => String(val || "").trim().toLowerCase();
    const headers = Object.keys(rows[0]);
    const findKey = (candidates) =>
      headers.find((h) => candidates.some((c) => normalize(h) === c));

    const matricolaKey = findKey(["matricola", "matr."]);
    const nomeKey = findKey(["nome"]);
    const cognomeKey = findKey(["cognome"]);

    if (!matricolaKey || !nomeKey || !cognomeKey) {
      res.status(400).json({ error: "Colonne non riconosciute (Matricola/Nome/Cognome)" });
      return;
    }

    const students = rows.map((row) => ({
      matricola: String(row[matricolaKey] || "").trim(),
      nome: String(row[nomeKey] || "").trim(),
      cognome: String(row[cognomeKey] || "").trim(),
    })).filter((row) => row.matricola);

    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: err.message || "Errore import" });
  }
});

router.post("/api/results-xls", requireRole("admin", "creator", "evaluator"), (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.fileBase64 || !Array.isArray(payload.results)) {
      res.status(400).json({ error: "Payload non valido" });
      return;
    }
    const buffer = Buffer.from(payload.fileBase64, "base64");
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", range: 19 });
    if (!rows.length) {
      res.status(400).json({ error: "Nessuna riga trovata" });
      return;
    }
    const headers = rows[0].map((h) => String(h || "").trim());
    const normalize = (val) =>
      String(val || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
    const matricolaIdx = headers.findIndex((h) => normalize(h) === "matricola");
    const esitoIdx = headers.findIndex((h) => normalize(h) === "esito");
    if (matricolaIdx === -1 || esitoIdx === -1) {
      res.status(400).json({ error: "Colonne Matricola/Esito non trovate" });
      return;
    }
    const resultMap = new Map(
      payload.results.map((r) => [String(r.matricola || "").trim(), r.esito])
    );
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const matricola = String(row[matricolaIdx] || "").trim();
      if (!matricola) continue;
      if (!resultMap.has(matricola)) continue;
      const esito = resultMap.get(matricola);
      const cellAddress = xlsx.utils.encode_cell({ r: i + 19, c: esitoIdx });
      sheet[cellAddress] = { t: "n", v: esito };
    }
    const out = xlsx.write(workbook, { type: "buffer", bookType: "xls" });
    res.setHeader("Content-Type", "application/vnd.ms-excel");
    res.setHeader("Content-Disposition", "attachment; filename=ListaStudentiEsameRisultati.xls");
    res.end(out);
  } catch (err) {
    res.status(500).json({ error: err.message || "Errore export" });
  }
});

router.post("/api/compile-pdf", requireRole("admin", "creator"), async (req, res) => {
  try {
    const payload = req.body || {};
    const latex = typeof payload.latex === "string" ? payload.latex : "";
    if (!latex.trim()) {
      res.status(400).json({ error: "LaTeX mancante" });
      return;
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "c3lab-exam-"));
    const texPath = path.join(tmpDir, "exam.tex");
    fs.writeFileSync(texPath, latex, "utf8");
    copyLatexAssets(collectLatexAssets(latex), tmpDir);
    const texInput = texPath.replace(/\\/g, "/");

    const args = [
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-output-directory",
      tmpDir,
      texPath,
    ];
    const pdflatex = spawn("pdflatex", args, { cwd: __dirname });
    let stdout = "";
    let stderr = "";
    pdflatex.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    pdflatex.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    pdflatex.on("close", (code) => {
      if (code !== 0) {
        const logPath = path.join(tmpDir, "exam.log");
        const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
        res.status(400).json({
          error: "Errore compilazione LaTeX",
          details: stderr || stdout,
          log,
        });
        return;
      }
      const pdfPath = path.join(tmpDir, "exam.pdf");
      if (!fs.existsSync(pdfPath)) {
        res.status(500).json({ error: "PDF non generato" });
        return;
      }
      const pdf = fs.readFileSync(pdfPath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=exam.pdf");
      res.end(pdf);
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Errore compilazione" });
  }
});

router.post("/api/generate-traces", requireRole("admin", "creator"), (req, res) => {
  const payload = req.body || {};
  const latex = typeof payload.latex === "string" ? payload.latex : "";
  const versions = Number(payload.versions);
  if (!latex.trim()) {
    res.status(400).json({ error: "LaTeX mancante" });
    return;
  }
  if (!Number.isFinite(versions) || versions < 1) {
    res.status(400).json({ error: "Numero versioni non valido" });
    return;
  }

  const jobId = crypto.randomUUID();
  traceJobs.set(jobId, {
    status: "queued",
    createdAt: Date.now(),
    tmpDir: null,
    error: null,
    combinedPath: null,
    answersPath: null,
  });

  res.json({ jobId });

  setImmediate(async () => {
    const job = traceJobs.get(jobId);
    if (!job) return;
    try {
      job.status = "running";
      emitTraceJob(jobId, "job:progress", { step: "setup", message: "Preparazione..." });
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "c3lab-exam-"));
      job.tmpDir = tmpDir;
      const texPath = path.join(tmpDir, "exam.tex");
      fs.writeFileSync(texPath, latex, "utf8");
      copyLatexAssets(collectLatexAssets(latex), tmpDir);
      const texInput = texPath.replace(/\\/g, "/");

      const pdfPaths = [];
      for (let i = 1; i <= versions; i += 1) {
        emitTraceJob(jobId, "job:progress", {
          step: "compile",
          message: `Compilazione versione ${i}/${versions}`,
          version: i,
          total: versions,
        });
        const jobName = `exam-${i}`;
        const texArg = `\\def\\myversion{${i}}\\def\\mynumversions{${versions}}\\def\\myoutput{exam}\\input{${texInput}}`;
        const first = await runPdflatex(tmpDir, jobName, texArg, __dirname);
        if (!first.ok) {
          throw new Error(first.log || first.stderr || first.stdout || "Errore compilazione LaTeX");
        }
        const second = await runPdflatex(tmpDir, jobName, texArg, __dirname);
        if (!second.ok) {
          throw new Error(second.log || second.stderr || second.stdout || "Errore compilazione LaTeX");
        }
        const pdfPath = path.join(tmpDir, `${jobName}.pdf`);
        if (!fs.existsSync(pdfPath)) {
          throw new Error("PDF versione non generato");
        }
        pdfPaths.push(pdfPath);
      }

      emitTraceJob(jobId, "job:progress", { step: "merge", message: "Unione PDF..." });
      const combinedPath = path.join(tmpDir, "exam-all.pdf");
      const merged = await mergePdfs(combinedPath, pdfPaths);
      if (!merged.ok || !fs.existsSync(combinedPath)) {
        throw new Error(merged.error || "Unione PDF fallita");
      }

      emitTraceJob(jobId, "job:progress", { step: "answers", message: "Compilazione soluzioni..." });
      const answersJob = "exam-answers";
      const answersArg = `\\def\\mynumversions{${versions}}\\def\\myoutput{answers}\\input{${texInput}}`;
      const answersFirst = await runPdflatex(tmpDir, answersJob, answersArg, __dirname);
      if (!answersFirst.ok) {
        throw new Error(answersFirst.log || answersFirst.stderr || answersFirst.stdout || "Errore LaTeX (answers)");
      }
      const answersSecond = await runPdflatex(tmpDir, answersJob, answersArg, __dirname);
      if (!answersSecond.ok) {
        throw new Error(answersSecond.log || answersSecond.stderr || answersSecond.stdout || "Errore LaTeX (answers)");
      }
      const answersPath = path.join(tmpDir, `${answersJob}.pdf`);
      if (!fs.existsSync(answersPath)) {
        throw new Error("PDF answers non generato");
      }

      job.status = "done";
      job.combinedPath = combinedPath;
      job.answersPath = answersPath;
      emitTraceJob(jobId, "job:done", {
        combinedUrl: `/api/generate-traces/${jobId}/combined`,
        answersUrl: `/api/generate-traces/${jobId}/answers`,
        combinedName: "tracce.pdf",
        answersName: "tracce-answers.pdf",
      });
      setTimeout(() => cleanupTraceJob(jobId), TRACE_JOB_TTL_MS);
    } catch (err) {
      job.status = "error";
      job.error = err.message || "Errore generazione tracce";
      emitTraceJob(jobId, "job:error", { error: job.error });
      setTimeout(() => cleanupTraceJob(jobId), TRACE_JOB_TTL_MS);
    }
  });
});

router.get("/api/generate-traces/:jobId/:kind", requireRole("admin", "creator"), (req, res) => {
  const { jobId, kind } = req.params;
  const job = traceJobs.get(jobId);
  if (!job || job.status !== "done") {
    res.status(404).json({ error: "Job non trovato o non completato" });
    return;
  }
  const pathMap = {
    combined: { path: job.combinedPath, name: "tracce.pdf" },
    answers: { path: job.answersPath, name: "tracce-answers.pdf" },
  };
  const target = pathMap[kind];
  if (!target || !target.path || !fs.existsSync(target.path)) {
    res.status(404).json({ error: "File non disponibile" });
    return;
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${target.name}`);
  fs.createReadStream(target.path).pipe(res);
});

if (BASE_PATH) {
  app.use(BASE_PATH, router);
  app.use(BASE_PATH, express.static(path.join(__dirname)));
} else {
  app.use(router);
}
app.use(express.static(path.join(__dirname)));

app.use((err, req, res, next) => {
  if (err && err.code === "EBADCSRFTOKEN") {
    if (req.path.startsWith("/api")) {
      res.status(403).json({ error: "CSRF non valido" });
      return;
    }
    res.status(403).send("CSRF non valido");
    return;
  }
  next(err);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
