const STORAGE_KEY = "c3lab-exam-registry";
const ANSWER_OPTIONS = ["A", "B", "C", "D"];

const answersGrid = document.getElementById("answersGrid");
const mappingStatus = document.getElementById("mappingStatus");
const examHistory = document.getElementById("examHistory");
const examInfo = document.getElementById("examInfo");
const esse3FileInput = document.getElementById("esse3File");
const importEsse3Btn = document.getElementById("importEsse3");

const studentForm = document.getElementById("studentForm");
const matricolaInput = document.getElementById("matricola");
const nomeInput = document.getElementById("nome");
const cognomeInput = document.getElementById("cognome");
const versioneInput = document.getElementById("versione");
const resetFormBtn = document.getElementById("resetForm");
const submitBtn = studentForm.querySelector('button[type="submit"]');

const studentsTable = document.getElementById("studentsTable");
const exportBtn = document.getElementById("exportCsv");
const exportRBtn = document.getElementById("exportCsvR");
const clearBtn = document.getElementById("clearAll");
const clearResultsBackdrop = document.getElementById("clearResultsBackdrop");
const clearResultsModal = document.getElementById("clearResultsModal");
const clearResultsCloseBtn = document.getElementById("clearResultsClose");
const clearResultsCancelBtn = document.getElementById("clearResultsCancel");
const confirmClearResultsBtn = document.getElementById("confirmClearResults");
const gradingStatus = document.getElementById("gradingStatus");
const gradingStats = document.getElementById("gradingStats");
const exportGradedBtn = document.getElementById("exportGradedCsv");
const gradingTable = document.getElementById("gradingTable");
const gradeHistogram = document.getElementById("gradeHistogram");
const exportResultsPdfBtn = document.getElementById("exportResultsPdf");
const exportResultsXlsBtn = document.getElementById("exportResultsXls");
const resultDateInput = document.getElementById("resultDate");
const esse3ResultsFileInput = document.getElementById("esse3ResultsFile");
const targetTopGradeInput = document.getElementById("targetTopGrade");
const currentTopGradeBadge = document.getElementById("currentTopGradeBadge");
const gradingFactor = document.getElementById("gradingFactor");
const gradingToast = document.getElementById("gradingToast");
const studentSearchInput = document.getElementById("studentSearch");
const gradingProgress = document.getElementById("gradingProgress");
const gradingProgressLabel = document.getElementById("gradingProgressLabel");
const examPreviewBackdrop = document.getElementById("examPreviewBackdrop");
const examPreviewModal = document.getElementById("examPreviewModal");
const examPreviewCloseBtn = document.getElementById("examPreviewClose");
const examPreviewBody = document.getElementById("examPreviewBody");
const examHistoryBackdrop = document.getElementById("examHistoryBackdrop");
const examHistoryModal = document.getElementById("examHistoryModal");
const examHistoryCloseBtn = document.getElementById("examHistoryClose");
const mappingBadge = document.getElementById("mappingBadge");
const topbarSelectExam = document.getElementById("topbarSelectExam");
const topbarImportEsse3 = document.getElementById("topbarImportEsse3");
const topbarExportPdf = document.getElementById("topbarExportPdf");
const topbarExportXls = document.getElementById("topbarExportXls");
const topbarClear = document.getElementById("topbarClear");
const emptySelectExam = document.getElementById("emptySelectExam");
const sessionSelect = document.getElementById("sessionSelect");
const newSessionBtn = document.getElementById("newSession");

let questionCount = 0;
let students = [];
let mapping = null;
let editingIndex = null;
let esse3Base64 = "";
let examsCache = [];
let examStatsCache = {};
let examQuestions = [];
let toastTimer = null;
let currentExamId = null;
let currentSessionId = null;
let sessionSaveTimer = null;

const showToast = (message, tone = "info") => {
  if (!gradingToast) return;
  gradingToast.textContent = message;
  gradingToast.classList.remove("is-error", "is-success");
  if (tone === "error") gradingToast.classList.add("is-error");
  if (tone === "success") gradingToast.classList.add("is-success");
  gradingToast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    gradingToast.classList.remove("show");
  }, 2600);
};

const setMappingBadge = (text, isActive = false) => {
  if (!mappingBadge) return;
  mappingBadge.textContent = text;
  mappingBadge.classList.toggle("is-active", isActive);
};

const examSections = Array.from(document.querySelectorAll(".exam-section"));
const examEmptyState = document.getElementById("examEmptyState");

const updateExamVisibility = (hasExam) => {
  if (examEmptyState) {
    examEmptyState.classList.toggle("is-hidden", hasExam);
  }
  examSections.forEach((section) => {
    section.classList.toggle("is-hidden", !hasExam);
  });
};

const formatSessionTitle = (dateValue) => {
  const label = dateValue ? `Sessione ${dateValue}` : "Sessione";
  const suffix = new Date().toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  return `${label} · ${suffix}`;
};

const renderSessionSelect = (sessions, selectedId) => {
  if (!sessionSelect) return;
  sessionSelect.innerHTML = "";
  if (!sessions.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Nessuna sessione";
    sessionSelect.appendChild(opt);
    sessionSelect.disabled = true;
    return;
  }
  sessions.forEach((session) => {
    const opt = document.createElement("option");
    opt.value = String(session.id);
    const dateLabel = session.result_date ? ` · ${session.result_date}` : "";
    const title = session.title ? session.title : `Sessione ${session.id}`;
    opt.textContent = `${title}${dateLabel}`;
    if (session.id === selectedId) opt.selected = true;
    sessionSelect.appendChild(opt);
  });
  sessionSelect.disabled = false;
};

