#!/usr/bin/env node
"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const Database = require("better-sqlite3");
const PDFDocument = require("pdfkit");
const xlsx = require("xlsx");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const IMAGE_DIR = path.join(DATA_DIR, "images");
fs.mkdirSync(IMAGE_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "exam-builder.db"));
db.pragma("journal_mode = WAL");

db.exec(`
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
db.exec("DROP INDEX IF EXISTS idx_exams_draft_course;");

app.use(express.text({ type: ["text/plain", "application/octet-stream"], limit: "5mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.raw({ type: "application/vnd.ms-excel", limit: "5mb" }));

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

app.get("/api/courses", (req, res) => {
  const rows = db.prepare("SELECT id, name, code FROM courses ORDER BY name").all();
  res.json({ courses: rows });
});

app.post("/api/courses", (req, res) => {
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

app.get("/api/topics", (req, res) => {
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

app.post("/api/topics", (req, res) => {
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

app.delete("/api/topics/:id", (req, res) => {
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

app.get("/api/images", (req, res) => {
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

app.post("/api/images", (req, res) => {
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

app.delete("/api/images/:id", (req, res) => {
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

app.delete("/api/courses/:id", (req, res) => {
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

app.get("/api/questions", (req, res) => {
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

app.post("/api/questions", (req, res) => {
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

app.post("/api/questions/:id/duplicate", (req, res) => {
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

app.put("/api/questions/:id", (req, res) => {
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

app.delete("/api/questions/:id", (req, res) => {
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

app.get("/api/questions/:id", (req, res) => {
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

app.get("/api/exams", (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.id, e.title, e.date, e.updated_at, e.course_id,
              e.is_draft, e.locked_at,
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

app.get("/api/exams/:id", (req, res) => {
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
              ) AS has_results
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
    },
    questions,
  });
});

app.get("/api/exams/draft", (req, res) => {
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

app.post("/api/exams", (req, res) => {
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

app.put("/api/exams/:id", (req, res) => {
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

app.post("/api/exams/:id/lock", async (req, res) => {
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

app.post("/api/exams/:id/unlock", (req, res) => {
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

app.get("/api/exams/:id/mapping", (req, res) => {
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

app.get("/api/exams/:id/sessions", (req, res) => {
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

app.post("/api/exams/:id/sessions", (req, res) => {
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

app.get("/api/sessions/:id", (req, res) => {
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

app.put("/api/sessions/:id", (req, res) => {
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

app.delete("/api/sessions/:id", (req, res) => {
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

app.delete("/api/exams/:id", (req, res) => {
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

app.post("/api/exams/:id/clear-results", (req, res) => {
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

app.post("/api/results-pdf", (req, res) => {
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

app.post("/api/import-esse3", (req, res) => {
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

app.post("/api/results-xls", (req, res) => {
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

app.post("/api/compile-pdf", async (req, res) => {
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

app.post("/api/generate-traces", async (req, res) => {
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
