#!/usr/bin/env node
"use strict";

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const Database = require("better-sqlite3");
const PDFDocument = require("pdfkit");
const xlsx = require("xlsx");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const DATA_DIR = path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const IMAGE_DIR = path.join(DATA_DIR, "images");
fs.mkdirSync(IMAGE_DIR, { recursive: true });
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
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    image_path TEXT,
    image_layout_enabled INTEGER NOT NULL DEFAULT 0,
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
  CREATE TABLE IF NOT EXISTS exam_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    title TEXT,
    result_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(exam_id) REFERENCES exams(id)
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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id, matricola),
    FOREIGN KEY(session_id) REFERENCES exam_sessions(id)
  );
  CREATE INDEX IF NOT EXISTS idx_images_course ON images(course_id);
  CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
  CREATE INDEX IF NOT EXISTS idx_questions_updated ON questions(updated_at);
  CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam ON exam_sessions(exam_id);
  CREATE INDEX IF NOT EXISTS idx_exam_session_students_session ON exam_session_students(session_id);
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
`);

const ensureColumn = (table, column, definition) => {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = rows.some((row) => row.name === column);
  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
};

ensureColumn("exams", "is_draft", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("exams", "locked_at", "TEXT");
ensureColumn("exams", "mapping_json", "TEXT");
ensureColumn("exams", "public_access_enabled", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("exams", "public_access_password_hash", "TEXT");
ensureColumn("exams", "public_access_expires_at", "TEXT");
db.exec("DROP INDEX IF EXISTS idx_exams_draft_course;");

app.use(express.text({ type: ["text/plain", "application/octet-stream"], limit: "5mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.raw({ type: "application/vnd.ms-excel", limit: "5mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 7);
const PUBLIC_ACCESS_TTL_DAYS = Number(process.env.PUBLIC_ACCESS_TTL_DAYS || 30);

const createSession = (userId) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  db.prepare(
    "INSERT INTO auth_sessions (user_id, token, expires_at) VALUES (?, ?, ?)"
  ).run(userId, token, expiresAt.toISOString());
  return { token, expiresAt };
};

const getUserFromToken = (token) => {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role, s.expires_at
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
  return { id: row.id, username: row.username, role: row.role };
};

const loadUser = (req, res, next) => {
  const token = req.cookies?.session_token;
  const user = getUserFromToken(token);
  req.user = user || null;
  res.locals.user = user || null;
  next();
};

app.use(loadUser);

const requireAuth = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: "Autenticazione richiesta" });
    return;
  }
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: "Autenticazione richiesta" });
    return;
  }
  if (!roles.includes(req.user.role)) {
    res.status(403).json({ error: "Permessi insufficienti" });
    return;
  }
  next();
};

const requirePageRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    res.redirect("/login");
    return;
  }
  if (!roles.includes(req.user.role)) {
    res.status(403).send("Permessi insufficienti");
    return;
  }
  next();
};

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

app.get("/", (req, res) => res.redirect("/index"));
app.get("/login", (req, res) => res.render("login"));
app.get("/index", (req, res) => res.render("index"));
app.get("/index.html", (req, res) => res.render("index"));
app.get("/questions", requirePageRole("admin", "creator"), (req, res) =>
  res.render("questions")
);
app.get("/questions.html", requirePageRole("admin", "creator"), (req, res) =>
  res.render("questions")
);
app.get("/exam-builder", requirePageRole("admin", "creator"), (req, res) =>
  res.render("exam-builder")
);
app.get("/exam-builder.html", requirePageRole("admin", "creator"), (req, res) =>
  res.render("exam-builder")
);
app.get("/dashboard", requirePageRole("admin", "creator"), (req, res) =>
  res.render("dashboard")
);
app.get("/dashboard.html", requirePageRole("admin", "creator"), (req, res) =>
  res.render("dashboard")
);
app.get("/admin", requirePageRole("admin"), (req, res) => res.render("admin"));
app.get("/admin.html", requirePageRole("admin"), (req, res) =>
  res.render("admin")
);

app.get("/logout", (req, res) => {
  const token = req.cookies?.session_token;
  if (token) {
    db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
  }
  res.clearCookie("session_token");
  res.redirect("/login");
});

app.post("/auth/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!username || !password) {
    res.status(400).json({ error: "Credenziali mancanti" });
    return;
  }
  const user = db
    .prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?")
    .get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: "Credenziali non valide" });
    return;
  }
  const session = createSession(user.id);
  res.cookie("session_token", session.token, {
    httpOnly: true,
    sameSite: "lax",
    expires: session.expiresAt,
  });
  res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
});

app.post("/auth/logout", (req, res) => {
  const token = req.cookies?.session_token;
  if (token) {
    db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
  }
  res.clearCookie("session_token");
  res.json({ ok: true });
});

app.get("/auth/me", (req, res) => {
  res.json({ user: req.user || null });
});

app.get("/api/users", requireRole("admin"), (req, res) => {
  const users = db
    .prepare("SELECT id, username, role, created_at FROM users ORDER BY username")
    .all();
  res.json({ users });
});

app.post("/api/users", requireRole("admin"), (req, res) => {
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

app.put("/api/users/:id", requireRole("admin"), (req, res) => {
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
  db.prepare(`UPDATE users SET ${updates.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

app.delete("/api/users/:id", requireRole("admin"), (req, res) => {
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

app.get("/api/public-exams", (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.id, e.title, e.date, c.name AS course_name
         FROM exams e
         JOIN courses c ON c.id = e.course_id
        WHERE e.public_access_enabled = 1
          AND (e.public_access_expires_at IS NULL OR e.public_access_expires_at > datetime('now'))
        ORDER BY e.date DESC, e.updated_at DESC`
    )
    .all();
  res.json({ exams: rows });
});

app.post("/api/public-results", (req, res) => {
  const examId = Number(req.body.examId);
  const matricola = String(req.body.matricola || "").trim();
  const password = String(req.body.password || "");
  if (!Number.isFinite(examId) || !matricola || !password) {
    res.status(400).json({ error: "Dati mancanti" });
    return;
  }
  const exam = db
    .prepare(
      `SELECT e.id, e.title, e.date, e.mapping_json, e.public_access_enabled,
              e.public_access_password_hash, e.public_access_expires_at,
              c.name AS course_name
         FROM exams e
         JOIN courses c ON c.id = e.course_id
        WHERE e.id = ?`
    )
    .get(examId);
  if (!exam) {
    res.status(404).json({ error: "Traccia non trovata" });
    return;
  }
  if (!exam.public_access_enabled) {
    res.status(403).json({ error: "Accesso non abilitato per questa traccia." });
    return;
  }
  if (exam.public_access_expires_at && new Date(exam.public_access_expires_at) <= new Date()) {
    res.status(403).json({ error: "Accesso scaduto." });
    return;
  }
  if (!bcrypt.compareSync(password, exam.public_access_password_hash || "")) {
    res.status(401).json({ error: "Password non valida." });
    return;
  }
  if (!exam.mapping_json) {
    res.status(400).json({ error: "Mapping non disponibile." });
    return;
  }
  let mapping;
  try {
    mapping = JSON.parse(exam.mapping_json);
  } catch {
    res.status(400).json({ error: "Mapping non valido." });
    return;
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
    res.status(404).json({ error: "Matricola non trovata." });
    return;
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
    return {
      id: row.id,
      position: row.position,
      text: row.text,
      type: row.type,
      answers,
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
    const displayedAnswers = order.map((originalAnswerIndex, idx) => {
      const answer = q.answers[originalAnswerIndex - 1];
      const letter = ANSWER_OPTIONS[idx] || String(idx + 1);
      return {
        letter,
        text: answer.text,
        isCorrect: Boolean(answer.isCorrect),
        selected: selectedLetters.includes(letter),
      };
    });
    return {
      index: displayedIndex + 1,
      text: q.text,
      type: q.type,
      answers: displayedAnswers,
      selectedLetters,
    };
  });

  res.json({
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
  });
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

const runPdflatex = (cwd, jobName, texArg) =>
  new Promise((resolve) => {
    const args = [
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-output-directory",
      cwd,
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

app.post("/api/mapping", (req, res) => {
  try {
    const mapping = convertRtoMapping(req.body || "");
    res.json(mapping);
  } catch (err) {
    res.status(400).json({ error: err.message || "Invalid R file" });
  }
});

app.get("/api/courses", requireRole("admin", "creator"), (req, res) => {
  const rows = db.prepare("SELECT id, name, code FROM courses ORDER BY name").all();
  res.json({ courses: rows });
});

app.post("/api/courses", requireRole("admin"), (req, res) => {
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

app.get("/api/topics", requireRole("admin", "creator"), (req, res) => {
  const courseId = Number(req.query.courseId);
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "courseId mancante" });
    return;
  }
  const rows = db
    .prepare("SELECT id, name FROM topics WHERE course_id = ? ORDER BY name")
    .all(courseId);
  res.json({ topics: rows });
});

app.post("/api/topics", requireRole("admin"), (req, res) => {
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

app.delete("/api/topics/:id", requireRole("admin"), (req, res) => {
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

app.get("/api/images", requireRole("admin", "creator"), (req, res) => {
  const courseId = Number(req.query.courseId);
  if (!Number.isFinite(courseId)) {
    res.status(400).json({ error: "courseId mancante" });
    return;
  }
  const rows = db
    .prepare(
      `SELECT id, name, description, original_name, file_path, mime_type
         FROM images
        WHERE course_id = ?
        ORDER BY created_at DESC`
    )
    .all(courseId);
  res.json({ images: rows });
});

app.post("/api/images", requireRole("admin", "creator"), (req, res) => {
  const payload = req.body || {};
  const courseId = Number(payload.courseId);
  const name = String(payload.name || "").trim();
  const description = String(payload.description || "").trim();
  const originalName = String(payload.originalName || "").trim();
  const dataBase64 = String(payload.dataBase64 || "").trim();
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
  const info = db
    .prepare(
      `INSERT INTO images (course_id, name, description, original_name, file_path, mime_type)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      courseId,
      name || originalName || fileName,
      description || null,
      originalName || null,
      relPath,
      String(payload.mimeType || "") || null
    );
  const image = db
    .prepare(
      `SELECT id, name, description, original_name, file_path, mime_type
         FROM images WHERE id = ?`
    )
    .get(info.lastInsertRowid);
  res.json({ image });
});

app.delete("/api/images/:id", requireRole("admin", "creator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const image = db
    .prepare("SELECT id, file_path FROM images WHERE id = ?")
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
  db.prepare("DELETE FROM images WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.delete("/api/courses/:id", requireRole("admin"), (req, res) => {
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

app.get("/api/questions", requireRole("admin", "creator"), (req, res) => {
  const courseId = Number(req.query.courseId);
  const topicId = Number(req.query.topicId);
  const search = String(req.query.search || "").trim();
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
  const stmt = db.prepare(`
    SELECT q.id, q.text, q.type, q.image_path,
           GROUP_CONCAT(DISTINCT t.name) AS topics,
           MAX(e.date) AS last_exam_date
      FROM questions q
      LEFT JOIN question_topics qt ON qt.question_id = q.id
      LEFT JOIN topics t ON t.id = qt.topic_id
      LEFT JOIN courses c ON c.id = t.course_id
      LEFT JOIN exam_questions eq ON eq.question_id = q.id
      LEFT JOIN exams e ON e.id = eq.exam_id
      ${whereSql}
     GROUP BY q.id
     ORDER BY q.updated_at DESC
     LIMIT ${limit}
  `);
  const rows = stmt.all(...params).map((row) => ({
    ...row,
    topics: row.topics ? row.topics.split(",") : [],
    last_exam_date: row.last_exam_date || "",
  }));
  res.json({ questions: rows });
});

app.post("/api/questions", requireRole("admin", "creator"), (req, res) => {
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

app.post("/api/questions/:id/duplicate", requireRole("admin", "creator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const requestedCourseId = Number((req.body || {}).courseId);
  const question = db
    .prepare(
      `SELECT id, text, type, image_path, image_layout_enabled,
              image_left_width, image_right_width, image_scale
         FROM questions
        WHERE id = ?`
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
      "SELECT position, text, is_correct FROM answers WHERE question_id = ? ORDER BY position"
    )
    .all(id)
    .map((row) => ({
      text: row.text,
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
      type: question.type,
      imagePath: question.image_path,
      imageLayoutEnabled: Boolean(question.image_layout_enabled),
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

app.put("/api/questions/:id", requireRole("admin", "creator"), (req, res) => {
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
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE questions
          SET text = ?, type = ?, image_path = ?, image_layout_enabled = ?,
              image_left_width = ?, image_right_width = ?, image_scale = ?,
              updated_at = datetime('now')
        WHERE id = ?`
    ).run(
      question.text,
      question.type,
      question.imagePath || null,
      question.imageLayoutEnabled ? 1 : 0,
      question.imageLeftWidth || null,
      question.imageRightWidth || null,
      question.imageScale || null,
      id
    );
    db.prepare("DELETE FROM answers WHERE question_id = ?").run(id);
    db.prepare("DELETE FROM question_topics WHERE question_id = ?").run(id);
    const answers = Array.isArray(question.answers) ? question.answers : [];
    const insertAnswer = db.prepare(
      "INSERT INTO answers (question_id, position, text, is_correct) VALUES (?, ?, ?, ?)"
    );
    answers.forEach((answer, idx) => {
      insertAnswer.run(id, idx + 1, answer.text || "", answer.isCorrect ? 1 : 0);
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

app.delete("/api/questions/:id", requireRole("admin", "creator"), (req, res) => {
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

app.get("/api/questions/:id", requireRole("admin", "creator"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const question = db
    .prepare(
      `SELECT id, text, type, image_path, image_layout_enabled,
              image_left_width, image_right_width, image_scale
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
      "SELECT position, text, is_correct FROM answers WHERE question_id = ? ORDER BY position"
    )
    .all(id)
    .map((row) => ({
      position: row.position,
      text: row.text,
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
      type: question.type,
      imagePath: question.image_path || "",
      imageLayoutEnabled: Boolean(question.image_layout_enabled),
      imageLeftWidth: question.image_left_width || "",
      imageRightWidth: question.image_right_width || "",
      imageScale: question.image_scale || "",
      answers,
      topics,
      topicIds,
    },
  });
});

app.get("/api/exams", requireRole("admin", "creator", "evaluator"), (req, res) => {
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

app.get("/api/exams/stats", requireRole("admin", "creator", "evaluator"), (req, res) => {
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

app.get("/api/exams/:id", requireRole("admin", "creator", "evaluator"), (req, res) => {
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
              public_access_enabled, public_access_expires_at
         FROM exams WHERE id = ?`
    )
    .get(id);
  if (!exam) {
    res.status(404).json({ error: "Esame non trovato" });
    return;
  }
  const questionRows = db
    .prepare(
      `SELECT eq.position, q.id, q.text, q.type, q.image_path, q.image_layout_enabled,
              q.image_left_width, q.image_right_width, q.image_scale
         FROM exam_questions eq
         JOIN questions q ON q.id = eq.question_id
        WHERE eq.exam_id = ?
        ORDER BY eq.position`
    )
    .all(id);
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
      imagePath: row.image_path || "",
      imageLayoutEnabled: Boolean(row.image_layout_enabled),
      imageLeftWidth: row.image_left_width || "",
      imageRightWidth: row.image_right_width || "",
      imageScale: row.image_scale || "",
      answers,
      topics,
    };
  });
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
      publicAccessExpiresAt: exam.public_access_expires_at || "",
    },
    questions,
  });
});

app.post("/api/exams/:id/public-access", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const examId = Number(req.params.id);
  if (!Number.isFinite(examId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const payload = req.body || {};
  const enabled = Boolean(payload.enabled);
  if (!enabled) {
    db.prepare(
      `UPDATE exams
          SET public_access_enabled = 0,
              public_access_password_hash = NULL,
              public_access_expires_at = NULL
        WHERE id = ?`
    ).run(examId);
    res.json({ ok: true });
    return;
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
            public_access_expires_at = ?
      WHERE id = ?`
  ).run(hash, expiresAt.toISOString(), examId);
  res.json({ ok: true });
});

app.get("/api/exams/draft", requireRole("admin", "creator"), (req, res) => {
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
  const questionRows = db
    .prepare(
      `SELECT eq.position, q.id, q.text, q.type, q.image_path, q.image_layout_enabled,
              q.image_left_width, q.image_right_width, q.image_scale
         FROM exam_questions eq
         JOIN questions q ON q.id = eq.question_id
        WHERE eq.exam_id = ?
        ORDER BY eq.position`
    )
    .all(draft.id);
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
      imagePath: row.image_path || "",
      imageLayoutEnabled: Boolean(row.image_layout_enabled),
      imageLeftWidth: row.image_left_width || "",
      imageRightWidth: row.image_right_width || "",
      imageScale: row.image_scale || "",
      answers,
      topics,
    };
  });
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
        (text, type, image_path, image_layout_enabled, image_left_width, image_right_width, image_scale)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      question.text,
      question.type,
      question.imagePath || null,
      question.imageLayoutEnabled ? 1 : 0,
      question.imageLeftWidth || null,
      question.imageRightWidth || null,
      question.imageScale || null
    );
  const questionId = info.lastInsertRowid;
  const answers = Array.isArray(question.answers) ? question.answers : [];
  const insertAnswer = db.prepare(
    "INSERT INTO answers (question_id, position, text, is_correct) VALUES (?, ?, ?, ?)"
  );
  answers.forEach((answer, idx) => {
    insertAnswer.run(
      questionId,
      idx + 1,
      answer.text || "",
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

const replaceExamQuestions = (examId, questions, courseId, cleanupPrevious) => {
  const prevRows = db
    .prepare("SELECT question_id FROM exam_questions WHERE exam_id = ?")
    .all(examId)
    .map((row) => row.question_id);
  db.prepare("DELETE FROM exam_questions WHERE exam_id = ?").run(examId);
  if (cleanupPrevious && prevRows.length) {
    const unique = Array.from(new Set(prevRows));
    const inUseStmt = db.prepare(
      "SELECT 1 FROM exam_questions WHERE question_id = ? LIMIT 1"
    );
    const deleteAnswers = db.prepare("DELETE FROM answers WHERE question_id = ?");
    const deleteTopics = db.prepare("DELETE FROM question_topics WHERE question_id = ?");
    const deleteQuestion = db.prepare("DELETE FROM questions WHERE id = ?");
    unique.forEach((qid) => {
      const inUse = inUseStmt.get(qid);
      if (!inUse) {
        deleteAnswers.run(qid);
        deleteTopics.run(qid);
        deleteQuestion.run(qid);
      }
    });
  }
  const insertEq = db.prepare(
    "INSERT INTO exam_questions (exam_id, question_id, position) VALUES (?, ?, ?)"
  );
  questions.forEach((question, idx) => {
    const questionId = insertQuestion(question, courseId);
    insertEq.run(examId, questionId, idx + 1);
  });
};

app.post("/api/exams", requireRole("admin", "creator"), (req, res) => {
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
    replaceExamQuestions(examId, questions, courseId, false);
    return examId;
  });
  const examId = tx();
  res.json({ examId });
});

app.put("/api/exams/:id", requireRole("admin", "creator"), (req, res) => {
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
    replaceExamQuestions(examId, questions, courseId, false);
  });
  tx();
  res.json({ examId });
});

app.post("/api/exams/draft", (req, res) => {
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
      replaceExamQuestions(existing.id, questions, courseId, true);
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
    replaceExamQuestions(examId, questions, courseId, false);
    return examId;
  });
  const examId = tx();
  res.json({ examId });
});

app.post("/api/exams/:id/lock", requireRole("admin", "creator"), async (req, res) => {
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

  const jobName = "exam-map";
  const texArg = `\\def\\myversion{1}\\def\\mynumversions{${versions}}\\def\\myoutput{exam}\\input{exam.tex}`;
  const first = await runPdflatex(tmpDir, jobName, texArg);
  if (!first.ok) {
    res.status(400).json({
      error: "Errore compilazione LaTeX",
      log: first.log || first.stderr || first.stdout,
    });
    return;
  }
  const second = await runPdflatex(tmpDir, jobName, texArg);
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

  db.prepare(
    "UPDATE exams SET is_draft = 0, locked_at = datetime('now'), mapping_json = ? WHERE id = ?"
  ).run(mappingJson, examId);
  res.json({ ok: true });
});

app.post("/api/exams/:id/unlock", requireRole("admin", "creator"), (req, res) => {
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
  db.prepare(
    "UPDATE exams SET is_draft = 1, locked_at = NULL WHERE id = ?"
  ).run(examId);
  res.json({ ok: true });
});

app.get("/api/exams/:id/mapping", requireRole("admin", "creator", "evaluator"), (req, res) => {
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

app.get("/api/exams/:id/sessions", requireRole("admin", "creator", "evaluator"), (req, res) => {
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

app.post("/api/exams/:id/sessions", requireRole("admin", "creator", "evaluator"), (req, res) => {
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
  const info = db
    .prepare(
      `INSERT INTO exam_sessions (exam_id, title, result_date, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`
    )
    .run(examId, title, resultDate);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.get("/api/sessions/:id", requireRole("admin", "creator", "evaluator"), (req, res) => {
  const sessionId = Number(req.params.id);
  if (!Number.isFinite(sessionId)) {
    res.status(400).json({ error: "Id non valido" });
    return;
  }
  const session = db
    .prepare(
      `SELECT id, exam_id, title, result_date, created_at, updated_at
         FROM exam_sessions WHERE id = ?`
    )
    .get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Sessione non trovata" });
    return;
  }
  const students = db
    .prepare(
      `SELECT matricola, nome, cognome, versione, answers_json, overrides_json
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
    }));
  res.json({ session, students });
});

app.put("/api/sessions/:id", requireRole("admin", "creator", "evaluator"), (req, res) => {
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

  const updateSession = db.prepare(
    `UPDATE exam_sessions
        SET title = ?, result_date = ?, updated_at = datetime('now')
      WHERE id = ?`
  );
  const deleteStudents = db.prepare(
    "DELETE FROM exam_session_students WHERE session_id = ?"
  );
  const insertStudent = db.prepare(
    `INSERT INTO exam_session_students
      (session_id, matricola, nome, cognome, versione, answers_json, overrides_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  );

  const tx = db.transaction(() => {
    updateSession.run(title, resultDate, sessionId);
    deleteStudents.run(sessionId);
    students.forEach((student) => {
      if (!student || !student.matricola) return;
      const answers = Array.isArray(student.answers) ? student.answers : [];
      const overrides = Array.isArray(student.overrides) ? student.overrides : [];
      insertStudent.run(
        sessionId,
        String(student.matricola).trim(),
        student.nome ? String(student.nome).trim() : "",
        student.cognome ? String(student.cognome).trim() : "",
        student.versione ? Number(student.versione) : null,
        JSON.stringify(answers),
        JSON.stringify(overrides)
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

app.delete("/api/sessions/:id", requireRole("admin", "creator", "evaluator"), (req, res) => {
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

app.delete("/api/exams/:id", requireRole("admin", "creator"), (req, res) => {
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
    db.prepare("DELETE FROM exam_questions WHERE exam_id = ?").run(examId);
    db.prepare("DELETE FROM exams WHERE id = ?").run(examId);
  });
  tx();
  res.json({ ok: true });
});

app.post("/api/exams/:id/clear-results", requireRole("admin", "creator"), (req, res) => {
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

app.post("/api/results-pdf", requireRole("admin", "creator", "evaluator"), (req, res) => {
  try {
    const payload = req.body || {};
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const date = payload.date || "";
    const title = "Fondamenti di Automatica - Mod. 1";
    const department = "Ing. Informatica e dell'Automazione";
    const uni = `Politecnico di Bari${date ? " - " + date : ""}`;
    // const note = "N.B. E' obbligatorio scrivere il proprio nome, cognome e matricola su tutti i fogli.";
    const logoPath = path.join(__dirname, "logo_poliba_esteso_trasparente.png");
    const fontRegularPath = path.join(__dirname, "fonts", "Roboto-Regular.ttf");
    const fontBoldPath = path.join(__dirname, "fonts", "Roboto-Bold.ttf");

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=risultati.pdf");
    doc.pipe(res);

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 32, { width: 120 });
    }

    let fontRegular = "Times-Roman";
    let fontBold = "Times-Bold";
    if (fs.existsSync(fontRegularPath) && fs.existsSync(fontBoldPath)) {
      doc.registerFont("Roboto", fontRegularPath);
      doc.registerFont("Roboto-Bold", fontBoldPath);
      fontRegular = "Roboto";
      fontBold = "Roboto-Bold";
    }

    doc.font(fontBold).fontSize(14).text(title, 180, 36, { align: "right" });
    doc.font(fontRegular).fontSize(11).text(department, 180, 56, { align: "right" });
    doc.font(fontRegular).fontSize(11).text(uni, 180, 72, { align: "right" });
    // doc.font("Times-Italic").fontSize(9).text(note, 180, 90, { align: "right" });

    doc.moveDown(4);
    // doc.font("Times-Bold").fontSize(13).text("Risultati (voto / 30)", { align: "left" });
    // doc.moveDown(0.5);

    const startY = doc.y;
    const colX = [40, 160, 290, 400, 480];
    const tableLeft = 40;
    const tableRight = 555;
    const rowHeight = 16;
    const headers = ["Matricola", "Nome", "Cognome", "Voto / 30", "Voto norm."];
    doc.font(fontBold).fontSize(10);
    headers.forEach((h, idx) => {
      doc.text(h, colX[idx], startY, { width: colX[idx + 1] ? colX[idx + 1] - colX[idx] - 10 : 80 });
    });
    doc.moveDown(0.6);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.4);

    doc.font(fontRegular).fontSize(10);
    rows.forEach((row, idx) => {
      let y = doc.y;
      if (y + rowHeight > 760) {
        doc.addPage();
        y = doc.y;
      }
      if (idx % 2 === 0) {
        doc.save();
        doc.fillColor("#f3f6fb");
        doc.rect(tableLeft, y - 2, tableRight - tableLeft, rowHeight).fill();
        doc.restore();
      }
      doc.fillColor("#000");
      doc.text(String(row.matricola ?? ""), colX[0], y, { width: 110, lineBreak: false });
      doc.text(String(row.nome ?? ""), colX[1], y, { width: 120, lineBreak: false });
      doc.text(String(row.cognome ?? ""), colX[2], y, { width: 100, lineBreak: false });
      doc.text(String(row.grade ?? ""), colX[3], y, { width: 70, lineBreak: false });
      doc.text(String(row.gradeNorm ?? ""), colX[4], y, { width: 60, lineBreak: false });
      doc.y = y + rowHeight;
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message || "PDF error" });
  }
});

app.post("/api/import-esse3", requireRole("admin", "creator", "evaluator"), (req, res) => {
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

app.post("/api/results-xls", requireRole("admin", "creator", "evaluator"), (req, res) => {
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

app.post("/api/compile-pdf", requireRole("admin", "creator"), async (req, res) => {
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

app.post("/api/generate-traces", requireRole("admin", "creator"), async (req, res) => {
  try {
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

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "c3lab-exam-"));
    const texPath = path.join(tmpDir, "exam.tex");
    fs.writeFileSync(texPath, latex, "utf8");
    copyLatexAssets(collectLatexAssets(latex), tmpDir);

    const pdfPaths = [];
    for (let i = 1; i <= versions; i += 1) {
      const jobName = `exam-${i}`;
      const texArg = `\\def\\myversion{${i}}\\def\\mynumversions{${versions}}\\def\\myoutput{exam}\\input{exam.tex}`;
      const first = await runPdflatex(tmpDir, jobName, texArg);
      if (!first.ok) {
        res.status(400).json({
          error: "Errore compilazione LaTeX",
          log: first.log || first.stderr || first.stdout,
        });
        return;
      }
      const second = await runPdflatex(tmpDir, jobName, texArg);
      if (!second.ok) {
        res.status(400).json({
          error: "Errore compilazione LaTeX",
          log: second.log || second.stderr || second.stdout,
        });
        return;
      }
      const pdfPath = path.join(tmpDir, `${jobName}.pdf`);
      if (!fs.existsSync(pdfPath)) {
        res.status(500).json({ error: "PDF versione non generato" });
        return;
      }
      pdfPaths.push(pdfPath);
    }

    const combinedPath = path.join(tmpDir, "exam-all.pdf");
    const merged = await mergePdfs(combinedPath, pdfPaths);
    if (!merged.ok || !fs.existsSync(combinedPath)) {
      res.status(500).json({ error: merged.error || "Unione PDF fallita" });
      return;
    }

    const answersJob = "exam-answers";
    const answersArg = `\\def\\mynumversions{${versions}}\\def\\myoutput{answers}\\input{exam.tex}`;
    const answersFirst = await runPdflatex(tmpDir, answersJob, answersArg);
    if (!answersFirst.ok) {
      res.status(400).json({
        error: "Errore compilazione LaTeX (answers)",
        log: answersFirst.log || answersFirst.stderr || answersFirst.stdout,
      });
      return;
    }
    const answersSecond = await runPdflatex(tmpDir, answersJob, answersArg);
    if (!answersSecond.ok) {
      res.status(400).json({
        error: "Errore compilazione LaTeX (answers)",
        log: answersSecond.log || answersSecond.stderr || answersSecond.stdout,
      });
      return;
    }
    const answersPath = path.join(tmpDir, `${answersJob}.pdf`);
    if (!fs.existsSync(answersPath)) {
      res.status(500).json({ error: "PDF answers non generato" });
      return;
    }

    const combinedPdf = fs.readFileSync(combinedPath).toString("base64");
    const answersPdf = fs.readFileSync(answersPath).toString("base64");
    res.json({
      combinedPdfBase64: combinedPdf,
      answersPdfBase64: answersPdf,
      combinedName: "tracce.pdf",
      answersName: "tracce-answers.pdf",
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Errore generazione tracce" });
  }
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