const loadSession = async (sessionId) => {
  if (!sessionId) return;
  try {
    const response = await fetch(`/api/sessions/${sessionId}`);
    if (!response.ok) {
      showToast("Errore nel caricamento sessione.", "error");
      return;
    }
    const payload = await response.json();
    currentSessionId = payload.session.id;
    students = payload.students || [];
    persistStudents();
    resultDateInput.value = payload.session.result_date || "";
    renderTable();
    renderGrading();
    showToast("Sessione caricata.", "success");
  } catch {
    showToast("Errore nel caricamento sessione.", "error");
  }
};

const saveSession = async () => {
  if (!currentSessionId) return;
  try {
    const payload = {
      title: sessionSelect?.selectedOptions?.[0]?.textContent || null,
      resultDate: resultDateInput.value || "",
      students,
    };
    await fetch(`/api/sessions/${currentSessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    showToast("Errore nel salvataggio sessione.", "error");
  }
};

const scheduleSaveSession = () => {
  if (!currentSessionId) return;
  if (sessionSaveTimer) clearTimeout(sessionSaveTimer);
  sessionSaveTimer = setTimeout(() => {
    saveSession();
  }, 500);
};

const loadSessionsForExam = async (examId) => {
  if (!examId) return;
  try {
    const response = await fetch(`/api/exams/${examId}/sessions`);
    if (!response.ok) {
      renderSessionSelect([], null);
      return;
    }
    const payload = await response.json();
    const sessions = payload.sessions || [];
    renderSessionSelect(sessions, currentSessionId);
    if (!sessions.length) {
      const title = formatSessionTitle(resultDateInput.value || "");
      const createResponse = await fetch(`/api/exams/${examId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, resultDate: resultDateInput.value || "" }),
      });
      if (!createResponse.ok) return;
      const info = await createResponse.json();
      currentSessionId = info.id;
      await loadSessionsForExam(examId);
      return;
    }
    if (!currentSessionId) {
      currentSessionId = sessions[0].id;
      await loadSession(currentSessionId);
    }
  } catch {
    renderSessionSelect([], null);
  }
};

const renderLatexHtml = (source, target) => {
  if (!target) return;
  const trimmed = String(source || "").trim();
  target.innerHTML = "";
  if (!trimmed) return;
  let rendered = false;
  if (window.latexjs && typeof window.latexjs.parse === "function") {
    try {
      const generator = window.latexjs.parse(trimmed, { strict: false });
      let html = "";
      if (typeof generator.htmlDocument === "function") {
        html = generator.htmlDocument();
      } else if (typeof generator.html === "function") {
        html = generator.html();
      } else if (typeof generator.toHTML === "function") {
        html = generator.toHTML();
      } else if (generator.html) {
        html = generator.html;
      }
      if (html) {
        const template = document.createElement("template");
        template.innerHTML = html;
        const body = template.content.querySelector("body");
        if (body) {
          target.append(...Array.from(body.childNodes));
        } else {
          target.append(...Array.from(template.content.childNodes));
        }
        rendered = true;
      }
    } catch {
      rendered = false;
    }
  }
  if (!rendered) {
    target.textContent = trimmed;
  }
  if (typeof window.renderMathInElement !== "function") return;
  try {
    window.renderMathInElement(target, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
    });
  } catch {
    if (!rendered) target.textContent = trimmed;
  }
};

const formatName = (value) => {
  const cleaned = String(value || "").trim().toLowerCase();
  if (!cleaned) return "";
  const cap = (word) => {
    return word
      .split("'")
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
      .join("'");
  };
  return cleaned
    .split(/\s+/)
    .map((word) =>
      word
        .split("-")
        .map((part) => cap(part))
        .join("-")
    )
    .join(" ");
};

const buildDisplayedAnswers = (question, originalIndex, version) => {
  const rawAnswers = Array.isArray(question.answers) ? question.answers : [];
  if (!mapping || !mapping.randomizedanswersdictionary) {
    return rawAnswers.map((ans) => ({
      text: ans.text || "",
      isCorrect: Boolean(ans.isCorrect),
    }));
  }
  const adict = mapping.randomizedanswersdictionary[version - 1];
  const cdict = mapping.correctiondictionary;
  if (!adict || !adict[originalIndex] || !cdict || !cdict[originalIndex]) {
    return rawAnswers.map((ans) => ({
      text: ans.text || "",
      isCorrect: Boolean(ans.isCorrect),
    }));
  }
  const displayedOrder = adict[originalIndex];
  return displayedOrder
    .map((origIdx) => {
      const answer = rawAnswers[origIdx - 1];
      if (!answer) return null;
      const correctRow = cdict[originalIndex] || [];
      return {
        text: answer.text || "",
        isCorrect: Boolean(correctRow[origIdx - 1] > 0),
      };
    })
    .filter(Boolean);
};

const renderExamPreview = (question, index, originalIndex, version) => {
  if (!examPreviewBody) return;
  examPreviewBody.innerHTML = "";
  const badgeRow = document.createElement("div");
  badgeRow.className = "preview-badges";
  const badge = document.createElement("div");
  badge.className = "selected-question-badge";
  badge.style.position = "static";
  badge.textContent = `Es. ${index}`;
  const versionBadge = document.createElement("span");
  versionBadge.className = "preview-badge-muted";
  versionBadge.textContent = `Versione ${version}`;
  const text = document.createElement("div");
  text.className = "selected-question-text";
  renderLatexHtml(question.text || "", text);
  badgeRow.appendChild(badge);
  badgeRow.appendChild(versionBadge);
  examPreviewBody.appendChild(badgeRow);
  examPreviewBody.appendChild(text);
  if (question.imagePath) {
    const imgWrap = document.createElement("div");
    imgWrap.className = "selected-question-image";
    const img = document.createElement("img");
    img.className = "selected-preview-thumb";
    img.src = question.imagePath;
    img.alt = question.imagePath;
    imgWrap.appendChild(img);
    examPreviewBody.appendChild(imgWrap);
  }
  const displayedAnswers = buildDisplayedAnswers(question, originalIndex, version);
  if (displayedAnswers.length) {
    const list = document.createElement("div");
    list.className = "selected-question-answers";
    displayedAnswers
      .filter((ans) => String(ans.text || "").trim() !== "")
      .forEach((answer, idx) => {
        const row = document.createElement("div");
        row.className = "selected-question-answer";
        const label = document.createElement("span");
        label.className = "selected-preview-answer-label";
        label.textContent = `${idx + 1}.`;
        const textEl = document.createElement("span");
        textEl.className = "selected-preview-answer-text";
        renderLatexHtml(answer.text || "", textEl);
        row.appendChild(label);
        row.appendChild(textEl);
        if (answer.isCorrect) {
          const tick = document.createElement("span");
          tick.className = "answer-tick";
          tick.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.4-1.4z"/></svg>';
          row.appendChild(tick);
        }
        list.appendChild(row);
      });
    examPreviewBody.appendChild(list);
  }
};

