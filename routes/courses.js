"use strict";

const express = require("express");

const buildCoursesRouter = ({ requireRole, db, gradeStudent, getMaxPoints }) => {
  const router = express.Router();

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

  router.get(
    "/api/courses/:id/grades",
    requireRole("admin", "creator", "evaluator"),
    (req, res) => {
      const courseId = Number(req.params.id);
      if (!Number.isFinite(courseId)) {
        res.status(400).json({ error: "Id non valido" });
        return;
      }
      const rows = db
        .prepare(
          `SELECT es.id AS session_id, es.exam_id, es.target_top_grade,
                  ess.versione, ess.answers_json, ess.overrides_json, ess.normalized_score
             FROM exam_sessions es
             JOIN exam_session_students ess ON ess.session_id = es.id
             JOIN exams e ON e.id = es.exam_id
            WHERE e.course_id = ?`
        )
        .all(courseId);

      const isEvaluated = (row) => {
        const version = Number(row.versione);
        if (!Number.isFinite(version) || version < 1) return false;
        const answers = JSON.parse(row.answers_json || "[]");
        const overrides = JSON.parse(row.overrides_json || "[]");
        const hasAnswer = answers.some((ans) => String(ans || "").trim() !== "");
        const hasOverride = overrides.some((val) => Number.isFinite(Number(val)));
        return hasAnswer || hasOverride;
      };

      const examMappings = new Map();
      const sessions = new Map();
      rows.forEach((row) => {
        if (!isEvaluated(row)) return;
        if (!sessions.has(row.session_id)) {
          sessions.set(row.session_id, {
            examId: row.exam_id,
            targetTopGrade: row.target_top_grade,
            students: [],
          });
        }
        sessions.get(row.session_id).students.push({
          versione: row.versione,
          answers: JSON.parse(row.answers_json || "[]"),
          overrides: JSON.parse(row.overrides_json || "[]"),
          normalizedScore: row.normalized_score,
        });
      });

      const grades = [];
      sessions.forEach((session) => {
        const { examId, targetTopGrade, students } = session;
        if (!examMappings.has(examId)) {
          const exam = db
            .prepare("SELECT mapping_json FROM exams WHERE id = ?")
            .get(examId);
          let mapping = null;
          if (exam?.mapping_json) {
            try {
              mapping = JSON.parse(exam.mapping_json);
            } catch {
              mapping = null;
            }
          }
          examMappings.set(examId, mapping);
        }
        const mapping = examMappings.get(examId);
        const normalizedFromDb = students
          .map((s) => Number(s.normalizedScore))
          .filter((val) => Number.isFinite(val));
        if (normalizedFromDb.length === students.length) {
          grades.push(...normalizedFromDb);
          return;
        }
        if (!mapping) return;
        const scores = students
          .map((student) => gradeStudent(student, mapping))
          .filter((val) => val !== null);
        if (!scores.length) return;
        const maxPoints = getMaxPoints(mapping);
        if (!maxPoints) return;
        const rawGrades = scores.map((points) => (points / maxPoints) * 30);
        const top = Math.max(...rawGrades);
        const target = Number(targetTopGrade);
        const targetTop = Number.isFinite(target) ? target : 30;
        const factor = top > 0 ? targetTop / top : null;
        rawGrades.forEach((grade) => {
          grades.push(Math.round(factor ? grade * factor : grade));
        });
      });

      res.json({ grades });
    }
  );

  router.get(
    "/api/courses/:id/students",
    requireRole("admin", "creator", "evaluator"),
    (req, res) => {
      const courseId = Number(req.params.id);
      if (!Number.isFinite(courseId)) {
        res.status(400).json({ error: "Id non valido" });
        return;
      }
      const rows = db
        .prepare(
          `SELECT ess.matricola, ess.nome, ess.cognome, ess.versione,
                  ess.answers_json, ess.overrides_json, ess.normalized_score,
                  es.id AS session_id, es.exam_id, es.target_top_grade,
                  e.title AS exam_title, e.mapping_json
             FROM exam_sessions es
             JOIN exam_session_students ess ON ess.session_id = es.id
             JOIN exams e ON e.id = es.exam_id
            WHERE e.course_id = ?`
        )
        .all(courseId);

      const isEvaluated = (row) => {
        const version = Number(row.versione);
        if (!Number.isFinite(version) || version < 1) return false;
        const answers = JSON.parse(row.answers_json || "[]");
        const overrides = JSON.parse(row.overrides_json || "[]");
        const hasAnswer = answers.some((ans) => String(ans || "").trim() !== "");
        const hasOverride = overrides.some((val) => Number.isFinite(Number(val)));
        return hasAnswer || hasOverride;
      };

      const sessions = new Map();
      rows.forEach((row) => {
        if (!isEvaluated(row)) return;
        if (!sessions.has(row.session_id)) {
          let mapping = null;
          if (row.mapping_json) {
            try {
              mapping = JSON.parse(row.mapping_json);
            } catch {
              mapping = null;
            }
          }
          sessions.set(row.session_id, {
            examTitle: row.exam_title || "",
            targetTopGrade: row.target_top_grade,
            mapping,
            students: [],
          });
        }
        sessions.get(row.session_id).students.push({
          matricola: row.matricola,
          nome: row.nome || "",
          cognome: row.cognome || "",
          versione: row.versione,
          answers: JSON.parse(row.answers_json || "[]"),
          overrides: JSON.parse(row.overrides_json || "[]"),
          normalizedScore: row.normalized_score,
        });
      });

      const results = [];
      sessions.forEach((session) => {
        const normalizedFromDb = session.students
          .map((s) => Number(s.normalizedScore))
          .filter((val) => Number.isFinite(val));
        if (normalizedFromDb.length === session.students.length) {
          session.students.forEach((student) => {
            results.push({
              matricola: String(student.matricola).trim(),
              nome: student.nome || "",
              cognome: student.cognome || "",
              examTitle: session.examTitle,
              normalizedScore: Number(student.normalizedScore),
            });
          });
          return;
        }
        if (!session.mapping) return;
        const scores = session.students
          .map((student) => gradeStudent(student, session.mapping))
          .filter((val) => val !== null);
        if (!scores.length) return;
        const maxPoints = getMaxPoints(session.mapping);
        if (!maxPoints) return;
        const rawGrades = scores.map((points) => (points / maxPoints) * 30);
        const top = Math.max(...rawGrades);
        const target = Number(session.targetTopGrade);
        const targetTop = Number.isFinite(target) ? target : 30;
        const factor = top > 0 ? targetTop / top : null;
        session.students.forEach((student) => {
          const score = gradeStudent(student, session.mapping);
          if (score === null) return;
          const raw = (score / maxPoints) * 30;
          const normalized = Math.round(factor ? raw * factor : raw);
          results.push({
            matricola: String(student.matricola).trim(),
            nome: student.nome || "",
            cognome: student.cognome || "",
            examTitle: session.examTitle,
            normalizedScore: normalized,
          });
        });
      });

      results.sort((a, b) => b.normalizedScore - a.normalizedScore);
      res.json({ students: results });
    }
  );

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
    const course = db
      .prepare("SELECT id, name, code FROM courses WHERE id = ?")
      .get(info.lastInsertRowid);
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

  return router;
};

module.exports = buildCoursesRouter;
