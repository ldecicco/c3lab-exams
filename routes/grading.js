"use strict";

const express = require("express");

const buildGradingRouter = (deps) => {
  const {
    db,
    bcrypt,
    requireAuth,
    publicExamsLimiter,
    publicResultsLimiter,
    gradeStudent,
    getMaxPoints,
    getQuestionPoints,
    ANSWER_OPTIONS,
  } = deps;
  const router = express.Router();

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
        `SELECT ess.matricola, ess.nome, ess.cognome, ess.versione,
                ess.answers_json, ess.overrides_json, ess.normalized_score
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
    const rawGrade =
      Math.round(((gradeStudent(student, mapping) || 0) / maxPoints) * 300) / 10;
    const grades = scores.map((points) => (maxPoints ? (points / maxPoints) * 30 : 0));
    const top = grades.length ? Math.max(...grades) : null;
    const factor = top && top > 0 ? 30 / top : null;
    const normalizedFromDb = Number(studentRow.normalized_score);
    const normalizedGrade = Number.isFinite(normalizedFromDb)
      ? normalizedFromDb
      : (factor ? Math.round(rawGrade * factor) : Math.round(rawGrade));

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
          note: allowNotes ? answer.note || "" : "",
          isCorrect: Boolean(answer.isCorrect),
          selected: selectedLetters.includes(letter),
        };
      });
      const pointsTotal =
        getQuestionPoints(mapping.correctiondictionary?.[originalIndex] || []) || 0;
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
    console.log(
      `[study-advice-prompt] Request: examId=${examId}, matricola=${matricola}`
    );
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

    console.log(
      `[study-advice-prompt-admin] Request: examId=${examId}, matricola=${matricola}`
    );
    console.log(`[study-advice-prompt-admin] Session:`, req.session);

    try {
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
        return res
          .status(404)
          .json({ error: "Traccia non trovata o mapping non disponibile" });
      }

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
    const rawGrade =
      Math.round(((gradeStudent(student, mapping) || 0) / maxPoints) * 300) / 10;
    const grades = scores.map((points) => (maxPoints ? (points / maxPoints) * 30 : 0));
    const top = grades.length ? Math.max(...grades) : null;
    const factor = top && top > 0 ? 30 / top : null;
    const normalizedGrade = factor ? Math.round(rawGrade * factor) : Math.round(rawGrade);

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
          note: answer.note || "",
          isCorrect: Boolean(answer.isCorrect),
          selected: selectedLetters.includes(letter),
        };
      });
      const pointsTotal =
        getQuestionPoints(mapping.correctiondictionary?.[originalIndex] || []) || 0;
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

    const totalQuestions = questions.length;
    const correctAnswers = questions.filter((q) => q.isCorrect).length;
    const wrongAnswers = totalQuestions - correctAnswers;

    const topicPerformance = {};
    questions.forEach((q) => {
      const topics = q.topics && q.topics.length > 0 ? q.topics : ["Generale"];
      topics.forEach((topic) => {
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

    const topicSummary = Object.entries(topicPerformance)
      .map(([topic, perf]) => {
        const total = perf.correct + perf.wrong;
        const successRate = total > 0 ? Math.round((perf.correct / total) * 100) : 0;
        return `- ${topic}: ${perf.correct}/${total} corrette (${successRate}%)`;
      })
      .join("\n");

    const questionDetails = questions
      .map((q, idx) => {
        const topicsList =
          q.topics && q.topics.length > 0 ? q.topics.join(", ") : "Generale";
        const status = q.isCorrect ? "✓ CORRETTA" : "✗ ERRATA";
        const statusNote = q.isOverride ? " (punteggio manuale)" : "";

        let detail = `\n### Domanda ${idx + 1} [${status}${statusNote}]\n`;
        detail += `**Argomento**: ${topicsList}\n`;
        detail += `**Punti**: ${q.pointsEarned}/${q.pointsTotal}\n\n`;
        detail += `**Testo domanda**:\n${q.text}\n\n`;
        detail += `**Opzioni di risposta**:\n`;

        q.answers.forEach((ans) => {
          const marker = ans.isCorrect ? "[CORRETTA]" : "";
          const selected = ans.selected ? "← SELEZIONATA" : "";
          detail += `${ans.letter}. ${ans.text} ${marker} ${selected}\n`;
        });

        detail += `\n**Risposta dello studente**: ${
          q.selectedLetters.length > 0 ? q.selectedLetters.join(", ") : "Nessuna risposta"
        }\n`;
        detail += `**Risposta corretta**: ${q.correctLetters.join(", ")}\n`;

        return detail;
      })
      .join("\n---\n");

    const successPercentage =
      totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const prompt = `Sei un assistente educativo del Politecnico di Bari. Il tuo compito è fornire consigli di studio personalizzati a uno studente basandoti sui risultati del suo esame.

## CONTESTO ESAME
- Corso: ${exam.courseName}
- Esame: ${exam.title}
- Data: ${exam.date || "N/A"}
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

    if (!mapping.questiondictionary || !mapping.randomizedanswersdictionary) {
      throw new Error("Mapping dell'esame non completo o non valido");
    }

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
        const hasAnswers =
          student.answers && student.answers.some((a) => a && String(a).trim() !== "");
        const hasOverrides =
          student.overrides &&
          Object.keys(student.overrides).some(
            (k) => student.overrides[k] !== null && student.overrides[k] !== undefined
          );
        return hasAnswers || hasOverrides;
      });

    if (allStudents.length === 0) {
      throw new Error("Nessuno studente ha completato l'esame");
    }

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

        const pointsTotal =
          getQuestionPoints(mapping.correctiondictionary?.[originalIndex] || []) || 0;
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

      const successRate =
        totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

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

    const totalStudents = allStudents.length;
    const grades = allStudents.map((s) => {
      const score = gradeStudent(s, mapping) || 0;
      return maxPoints ? (score / maxPoints) * 30 : 0;
    });
    const avgGrade =
      grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : 0;
    const minGrade = grades.length > 0 ? Math.min(...grades).toFixed(1) : 0;
    const maxGrade = grades.length > 0 ? Math.max(...grades).toFixed(1) : 0;

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

    const topicSummaryText = topicSummary
      .map(
        (t) =>
          `- ${t.topic}: ${t.avgSuccess}% di risposte corrette (${t.questionsCount} domande)`
      )
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

  return router;
};

module.exports = buildGradingRouter;