const getQuestionIndexForVersion = (displayedIndex, version) => {
  if (!mapping || !mapping.questiondictionary) return displayedIndex - 1;
  const qdict = mapping.questiondictionary[version - 1];
  if (!qdict || !Array.isArray(qdict)) return displayedIndex - 1;
  const mapped = qdict[displayedIndex - 1];
  if (!mapped) return displayedIndex - 1;
  return mapped - 1;
};

const openExamPreview = (index, version) => {
  if (!examPreviewModal || !examPreviewBackdrop) return;
  if (!examQuestions.length) {
    mappingStatus.textContent = "Nessuna domanda disponibile per l'anteprima.";
    showToast("Nessuna domanda disponibile per l'anteprima.", "error");
    return;
  }
  const mappedIndex = getQuestionIndexForVersion(index, version);
  const question = examQuestions[mappedIndex];
  if (!question) {
    mappingStatus.textContent = "Domanda non trovata.";
    showToast("Domanda non trovata.", "error");
    return;
  }
  renderExamPreview(question, index, mappedIndex, version);
  examPreviewModal.classList.remove("is-hidden");
  examPreviewBackdrop.classList.remove("is-hidden");
};

const closeExamPreview = () => {
  if (examPreviewModal) examPreviewModal.classList.add("is-hidden");
  if (examPreviewBackdrop) examPreviewBackdrop.classList.add("is-hidden");
  if (examPreviewBody) examPreviewBody.innerHTML = "";
};

const renderAnswerGrid = () => {
  answersGrid.innerHTML = "";
  if (questionCount < 1) {
    answersGrid.innerHTML =
      "<p class=\"muted\">Carica il mapping per inserire le risposte.</p>";
    return;
  }
  for (let i = 1; i <= questionCount; i += 1) {
    const row = document.createElement("div");
    row.className = "answer-row";

    const label = document.createElement("div");
    label.className = "answer-label is-clickable";
    label.textContent = `Es. ${i}`;
    label.addEventListener("click", () => {
      const version = Number(versioneInput?.value || "");
      if (!Number.isFinite(version) || version < 1) {
        mappingStatus.textContent = "Inserisci la versione del compito per l'anteprima.";
        showToast("Inserisci la versione del compito per l'anteprima.", "error");
        return;
      }
      openExamPreview(i, version);
    });

    const options = document.createElement("div");
    options.className = "answer-options";

    ANSWER_OPTIONS.forEach((letter) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toggle";
      btn.dataset.question = String(i);
      btn.dataset.answer = letter;
      btn.textContent = letter;
      btn.addEventListener("click", () => {
        btn.classList.toggle("active");
        updatePerQuestionScores();
      });
      options.appendChild(btn);
    });

    const scoreBox = document.createElement("div");
    scoreBox.className = "answer-score";
    scoreBox.dataset.question = String(i);
    scoreBox.textContent = "";

    const overrideWrap = document.createElement("div");
    overrideWrap.className = "override";
    const overrideLabel = document.createElement("span");
    overrideLabel.textContent = "Override";
    const overrideInput = document.createElement("input");
    overrideInput.type = "number";
    overrideInput.step = "0.5";
    overrideInput.placeholder = "-";
    overrideInput.dataset.question = String(i);
    overrideInput.addEventListener("input", updatePerQuestionScores);
    overrideWrap.appendChild(overrideLabel);
    overrideWrap.appendChild(overrideInput);

    row.appendChild(label);
    row.appendChild(options);
    row.appendChild(scoreBox);
    row.appendChild(overrideWrap);
    answersGrid.appendChild(row);
  }
  applyCorrectHints();
  updatePerQuestionScores();
};

const loadStudents = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      students = JSON.parse(stored);
    } catch {
      students = [];
    }
  }
  renderTable();
};

const persistStudents = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
};

const collectAnswers = () => {
  const answers = [];
  for (let i = 1; i <= questionCount; i += 1) {
    const selected = Array.from(
      answersGrid.querySelectorAll(
        `.toggle[data-question="${i}"].active`
      )
    ).map((btn) => btn.dataset.answer);
    answers.push(selected.join(""));
  }
  return answers;
};

const clearSelections = () => {
  answersGrid.querySelectorAll(".toggle.active").forEach((btn) => {
    btn.classList.remove("active");
  });
  answersGrid.querySelectorAll(".override input").forEach((input) => {
    input.value = "";
  });
};

const collectOverrides = () => {
  const overrides = [];
  for (let i = 1; i <= questionCount; i += 1) {
    const input = answersGrid.querySelector(`.override input[data-question="${i}"]`);
    const value = input ? input.value.trim() : "";
    overrides.push(value === "" ? null : Number(value));
  }
  return overrides;
};

