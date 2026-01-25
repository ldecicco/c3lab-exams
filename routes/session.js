"use strict";

const express = require("express");

const buildSessionRouter = ({ requireAuth, db }) => {
  const router = express.Router();

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

  return router;
};

module.exports = buildSessionRouter;
