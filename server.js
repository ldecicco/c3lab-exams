#!/usr/bin/env node
"use strict";

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const { spawn, spawnSync } = require("child_process");
const PDFDocument = require("pdfkit");
const xlsx = require("xlsx");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const { app, server, io } = require("./bootstrap");
const { PORT, BASE_PATH, IMAGE_DIR, AVATAR_DIR } = require("./config");
const db = require("./db");
const usersRepo = require("./repositories/usersRepo");
const coursesRepo = require("./repositories/coursesRepo");
const { requireAuth, requireRole, createRequirePageRole } = require("./middlewares/auth");
const {
  initHelmet,
  createRateLimiter,
  createCsrfProtection,
  applyCsrfToken,
  ensureCsrfLocals,
} = require("./middlewares/security");
const buildAuthRouter = require("./routes/auth");
const buildPagesRouter = require("./routes/pages");
const buildSessionRouter = require("./routes/session");
const buildUsersRouter = require("./routes/users");
const buildCoursesRouter = require("./routes/courses");
const buildExamsRouter = require("./routes/exams");
const buildQuestionsRouter = require("./routes/questions");
const buildImagesRouter = require("./routes/images");
const buildGradingRouter = require("./routes/grading");
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

initHelmet(app);



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

const loadUser = (req, res, next) => {
  const token = req.cookies?.session_token;
  const user = usersRepo.getUserBySessionToken(token);
  req.user = user || null;
  req.activeCourseId = user?.activeCourseId ?? null;
  req.activeExamId = user?.activeExamId ?? null;
  req.sessionToken = token || null;
  res.locals.user = user || null;
  res.locals.requireTwoFactor = REQUIRE_2FA && Boolean(user && !user.totpEnabled);
  res.locals.activeCourseId = user?.activeCourseId ?? null;
  res.locals.activeCourseName = user?.activeCourseId
    ? coursesRepo.getCourseNameById(user.activeCourseId)
    : null;
  res.locals.activeExamTitle = user?.activeExamId
    ? coursesRepo.getExamTitleById(user.activeExamId)
    : null;
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
  const username = process.env.ADMIN_USER || "admin";
  const password = process.env.ADMIN_PASS || "admin";
  const created = usersRepo.ensureAdminUser(username, password);
  if (created) {
    console.log(`Admin user creato: ${username}`);
  }
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

router.use(
  buildPagesRouter({
    BASE_PATH,
    requireAuth,
    requirePageRole,
  })
);

router.use(
  buildAuthRouter({
    BASE_PATH,
    USE_SECURE_COOKIES,
    REQUIRE_2FA,
    loginLimiter,
    db,
    bcrypt,
    speakeasy,
    logSecurityEvent,
    createSession,
    createTwoFaToken,
    SESSION_COOKIE_OPTIONS,
    requireAuth,
  })
);

router.use(
  buildSessionRouter({
    requireAuth,
    db,
  })
);

router.use(
  buildUsersRouter({
    requireAuth,
    requireRole,
    db,
    AVATAR_DIR,
    detectExtension,
    stripDataUrl,
    logSecurityEvent,
    createSession,
    SESSION_COOKIE_OPTIONS,
  })
);

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

function detectExtension(originalName, dataBase64) {
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
}

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

function stripDataUrl(dataBase64) {
  const parts = String(dataBase64 || "").split(",");
  return parts.length > 1 ? parts[1] : parts[0];
}

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

function getMaxPoints(mapping) {
  return mapping.correctiondictionary.reduce(
    (sum, row) => sum + getQuestionPoints(row),
    0
  );
}

function gradeStudent(student, mapping) {
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
}

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

router.use(
  buildCoursesRouter({
    requireRole,
    db,
    gradeStudent,
    getMaxPoints,
  })
);

router.use(
  buildExamsRouter({
    requireRole,
    db,
    gradeStudent,
    getMaxPoints,
    getExamQuestions,
    getExamSnapshotQuestions,
    upsertTopics,
    insertQuestion,
    convertRtoMapping,
    runPdflatex,
    copyLatexAssets,
    collectLatexAssets,
    fs,
    path,
    os,
    xlsx,
    spawn,
    crypto,
    traceJobs,
    emitTraceJob,
    mergePdfs,
    cleanupTraceJob,
    TRACE_JOB_TTL_MS,
    logSecurityEvent,
    PUBLIC_ACCESS_TTL_DAYS,
    bcrypt,
  })
);

router.use(
  buildQuestionsRouter({
    requireRole,
    db,
    upsertTopics,
    insertQuestion,
    isQuestionLocked,
  })
);

router.use(
  buildImagesRouter({
    requireRole,
    db,
    IMAGE_DIR,
    detectExtension,
    sanitizeFileBase,
    stripDataUrl,
    canThumbnailExtension,
    generateThumbnail,
    fs,
    path,
  })
);

router.use(
  buildGradingRouter({
    db,
    bcrypt,
    requireAuth,
    publicExamsLimiter,
    publicResultsLimiter,
    gradeStudent,
    getMaxPoints,
    getQuestionPoints,
    ANSWER_OPTIONS,
  })
);


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