const addStudent = (event) => {
  event.preventDefault();
  if (questionCount < 1) {
    templateStatus.textContent = "Carica il mapping per impostare il template.";
    return;
  }
  const answers = collectAnswers();
  const overrides = collectOverrides();
  const student = {
    matricola: matricolaInput.value.trim(),
    nome: nomeInput.value.trim(),
    cognome: cognomeInput.value.trim(),
    versione: versioneInput.value.trim(),
    answers,
    overrides,
    createdAt: new Date().toISOString(),
  };
  if (editingIndex !== null && students[editingIndex]) {
    const existing = students[editingIndex];
    students[editingIndex] = { ...existing, ...student };
  } else {
    students.unshift(student);
  }
  persistStudents();
  renderTable();
  renderGrading();
  scheduleSaveSession();
  studentForm.reset();
  clearSelections();
  editingIndex = null;
  if (submitBtn) submitBtn.textContent = "Aggiungi studente";
};

const renderTable = () => {
  studentsTable.innerHTML = "";
  const query = String(studentSearchInput?.value || "").trim().toLowerCase();
  const filtered = students
    .map((student, index) => ({ student, index }))
    .filter(({ student }) => {
      if (!query) return true;
      return (
        String(student.matricola || "").toLowerCase().includes(query) ||
        String(student.nome || "").toLowerCase().includes(query) ||
        String(student.cognome || "").toLowerCase().includes(query)
      );
    });
  if (students.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 9;
    cell.textContent = "Nessun risultato inserito.";
    row.appendChild(cell);
    studentsTable.appendChild(row);
    updateStudentProgress();
    if (currentTopGradeBadge) currentTopGradeBadge.textContent = "-";
    return;
  }
  if (filtered.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 9;
    cell.textContent = "Nessun risultato corrispondente.";
    row.appendChild(cell);
    studentsTable.appendChild(row);
    updateStudentProgress();
    if (currentTopGradeBadge) currentTopGradeBadge.textContent = "-";
    return;
  }
  const maxPoints = mapping ? getMaxPoints() : 0;
  filtered.forEach(({ student, index }) => {
    const score = mapping ? gradeStudent(student) : null;
    const grade = score === null ? null : toThirty(score, maxPoints);
    const normalized = grade === null ? null : normalizeGrade(grade);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${student.matricola}</td>
      <td>${formatName(student.cognome)}</td>
      <td>${formatName(student.nome)}</td>
      <td>${student.versione}</td>
      <td>${student.answers.join(" | ")}</td>
      <td>${score === null ? "-" : score}</td>
      <td>${grade === null ? "-" : grade.toFixed(2)}</td>
      <td>${normalized === null ? "-" : normalized}</td>
      <td class="row-actions">
        <button class="btn btn-sm btn-outline-secondary mini load" data-index="${index}">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger mini remove" data-index="${index}">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </td>
    `;
    studentsTable.appendChild(row);
  });

  studentsTable.querySelectorAll(".mini.remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      students.splice(idx, 1);
      persistStudents();
      renderTable();
      renderGrading();
      scheduleSaveSession();
    });
  });

  studentsTable.querySelectorAll(".mini.load").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      const student = students[idx];
      if (!student) return;
      editingIndex = idx;
      if (submitBtn) submitBtn.textContent = "Aggiorna studente";
      matricolaInput.value = student.matricola || "";
      nomeInput.value = student.nome || "";
      cognomeInput.value = student.cognome || "";
      versioneInput.value = student.versione || "";
      renderAnswerGrid();
      const answers = student.answers || [];
      answers.forEach((value, i) => {
        const letters = String(value || "").split("");
        letters.forEach((letter) => {
          const btnEl = answersGrid.querySelector(
            `.toggle[data-question="${i + 1}"][data-answer="${letter}"]`
          );
          if (btnEl) btnEl.classList.add("active");
        });
      });
      const overrides = student.overrides || [];
      overrides.forEach((val, i) => {
        const input = answersGrid.querySelector(
          `.override input[data-question="${i + 1}"]`
        );
        if (input && val !== null && val !== undefined) {
          input.value = String(val);
        }
      });
      applyCorrectHints();
      updatePerQuestionScores();
      studentForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  updateStudentProgress();
  if (currentTopGradeBadge) {
    const bestGrade = getCurrentTopGrade();
    currentTopGradeBadge.textContent =
      bestGrade === null ? "-" : bestGrade.toFixed(1);
  }
};

const renderGrading = () => {
  if (!mapping) {
    gradingStatus.textContent = "Carica un mapping per abilitare il grading automatico.";
    gradingStats.innerHTML = "";
    gradingTable.innerHTML = "";
    gradeHistogram.innerHTML = "";
    gradingFactor.textContent = "Fattore: -";
    targetTopGradeInput.disabled = true;
    if (currentTopGradeBadge) currentTopGradeBadge.textContent = "-";
    if (exportGradedBtn) exportGradedBtn.disabled = true;
    exportResultsPdfBtn.disabled = true;
    exportResultsXlsBtn.disabled = true;
    if (topbarExportPdf) topbarExportPdf.disabled = true;
    if (topbarExportXls) topbarExportXls.disabled = true;
    return;
  }
  gradingStatus.textContent = "Grading attivo. I punteggi sono calcolati automaticamente.";
  if (exportGradedBtn) exportGradedBtn.disabled = false;
  exportResultsPdfBtn.disabled = false;
  exportResultsXlsBtn.disabled = false;
  if (topbarExportPdf) topbarExportPdf.disabled = false;
  if (topbarExportXls) topbarExportXls.disabled = false;
  targetTopGradeInput.disabled = false;
  const maxPoints = getMaxPoints();
  const scores = students.map((student) => gradeStudent(student)).filter((val) => val !== null);
  if (scores.length === 0) {
    gradingStats.innerHTML = "";
    gradingTable.innerHTML = "";
    gradeHistogram.innerHTML = "";
    if (currentTopGradeBadge) currentTopGradeBadge.textContent = "-";
    if (exportGradedBtn) exportGradedBtn.disabled = true;
    exportResultsPdfBtn.disabled = true;
    exportResultsXlsBtn.disabled = true;
    if (topbarExportPdf) topbarExportPdf.disabled = true;
    if (topbarExportXls) topbarExportXls.disabled = true;
    return;
  }
  const total = scores.reduce((sum, val) => sum + val, 0);
  const avg = total / scores.length;
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const grades = scores.map((points) => toThirty(points, maxPoints));
  const avgGrade = grades.reduce((sum, val) => sum + val, 0) / grades.length;
  const bestGrade = Math.max(...grades);
  if (currentTopGradeBadge) currentTopGradeBadge.textContent = bestGrade.toFixed(1);
  const factor = getNormalizationFactor();
  gradingFactor.textContent = factor ? `Fattore: ${factor.toFixed(3)}` : "Fattore: -";
  gradingStats.innerHTML = `
    <div class="stat-card"><span>Studenti valutati</span><strong>${scores.length}</strong></div>
    <div class="stat-card"><span>Media punti</span><strong>${avg.toFixed(2)}</strong></div>
    <div class="stat-card"><span>Media / 30</span><strong>${avgGrade.toFixed(2)}</strong></div>
    <div class="stat-card"><span>Max punti</span><strong>${max}</strong></div>
    <div class="stat-card"><span>Min punti</span><strong>${min}</strong></div>
  `;

  gradingTable.innerHTML = "";
  students.forEach((student) => {
    const score = gradeStudent(student);
    if (score === null) return;
    const grade = toThirty(score, maxPoints);
    const normalized = normalizeGrade(grade);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${student.matricola}</td>
      <td>${formatName(student.cognome)}</td>
      <td>${formatName(student.nome)}</td>
      <td>${student.versione}</td>
      <td>${score}</td>
      <td>${grade.toFixed(2)}</td>
      <td>${normalized}</td>
    `;
    gradingTable.appendChild(row);
  });

  renderHistogram(grades.map((g) => normalizeGrade(g)));
};

