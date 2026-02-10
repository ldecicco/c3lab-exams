"use strict";

const express = require("express");

const buildExamsRouter = (deps) => {
  const {
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
    normalizeLatexAssetReferences,
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
    computeSuspiciousPairs,
  } = deps;
  const router = express.Router();

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
  const latexRaw = typeof payload.latex === "string" ? payload.latex : "";
  const latex = normalizeLatexAssetReferences(latexRaw);
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

  const result = computeSuspiciousPairs({
    students,
    mapping,
    permutations,
    pairSample,
    alpha,
  });

  res.json(result);
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

    const students = rows
      .map((row) => ({
        matricola: String(row[matricolaKey] || "").trim(),
        nome: String(row[nomeKey] || "").trim(),
        cognome: String(row[cognomeKey] || "").trim(),
      }))
      .filter((row) => row.matricola);

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
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=ListaStudentiEsameRisultati.xls"
    );
    res.end(out);
  } catch (err) {
    res.status(500).json({ error: err.message || "Errore export" });
  }
});

router.post("/api/compile-pdf", requireRole("admin", "creator"), async (req, res) => {
  try {
    const payload = req.body || {};
    const latexRaw = typeof payload.latex === "string" ? payload.latex : "";
    const latex = normalizeLatexAssetReferences(latexRaw);
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
    const pdflatex = spawn("pdflatex", args, { cwd: tmpDir });
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
  const latexRaw = typeof payload.latex === "string" ? payload.latex : "";
  const latex = normalizeLatexAssetReferences(latexRaw);
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
        const first = await runPdflatex(tmpDir, jobName, texArg);
        if (!first.ok) {
          throw new Error(first.log || first.stderr || first.stdout || "Errore compilazione LaTeX");
        }
        const second = await runPdflatex(tmpDir, jobName, texArg);
        if (!second.ok) {
          throw new Error(first.log || first.stderr || first.stdout || "Errore compilazione LaTeX");
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
      const answersFirst = await runPdflatex(tmpDir, answersJob, answersArg);
      if (!answersFirst.ok) {
        throw new Error(
          answersFirst.log || answersFirst.stderr || answersFirst.stdout || "Errore LaTeX (answers)"
        );
      }
      const answersSecond = await runPdflatex(tmpDir, answersJob, answersArg);
      if (!answersSecond.ok) {
        throw new Error(
          answersSecond.log || answersSecond.stderr || answersSecond.stdout || "Errore LaTeX (answers)"
        );
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

  return router;
};

module.exports = buildExamsRouter;
