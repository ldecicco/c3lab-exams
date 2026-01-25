"use strict";

const express = require("express");

const buildQuestionsRouter = (deps) => {
  const { requireRole, db, upsertTopics, insertQuestion, isQuestionLocked } = deps;
  const router = express.Router();

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

  router.post(
    "/api/questions/:id/duplicate",
    requireRole("admin", "creator"),
    (req, res) => {
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
    }
  );

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

  return router;
};

module.exports = buildQuestionsRouter;