const exportCsv = () => {
  if (students.length === 0) return;
  const header = [
    "matricola",
    "nome",
    "cognome",
    "versione",
    ...Array.from({ length: questionCount }, (_, i) => `q${i + 1}`),
  ];
  const rows = students.map((student) => [
    student.matricola,
    student.nome,
    student.cognome,
    student.versione,
    ...student.answers,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "registro_esami.csv";
  link.click();
  URL.revokeObjectURL(link.href);
};

const exportCsvForR = () => {
  if (students.length === 0) return;
  const header = [
    "ID",
    "versions",
    ...Array.from({ length: questionCount }, (_, i) => `q${i + 1}`),
  ];
  const toNumber = (answer) => {
    if (!answer || answer.length !== 1) return 0;
    const idx = ANSWER_OPTIONS.indexOf(answer);
    return idx === -1 ? 0 : idx + 1;
  };
  const rows = students.map((student) => [
    student.matricola,
    student.versione,
    ...student.answers.map(toNumber),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "registro_esami_r.csv";
  link.click();
  URL.revokeObjectURL(link.href);
};

const loadMappingFromExam = async (selectedId) => {
  const parsedId = Number(selectedId);
  if (!Number.isFinite(parsedId)) {
    mappingStatus.textContent = "Seleziona una traccia.";
    setMappingBadge("Nessuna traccia", false);
    updateExamVisibility(false);
    return;
  }
  currentExamId = parsedId;
  mappingStatus.textContent = "Caricamento mapping in corso...";
  try {
    const response = await fetch(`/api/exams/${parsedId}/mapping`);
    if (!response.ok) {
      const info = await response.json().catch(() => ({}));
      mappingStatus.textContent = info.error || "Errore nel mapping.";
      setMappingBadge("Nessuna traccia", false);
      updateExamVisibility(false);
      return;
    }
    const payload = await response.json();
    mapping = payload.mapping;
    questionCount = mapping.Nquestions;
    mappingStatus.textContent = `Mapping caricato: ${mapping.Nquestions} domande, ${mapping.Nversions} versioni.`;
    setMappingBadge("Traccia selezionata", true);
    updateExamVisibility(true);
    try {
      const examResponse = await fetch(`/api/exams/${parsedId}`);
      if (examResponse.ok) {
        const examPayload = await examResponse.json();
        examQuestions = examPayload.questions || [];
      } else {
        examQuestions = [];
      }
    } catch {
      examQuestions = [];
    }
    renderTable();
    renderGrading();
    renderAnswerGrid();
    applyCorrectHints();
    updatePerQuestionScores();
    updateExamInfo(parsedId);
    await loadSessionsForExam(parsedId);
  } catch {
    mappingStatus.textContent = "Errore nel mapping.";
    setMappingBadge("Nessuna traccia", false);
    updateExamVisibility(false);
  }
};

const renderExamHistory = (exams) => {
  if (!examHistory || !window.ExamCards) return;
  ExamCards.render(examHistory, exams, {
    emptyText: "Nessuna traccia chiusa disponibile.",
    filter: (exam) => !exam.is_draft,
    stats: examStatsCache,
    actions: (exam) => [
      {
        label: "Seleziona",
        className: "btn btn-outline-primary btn-sm",
        onClick: () => {
          loadMappingFromExam(exam.id);
          closeExamHistoryModal();
        },
      },
    ],
  });
};

const updateExamInfo = (examId) => {
  if (!examInfo) return;
  const exam = examsCache.find((item) => item.id === examId);
  if (!exam) {
    examInfo.textContent = "";
    return;
  }
  const dateText = exam.date ? ` • ${exam.date}` : "";
  examInfo.textContent = `${exam.course_name}${dateText} • ${exam.question_count} domande • ${exam.is_draft ? "Bozza" : "Chiusa"}`;
};

const loadExams = async () => {
  try {
    const response = await fetch("/api/exams");
    if (!response.ok) {
      mappingStatus.textContent = "Errore caricamento tracce.";
      return;
    }
    const payload = await response.json();
    examsCache = payload.exams || [];
    examStatsCache = await loadExamStats();
    renderExamHistory(examsCache);
    if (!mapping) setMappingBadge("Nessuna traccia", false);
    updateExamVisibility(Boolean(mapping));
  } catch {
    mappingStatus.textContent = "Errore caricamento tracce.";
    setMappingBadge("Nessuna traccia", false);
    updateExamVisibility(Boolean(mapping));
  }
};

const loadExamStats = async () => {
  try {
    const response = await fetch("/api/exams/stats");
    if (!response.ok) return {};
    const payload = await response.json();
    return payload.stats || {};
  } catch {
    return {};
  }
};

const importEsse3 = async () => {
  const file = esse3FileInput.files && esse3FileInput.files[0];
  if (!file) {
    showToast("Seleziona un file .xls.", "error");
    return;
  }
  showToast("Import in corso...");
  const buffer = await file.arrayBuffer();
  esse3Base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const response = await fetch("/api/import-esse3", {
    method: "POST",
    headers: { "Content-Type": "application/vnd.ms-excel" },
    body: buffer,
  });
  if (!response.ok) {
    const info = await response.json().catch(() => ({}));
    showToast(info.error || "Errore import.", "error");
    return;
  }
  const payload = await response.json();
  const existing = new Set(students.map((s) => s.matricola));
  let added = 0;
  let skipped = 0;
  (payload.students || []).forEach((row) => {
    if (!row.matricola || existing.has(row.matricola)) return;
    existing.add(row.matricola);
    students.push({
      matricola: row.matricola,
      nome: row.nome || "",
      cognome: row.cognome || "",
      versione: "",
      answers: Array.from({ length: questionCount }, () => ""),
      overrides: Array.from({ length: questionCount }, () => null),
      createdAt: new Date().toISOString(),
    });
    added += 1;
  });
  persistStudents();
  renderTable();
  renderGrading();
  scheduleSaveSession();
  skipped = (payload.students || []).length - added;
  showToast(
    `${file.name} • Import completato: ${added} aggiunti, ${skipped} duplicati ignorati.`,
    "success"
  );
};

const normalizeSet = (arr) => Array.from(new Set(arr)).sort().join(",");

const updateStudentProgress = () => {
  if (!gradingProgress || !gradingProgressLabel) return;
  if (!mapping || students.length === 0) {
    gradingProgress.style.width = "0%";
    gradingProgressLabel.textContent = "0%";
    return;
  }
  const graded = students.filter((student) => gradeStudent(student) !== null).length;
  const percent = Math.round((graded / students.length) * 100);
  gradingProgress.style.width = `${percent}%`;
  gradingProgressLabel.textContent = `${percent}%`;
};

const buildInverseQuestionMap = (qdict) => {
  const inverse = [];
  for (let q = 0; q < qdict.length; q += 1) {
    inverse[qdict[q] - 1] = q;
  }
  return inverse;
};

const updatePerQuestionScores = () => {
  if (!mapping || questionCount < 1) {
    answersGrid.querySelectorAll(".answer-score").forEach((el) => {
      el.textContent = "";
      el.classList.remove("score-correct", "score-wrong");
    });
    return;
  }
  const version = Number(versioneInput.value);
  if (!Number.isFinite(version) || version < 1 || version > mapping.Nversions) {
    answersGrid.querySelectorAll(".answer-score").forEach((el) => {
      el.textContent = "";
      el.classList.remove("score-correct", "score-wrong");
    });
    return;
  }
  const qdict = mapping.questiondictionary[version - 1];
  const adict = mapping.randomizedanswersdictionary[version - 1];
  const cdict = mapping.correctiondictionary;
  const inverse = buildInverseQuestionMap(qdict);
  const maxQ = Math.min(questionCount, mapping.Nquestions);
  for (let displayed = 0; displayed < maxQ; displayed += 1) {
    const scoreEl = answersGrid.querySelector(
      `.answer-score[data-question="${displayed + 1}"]`
    );
    if (!scoreEl) continue;
    const overrideInput = answersGrid.querySelector(
      `.override input[data-question="${displayed + 1}"]`
    );
    const overrideVal = overrideInput ? overrideInput.value.trim() : "";
    if (overrideVal !== "" && Number.isFinite(Number(overrideVal))) {
      scoreEl.textContent = "✓";
      scoreEl.classList.add("score-correct");
      scoreEl.classList.remove("score-wrong");
      continue;
    }
    const original = inverse[displayed];
    if (original === undefined) {
      scoreEl.textContent = "";
      scoreEl.classList.remove("score-correct", "score-wrong");
      continue;
    }
    const selected = Array.from(
      answersGrid.querySelectorAll(
        `.toggle[data-question="${displayed + 1}"].active`
      )
    ).map((btn) => btn.dataset.answer);
    const selectedIdx = selected
      .map((letter) => ANSWER_OPTIONS.indexOf(letter) + 1)
      .filter((idx) => idx > 0);
    const originalSelected = selectedIdx.map((idx) => adict[original][idx - 1]);
    const correctIdx = cdict[original]
      .map((val, i) => (val > 0 ? i + 1 : null))
      .filter(Boolean);
    if (normalizeSet(originalSelected) === normalizeSet(correctIdx)) {
      scoreEl.textContent = "✓";
      scoreEl.classList.add("score-correct");
      scoreEl.classList.remove("score-wrong");
    } else {
      scoreEl.textContent = "✕";
      scoreEl.classList.add("score-wrong");
      scoreEl.classList.remove("score-correct");
    }
  }
};

const getQuestionPoints = (row) => {
  const correctCount = row.filter((val) => val > 0).length;
  if (correctCount > 1) return 1;
  return row.reduce((acc, val) => (val > 0 ? acc + val : acc), 0);
};

const getMaxPoints = () => {
  if (!mapping) return 0;
  return mapping.correctiondictionary.reduce(
    (sum, row) => sum + getQuestionPoints(row),
    0
  );
};

const toThirty = (points, maxPoints) => {
  if (!maxPoints) return 0;
  return (points / maxPoints) * 30;
};

const getCurrentTopGrade = () => {
  if (!mapping) return null;
  const maxPoints = getMaxPoints();
  if (!maxPoints) return null;
  const scores = students.map((student) => gradeStudent(student)).filter((val) => val !== null);
  if (scores.length === 0) return null;
  const grades = scores.map((points) => toThirty(points, maxPoints));
  return Math.max(...grades);
};

const getNormalizationFactor = () => {
  const current = getCurrentTopGrade();
  if (!targetTopGradeInput) return null;
  const target = Number(targetTopGradeInput.value);
  if (!Number.isFinite(current) || !Number.isFinite(target) || current <= 0) {
    return null;
  }
  return target / current;
};

const normalizeGrade = (grade) => {
  const factor = getNormalizationFactor();
  if (!factor) return Math.round(grade);
  return Math.round(grade * factor);
};

const renderHistogram = (normalizedGrades) => {
  if (!gradeHistogram) return;
  const buckets = Array.from({ length: 31 }, () => 0);
  normalizedGrades.forEach((grade) => {
    const clamped = Math.min(30, Math.max(0, Number(grade)));
    buckets[clamped] += 1;
  });
  const maxCount = Math.max(1, ...buckets);
  gradeHistogram.innerHTML = "";
  buckets.forEach((count, idx) => {
    const bar = document.createElement("div");
    bar.className = "grade-bar";
    bar.style.height = `${(count / maxCount) * 100}%`;
    if (count > 0) {
      const label = document.createElement("span");
      label.textContent = count;
      bar.appendChild(label);
    }
    gradeHistogram.appendChild(bar);
  });
};

const clearCorrectHints = () => {
  answersGrid.querySelectorAll(".toggle.correct-hint").forEach((btn) => {
    btn.classList.remove("correct-hint");
  });
};

const applyCorrectHints = () => {
  clearCorrectHints();
  if (!mapping || questionCount < 1) return;
  const version = Number(versioneInput.value);
  if (!Number.isFinite(version) || version < 1 || version > mapping.Nversions) {
    return;
  }
  const qdict = mapping.questiondictionary[version - 1];
  const adict = mapping.randomizedanswersdictionary[version - 1];
  const cdict = mapping.correctiondictionary;
  const inverse = buildInverseQuestionMap(qdict);
  const maxQ = Math.min(questionCount, mapping.Nquestions);
  for (let displayed = 0; displayed < maxQ; displayed += 1) {
    const original = inverse[displayed];
    if (original === undefined) continue;
    const correctOriginal = cdict[original]
      .map((val, idx) => (val > 0 ? idx + 1 : null))
      .filter(Boolean);
    const displayedOrder = adict[original];
    displayedOrder.forEach((origAnswer, idx) => {
      if (!correctOriginal.includes(origAnswer)) return;
      const letter = ANSWER_OPTIONS[idx];
      const button = answersGrid.querySelector(
        `.toggle[data-question="${displayed + 1}"][data-answer="${letter}"]`
      );
      if (button) button.classList.add("correct-hint");
    });
  }
};

const gradeStudent = (student) => {
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
    const override = student.overrides ? student.overrides[q] : null;
    if (typeof override === "number" && Number.isFinite(override)) {
      total += override;
      continue;
    }
    const displayedIndex = qdict[q] - 1;
    const selected = (student.answers[displayedIndex] || "").split("");
    const selectedIdx = selected
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

const clearAll = () => {
  students = [];
  persistStudents();
  renderTable();
  renderGrading();
  scheduleSaveSession();
};

const openClearResultsModal = () => {
  if (clearResultsBackdrop) clearResultsBackdrop.classList.remove("is-hidden");
  if (clearResultsModal) clearResultsModal.classList.remove("is-hidden");
};

const closeClearResultsModal = () => {
  if (clearResultsBackdrop) clearResultsBackdrop.classList.add("is-hidden");
  if (clearResultsModal) clearResultsModal.classList.add("is-hidden");
};

const openExamHistoryModal = () => {
  if (examHistoryBackdrop) examHistoryBackdrop.classList.remove("is-hidden");
  if (examHistoryModal) examHistoryModal.classList.remove("is-hidden");
};

const closeExamHistoryModal = () => {
  if (examHistoryBackdrop) examHistoryBackdrop.classList.add("is-hidden");
  if (examHistoryModal) examHistoryModal.classList.add("is-hidden");
};

resetFormBtn.addEventListener("click", () => {
  studentForm.reset();
  clearSelections();
  applyCorrectHints();
  updatePerQuestionScores();
  editingIndex = null;
  if (submitBtn) submitBtn.textContent = "Aggiungi studente";
});
studentForm.addEventListener("submit", addStudent);
if (exportBtn) exportBtn.addEventListener("click", exportCsv);
if (exportRBtn) exportRBtn.addEventListener("click", exportCsvForR);
if (clearBtn) clearBtn.addEventListener("click", openClearResultsModal);
if (clearResultsCloseBtn) clearResultsCloseBtn.addEventListener("click", closeClearResultsModal);
if (clearResultsCancelBtn) clearResultsCancelBtn.addEventListener("click", closeClearResultsModal);
if (clearResultsBackdrop) clearResultsBackdrop.addEventListener("click", closeClearResultsModal);
if (confirmClearResultsBtn) {
  confirmClearResultsBtn.addEventListener("click", () => {
    clearAll();
    closeClearResultsModal();
  });
}
if (exportGradedBtn) exportGradedBtn.addEventListener("click", () => {
  if (!mapping || students.length === 0) return;
  const maxPoints = getMaxPoints();
  const header = [
    "ID",
    "nome",
    "cognome",
    "versions",
    "punti",
    "voto_30",
    "voto_norm",
    ...Array.from({ length: questionCount }, (_, i) => `q${i + 1}`),
  ];
  const rows = students.map((student) => [
    student.matricola,
    student.nome,
    student.cognome,
    student.versione,
    gradeStudent(student),
    toThirty(gradeStudent(student), maxPoints).toFixed(2),
    normalizeGrade(toThirty(gradeStudent(student), maxPoints)),
    ...student.answers,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "registro_esami_con_punteggio.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});
if (examPreviewCloseBtn) examPreviewCloseBtn.addEventListener("click", closeExamPreview);
if (examPreviewBackdrop) examPreviewBackdrop.addEventListener("click", closeExamPreview);
if (examHistoryCloseBtn) examHistoryCloseBtn.addEventListener("click", closeExamHistoryModal);
if (examHistoryBackdrop) examHistoryBackdrop.addEventListener("click", closeExamHistoryModal);
versioneInput.addEventListener("input", () => {
  applyCorrectHints();
  updatePerQuestionScores();
});
targetTopGradeInput.addEventListener("input", renderGrading);
if (importEsse3Btn) {
  importEsse3Btn.addEventListener("click", () => {
    if (esse3FileInput) esse3FileInput.click();
  });
}
if (esse3FileInput) {
  esse3FileInput.addEventListener("change", () => {
    if (!esse3FileInput.files || esse3FileInput.files.length === 0) return;
    importEsse3();
  });
}
if (resultDateInput) {
  resultDateInput.addEventListener("change", () => {
    scheduleSaveSession();
  });
}
if (studentSearchInput) {
  studentSearchInput.addEventListener("input", renderTable);
}
if (topbarSelectExam) {
  topbarSelectExam.addEventListener("click", () => {
    openExamHistoryModal();
  });
}
if (emptySelectExam) {
  emptySelectExam.addEventListener("click", () => {
    openExamHistoryModal();
  });
}
if (topbarImportEsse3) {
  topbarImportEsse3.addEventListener("click", () => {
    if (esse3FileInput) esse3FileInput.click();
  });
}
if (topbarExportPdf) {
  topbarExportPdf.addEventListener("click", () => {
    if (exportResultsPdfBtn) exportResultsPdfBtn.click();
  });
}
if (topbarExportXls) {
  topbarExportXls.addEventListener("click", () => {
    if (exportResultsXlsBtn) exportResultsXlsBtn.click();
  });
}
if (topbarClear) {
  topbarClear.addEventListener("click", () => {
    if (clearBtn) clearBtn.click();
  });
}
if (sessionSelect) {
  sessionSelect.addEventListener("change", () => {
    const nextId = Number(sessionSelect.value);
    if (!Number.isFinite(nextId)) return;
    loadSession(nextId);
  });
}
if (newSessionBtn) {
  newSessionBtn.addEventListener("click", async () => {
    if (!currentExamId) {
      showToast("Seleziona una traccia prima di creare una sessione.", "error");
      return;
    }
    const title = formatSessionTitle(resultDateInput.value || "");
    try {
      const response = await fetch(`/api/exams/${currentExamId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, resultDate: resultDateInput.value || "" }),
      });
      if (!response.ok) {
        showToast("Errore nella creazione sessione.", "error");
        return;
      }
      const info = await response.json();
      currentSessionId = info.id;
      await loadSessionsForExam(currentExamId);
      await loadSession(currentSessionId);
    } catch {
      showToast("Errore nella creazione sessione.", "error");
    }
  });
}
exportResultsPdfBtn.addEventListener("click", async () => {
  if (!mapping || students.length === 0) return;
  const maxPoints = getMaxPoints();
  const hasAnyAnswer = (student) =>
    (student.answers || []).some((value) => String(value || "").trim() !== "") ||
    (student.overrides || []).some((value) => typeof value === "number");
  const rows = students
    .filter((student) => hasAnyAnswer(student) && gradeStudent(student) !== null)
    .map((student) => {
      const points = gradeStudent(student);
      const grade = toThirty(points, maxPoints);
      const gradeNorm = normalizeGrade(grade);
      return {
        matricola: student.matricola,
        nome: student.nome,
        cognome: student.cognome,
        grade: grade.toFixed(2),
        gradeNorm,
      };
    });
  const payload = {
    date: resultDateInput.value || "",
    rows,
  };
  const response = await fetch("/api/results-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return;
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "risultati.pdf";
  link.click();
  URL.revokeObjectURL(link.href);
});
exportResultsXlsBtn.addEventListener("click", async () => {
  if (!mapping || students.length === 0) return;
  const file = esse3ResultsFileInput.files && esse3ResultsFileInput.files[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const maxPoints = getMaxPoints();
  const results = students
    .filter((student) => gradeStudent(student) !== null)
    .map((student) => {
      const points = gradeStudent(student);
      const grade = toThirty(points, maxPoints);
      const normalized = normalizeGrade(grade);
      const esito = normalized > 30 ? 31 : normalized;
      return {
        matricola: student.matricola,
        esito,
      };
    });
  const payload = {
    fileBase64,
    results,
  };
  const response = await fetch("/api/results-xls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return;
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "ListaStudentiEsameRisultati.xls";
  link.click();
  URL.revokeObjectURL(link.href);
});

loadStudents();
renderGrading();
loadExams();
updateExamVisibility(Boolean(mapping));
