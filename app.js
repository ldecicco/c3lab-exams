const STORAGE_KEY = "c3lab-exam-registry";
const ANSWER_OPTIONS = ["A", "B", "C", "D"];
const appUserMeta = document.querySelector('meta[name="app-user"]');
let appUser = null;
if (appUserMeta && appUserMeta.content) {
  try {
    appUser = JSON.parse(atob(appUserMeta.content));
  } catch (error) {
    console.warn('[app] Invalid app-user meta payload', error);
  }
}

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
const submitBtn = studentForm ? studentForm.querySelector('button[type="submit"]') : null;

const studentsTable = document.getElementById("studentsTable");
const exportBtn = document.getElementById("exportCsv");
const exportRBtn = document.getElementById("exportCsvR");
const clearBtn = document.getElementById("clearAll");
const clearResultsBackdrop = document.getElementById("clearResultsBackdrop");
const clearResultsModal = document.getElementById("clearResultsModal");
const clearResultsCloseBtn = document.getElementById("clearResultsClose");
const clearResultsCancelBtn = document.getElementById("clearResultsCancel");
const confirmClearResultsBtn = document.getElementById("confirmClearResults");
const exportGradedBtn = document.getElementById("exportGradedCsv");
const gradeHistogram = document.getElementById("gradeHistogram");
const publicAccessForm = document.getElementById("publicAccessForm");
const publicCourseGrid = document.getElementById("publicCourseGrid");
const publicExamGrid = document.getElementById("publicExamGrid");
const publicExamSection = document.getElementById("publicExamSection");
const backToCoursesBtn = document.getElementById("backToCourses");
const publicAccessHeader = document.getElementById("publicAccessHeader");
const publicAccessHeaderTitle = document.getElementById("publicAccessHeaderTitle");
const publicAccessHeaderSubtitle = document.getElementById("publicAccessHeaderSubtitle");
const publicAccessBackdrop = document.getElementById("publicAccessBackdrop");
const publicAccessModal = document.getElementById("publicAccessModal");
const publicAccessClose = document.getElementById("publicAccessClose");
const publicMatricola = document.getElementById("publicMatricola");
const publicPassword = document.getElementById("publicPassword");
const publicAccessError = document.getElementById("publicAccessError");
const publicResultWrap = document.getElementById("publicResultWrap");
const publicResultTitle = document.getElementById("publicResultTitle");
const courseEmptyState = document.getElementById("courseEmptyState");
const mainLayout = document.getElementById("mainLayout");

let activeCourseId = null;
const publicResultGrade = document.getElementById("publicResultGrade");
const publicResultMeta = document.getElementById("publicResultMeta");
const publicResultQuestions = document.getElementById("publicResultQuestions");
const publicPrintResult = document.getElementById("publicPrintResult");
const publicDownloadPdf = document.getElementById("publicDownloadPdf");
const showPromptBtn = document.getElementById("showPromptBtn");
const promptTestBackdrop = document.getElementById("promptTestBackdrop");
const promptTestModal = document.getElementById("promptTestModal");
const promptTestClose = document.getElementById("promptTestClose");
const promptTestContent = document.getElementById("promptTestContent");
const copyPromptBtn = document.getElementById("copyPromptBtn");
const topbarTeachingPrompt = document.getElementById("topbarTeachingPrompt");
const teachingPromptBackdrop = document.getElementById("teachingPromptBackdrop");
const teachingPromptModal = document.getElementById("teachingPromptModal");
const teachingPromptClose = document.getElementById("teachingPromptClose");
const teachingPromptContent = document.getElementById("teachingPromptContent");
const copyTeachingPromptBtn = document.getElementById("copyTeachingPromptBtn");
const publicAccessControls = document.getElementById("publicAccessControls");
const publicAccessToggleBtn = document.getElementById("publicAccessToggleBtn");
const publicAccessFields = document.getElementById("publicAccessFields");
const publicAccessPasswordInput = document.getElementById("publicAccessPassword");
const publicAccessExpiresAtInput = document.getElementById("publicAccessExpiresAt");
const publicAccessShowNotesToggle = document.getElementById("publicAccessShowNotes");
const publicAccessSaveBtn = document.getElementById("publicAccessSave");
const publicPasswordToggle = document.getElementById("publicPasswordToggle");
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
const recalcNormalizedBtn = document.getElementById("recalcNormalized");

const DEBUG_VALUTAZIONE = new URLSearchParams(window.location.search).has("debug");
const debugLog = (...args) => {
  if (!DEBUG_VALUTAZIONE) return;
  console.log("[valutazione-debug]", ...args);
};
const examPreviewBackdrop = document.getElementById("examPreviewBackdrop");
const examPreviewModal = document.getElementById("examPreviewModal");
const examPreviewCloseBtn = document.getElementById("examPreviewClose");
const examPreviewBody = document.getElementById("examPreviewBody");
const examHistoryBackdrop = document.getElementById("examHistoryBackdrop");
const examHistoryModal = document.getElementById("examHistoryModal");
const examHistoryCloseBtn = document.getElementById("examHistoryClose");
const mappingBadge = document.getElementById("mappingBadge");
const publicAccessSummary = document.getElementById("publicAccessSummary");
const topbarSelectExam = document.getElementById("topbarSelectExam");
const topbarImportEsse3 = document.getElementById("topbarImportEsse3");
const topbarExportXls = document.getElementById("topbarExportXls");
const topbarClear = document.getElementById("topbarClear");
const emptySelectExam = document.getElementById("emptySelectExam");
const publicAccessMask = "••••••••";
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
let currentExam = null;
let publicExamsCache = [];
let publicSelectedExam = null;
let publicAccessEnabled = false;
let currentSessionId = null;
let sessionSaveTimer = null;
let activeQuestionIndex = 1;
let activeAnswerIndex = 0;
let currentStudentCredentials = null;

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

const fetchActiveCourse = async () => {
  try {
    const res = await fetch("api/session/course");
    if (!res.ok) return null;
    const payload = await res.json();
    return payload.course || null;
  } catch {
    return null;
  }
};

const fetchActiveExam = async () => {
  try {
    const res = await fetch("api/session/exam");
    if (!res.ok) return null;
    const payload = await res.json();
    return payload.exam || null;
  } catch {
    return null;
  }
};

const setActiveExam = async (examId) => {
  if (!Number.isFinite(Number(examId))) return;
  try {
    await fetch("api/session/exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId }),
    });
  } catch {
    // ignore
  }
};

const initApp = async () => {
  if (!appUser) {
    loadStudents();
    renderGrading();
    loadExams();
    updateExamVisibility(Boolean(mapping));
    return;
  }
  const activeCourse = await fetchActiveCourse();
  debugLog("activeCourse", activeCourse);
  if (!activeCourse) {
    if (courseEmptyState) courseEmptyState.classList.remove("is-hidden");
    if (mainLayout) mainLayout.classList.add("is-hidden");
    return;
  }
  activeCourseId = activeCourse.id;
  if (courseEmptyState) courseEmptyState.classList.add("is-hidden");
  if (mainLayout) mainLayout.classList.remove("is-hidden");
  const activeExam = await fetchActiveExam();
  debugLog("activeExam", activeExam);
  loadStudents();
  renderGrading();
  await loadExams();
  if (activeExam?.id) {
    await loadMappingFromExam(activeExam.id);
  } else {
    updateExamVisibility(Boolean(mapping));
  }
};

const formatDateLabel = (isoDate) => {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

const getDefaultAccessExpiry = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};


const setPublicAccessSummary = (text, isActive = false, icon = "lock") => {
  if (!publicAccessSummary) return;
  if (!text) {
    publicAccessSummary.textContent = "";
  } else {
    const iconClass = icon === "unlock" ? "fa-lock-open" : "fa-lock";
    publicAccessSummary.innerHTML = `<i class="fa-solid ${iconClass}"></i>${text}`;
  }
  publicAccessSummary.classList.toggle("is-active", isActive);
  publicAccessSummary.classList.toggle("is-hidden", !text);
  publicAccessSummary.setAttribute("aria-hidden", text ? "false" : "true");
};

const setPublicAccessControlsEnabled = (enabled) => {
  publicAccessEnabled = Boolean(enabled);
  if (publicAccessToggleBtn) {
    publicAccessToggleBtn.textContent = publicAccessEnabled
      ? "Rimuovi accesso"
      : "Abilita accesso";
    publicAccessToggleBtn.classList.toggle("is-active", publicAccessEnabled);
  }
  if (!publicAccessFields) return;
  publicAccessFields.classList.toggle("is-disabled", !publicAccessEnabled);
  if (publicAccessPasswordInput) {
    publicAccessPasswordInput.disabled = !publicAccessEnabled;
    publicAccessPasswordInput.value = "";
    publicAccessPasswordInput.classList.remove("is-masked");
  }
  if (publicAccessExpiresAtInput) {
    publicAccessExpiresAtInput.disabled = !publicAccessEnabled;
  }
  if (publicAccessShowNotesToggle) {
    publicAccessShowNotesToggle.disabled = !publicAccessEnabled;
    if (!publicAccessEnabled) publicAccessShowNotesToggle.checked = false;
  }
};

const updatePublicAccessUI = (exam) => {
  if (!publicAccessControls) return;
  if (!exam) {
    setPublicAccessControlsEnabled(false);
    if (publicAccessExpiresAtInput) publicAccessExpiresAtInput.value = "";
    showToast("Seleziona una traccia per configurare l'accesso studenti.", "error");
    setPublicAccessSummary("", false);
    return;
  }
  const enabled = Boolean(exam.publicAccessEnabled);
  setPublicAccessControlsEnabled(enabled);
  if (publicAccessPasswordInput) {
    publicAccessPasswordInput.classList.remove("is-masked");
  }
  if (publicAccessExpiresAtInput) {
    publicAccessExpiresAtInput.value = exam.publicAccessExpiresAt
      ? exam.publicAccessExpiresAt.slice(0, 10)
      : "";
  }
  if (publicAccessShowNotesToggle) {
    publicAccessShowNotesToggle.checked = Boolean(exam.publicAccessShowNotes);
    publicAccessShowNotesToggle.disabled = !enabled || !exam.hasResults;
  }
  if (!enabled) {
    showToast("Accesso studenti disattivato.");
    setPublicAccessSummary("Accesso studenti disattivato", false, "unlock");
    return;
  }
  if (publicAccessPasswordInput && exam.publicAccessHasPassword) {
    publicAccessPasswordInput.value = publicAccessMask;
    publicAccessPasswordInput.classList.add("is-masked");
  }
  const expiryLabel = exam.publicAccessExpiresAt
    ? ` (scadenza ${formatDateLabel(exam.publicAccessExpiresAt.slice(0, 10))})`
    : "";
  showToast(`Accesso studenti attivo${expiryLabel}.`, "success");
  setPublicAccessSummary(`Accesso studenti attivo${expiryLabel}`, true, "lock");
};

const savePublicAccess = async () => {
  if (!currentExamId) {
    showToast("Seleziona una traccia prima di salvare.", "error");
    return;
  }
  const enabled = Boolean(publicAccessEnabled);
  const payload = { enabled };
  if (enabled) {
    const passwordRaw = String(publicAccessPasswordInput?.value || "").trim();
    const password = passwordRaw === publicAccessMask ? "" : passwordRaw;
    if (password) {
      payload.password = password;
    } else if (!currentExam || !currentExam.publicAccessEnabled) {
      showToast("Inserisci una password per abilitare l'accesso.", "error");
      return;
    }
    const expiresAt = String(publicAccessExpiresAtInput?.value || "").trim();
    payload.expiresAt = expiresAt || getDefaultAccessExpiry();
    payload.showNotes = Boolean(publicAccessShowNotesToggle?.checked);
  }
  try {
    const response = await fetch(`api/exams/${currentExamId}/public-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const info = await response.json().catch(() => ({}));
      showToast(info.error || "Errore salvataggio accesso.", "error");
      return;
    }
    const examResponse = await fetch(`api/exams/${currentExamId}`);
    if (examResponse.ok) {
      const examPayload = await examResponse.json();
      currentExam = examPayload.exam;
      updatePublicAccessUI(currentExam);
    } else {
      showToast("Accesso aggiornato.", "success");
    }
    showToast("Accesso studenti aggiornato.", "success");
  } catch {
    showToast("Errore di rete.", "error");
  }
};

const parseExamDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parts = raw.split("-");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const updatePublicAccessHeader = (step) => {
  if (!publicAccessHeaderTitle || !publicAccessHeaderSubtitle) return;

  if (step === "courses") {
    publicAccessHeaderTitle.textContent = "Seleziona il corso";
    publicAccessHeaderSubtitle.textContent = "Scegli il corso per visualizzare le tracce disponibili.";
  } else if (step === "exams") {
    publicAccessHeaderTitle.textContent = "Seleziona l'esame";
    publicAccessHeaderSubtitle.textContent = "Scegli la traccia per accedere alla valutazione.";
  }
};

const renderPublicCourses = () => {
  if (!publicCourseGrid) return;
  publicCourseGrid.innerHTML = "";
  const courses = Array.from(
    publicExamsCache.reduce((acc, exam) => {
      if (!acc.has(exam.course_id)) acc.set(exam.course_id, exam.course_name);
      return acc;
    }, new Map())
  ).map(([id, name]) => ({ id, name }));

  if (!courses.length) {
    publicCourseGrid.textContent = "Nessun corso disponibile.";
    return;
  }

  courses.forEach((course) => {
    const card = document.createElement("div");
    card.className = "exam-card";
    const band = document.createElement("div");
    band.className = "exam-card-band";
    const badges = document.createElement("div");
    badges.className = "exam-card-badges";
    const count = publicExamsCache.filter((exam) => exam.course_id === course.id).length;
    if (count) {
      const badge = document.createElement("span");
      badge.className = "exam-card-badge";
      badge.textContent = `Tracce: ${count}`;
      badges.appendChild(badge);
    }
    if (badges.childNodes.length) band.appendChild(badges);
    const body = document.createElement("div");
    body.className = "exam-card-body";
    const title = document.createElement("div");
    title.className = "exam-card-title";
    title.textContent = course.name || "Corso";
    const meta = document.createElement("div");
    meta.className = "exam-card-meta";
    meta.textContent = "Seleziona per vedere le tracce disponibili";
    body.appendChild(title);
    body.appendChild(meta);
    card.appendChild(band);
    card.appendChild(body);
    card.addEventListener("click", () => {
      renderPublicExams(course.id);
      publicCourseGrid.classList.add("is-hidden");
      if (publicExamSection) publicExamSection.classList.remove("is-hidden");
      updatePublicAccessHeader("exams");
    });
    publicCourseGrid.appendChild(card);
  });
};

const renderPublicExams = (courseId) => {
  if (!publicExamGrid) return;
  publicExamGrid.innerHTML = "";
  const exams = publicExamsCache
    .filter((exam) => Number(exam.course_id) === Number(courseId))
    .sort((a, b) => {
      const da = parseExamDate(a.date);
      const db = parseExamDate(b.date);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    });

  if (!exams.length) {
    publicExamGrid.textContent = "Nessuna traccia disponibile.";
    return;
  }

  exams.forEach((exam) => {
    const card = document.createElement("div");
    card.className = "exam-card";
    const band = document.createElement("div");
    band.className = "exam-card-band";
    const badges = document.createElement("div");
    badges.className = "exam-card-badges";
    if (exam.date) {
      const badge = document.createElement("span");
      badge.className = "exam-card-badge";
      badge.textContent = exam.date;
      badges.appendChild(badge);
    }
    if (badges.childNodes.length) band.appendChild(badges);
    const body = document.createElement("div");
    body.className = "exam-card-body";
    const title = document.createElement("div");
    title.className = "exam-card-title";
    title.textContent = exam.title || "Traccia";
    const meta = document.createElement("div");
    meta.className = "exam-card-meta";
    meta.textContent = "Apri accesso valutazione";
    body.appendChild(title);
    body.appendChild(meta);
    card.appendChild(band);
    card.appendChild(body);
    card.addEventListener("click", () => {
      publicSelectedExam = exam;
      openPublicAccessModal(exam);
    });
    publicExamGrid.appendChild(card);
  });
};

const openPublicAccessModal = (exam) => {
  if (!publicAccessModal || !publicAccessBackdrop) return;
  const title = document.getElementById("publicAccessTitle");
  if (title) {
    title.textContent = exam?.title ? `Accesso traccia: ${exam.title}` : "Accesso traccia";
  }
  if (publicAccessError) publicAccessError.textContent = "";
  if (publicAccessForm) publicAccessForm.reset();
  publicAccessModal.classList.remove("is-hidden");
  publicAccessBackdrop.classList.remove("is-hidden");
};

const closePublicAccessModal = () => {
  if (!publicAccessModal || !publicAccessBackdrop) return;
  publicAccessModal.classList.add("is-hidden");
  publicAccessBackdrop.classList.add("is-hidden");
};

const loadPublicExams = async () => {
  if (!publicCourseGrid || !publicExamGrid) return;
  try {
    const response = await fetch("api/public-exams");
    if (!response.ok) throw new Error();
    const payload = await response.json();
    publicExamsCache = payload.exams || [];
    renderPublicCourses();
    if (publicExamSection) publicExamSection.classList.add("is-hidden");
    publicCourseGrid.classList.remove("is-hidden");
    updatePublicAccessHeader("courses");
  } catch {
    if (publicAccessError) {
      publicAccessError.textContent = "Errore nel caricamento tracce.";
    }
  }
};

const renderPublicResults = (payload) => {
  if (!publicResultWrap) return;

  // Hide all course/exam selection UI, show only results
  if (publicCourseGrid) publicCourseGrid.classList.add("is-hidden");
  if (publicExamSection) publicExamSection.classList.add("is-hidden");
  if (publicAccessForm) publicAccessForm.classList.add("is-hidden");
  if (publicAccessHeader) publicAccessHeader.classList.add("is-hidden");

  // Show results
  publicResultWrap.classList.remove("is-hidden");
  if (publicPrintResult) publicPrintResult.classList.remove("is-hidden");
  if (publicResultTitle) {
    const dateText = payload.exam.date ? ` • ${payload.exam.date}` : "";
    publicResultTitle.textContent = `${payload.exam.courseName} — ${payload.exam.title}${dateText}`;
  }
  if (publicResultGrade) {
    publicResultGrade.textContent = `Voto: ${payload.grade.normalized}/30`;
  }
  if (publicResultMeta) {
    const nameParts = [payload.student.nome, payload.student.cognome]
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    const name = nameParts.length ? nameParts.join(" ") : "Studente";
    publicResultMeta.textContent = `${name} • Matricola ${payload.student.matricola} • Versione ${payload.student.versione}`;
  }
  if (publicResultQuestions) {
    publicResultQuestions.innerHTML = "";
    payload.questions.forEach((question, qIndex) => {
      const card = document.createElement("div");
      const correctClass = question.isCorrect ? "question-correct" : "question-wrong";
      card.className = `card shadow-sm public-question-card ${correctClass}`;
      card.dataset.questionIndex = qIndex;
      const body = document.createElement("div");
      body.className = "card-body";
      const title = document.createElement("div");
      title.className = "public-question-header";
      const badge = document.createElement("span");
      badge.className = "selected-question-badge";
      badge.textContent = `Es. ${question.index}`;
      const score = document.createElement("span");
      const pointsEarned = Number.isFinite(Number(question.pointsEarned))
        ? Number(question.pointsEarned)
        : 0;
      const pointsTotal = Number.isFinite(Number(question.pointsTotal))
        ? Number(question.pointsTotal)
        : 0;
      score.className = `question-score-badge${question.isCorrect ? " is-correct" : ""}${question.isOverride ? " is-override" : ""}`;
      score.textContent = `${pointsEarned}/${pointsTotal}`;
      title.appendChild(badge);
      title.appendChild(score);
      const text = document.createElement("div");
      text.className = "question-preview";
      renderLatexHtml(question.text, text);
      let note = null;
      if (question.note) {
        note = document.createElement("div");
        note.className = "public-question-note";
        note.innerHTML = "<strong>Nota:</strong>";
        const noteBody = document.createElement("div");
        noteBody.className = "public-question-note-body";
        renderLatexHtml(question.note, noteBody);
        note.appendChild(noteBody);
      }
      const answers = document.createElement("div");
      answers.className = "vstack gap-2 mt-3";
      question.answers.forEach((ans) => {
        const row = document.createElement("div");
        row.className = "preview-answer-row";
        const label = document.createElement("span");
        label.className = "preview-answer-label";
        label.textContent = ans.letter;
        const answerText = document.createElement("div");
        answerText.className = "preview-answer-text";
        renderLatexHtml(ans.text, answerText);
        row.appendChild(label);
        row.appendChild(answerText);
        if (ans.note) {
          const note = document.createElement("div");
          note.className = "preview-answer-note";
          note.innerHTML = "<strong>Nota:</strong>";
          const noteBody = document.createElement("div");
          noteBody.className = "preview-answer-note-body";
          renderLatexHtml(ans.note, noteBody);
          note.appendChild(noteBody);
          row.appendChild(note);
        }
        if (ans.isCorrect) {
          row.classList.add("is-correct");
        }
        if (ans.selected) {
          row.classList.add("is-selected");
        }
        if (ans.isCorrect) {
          const tick = document.createElement("span");
          tick.className = "answer-tick";
          tick.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.4-1.4z"/></svg>';
          row.appendChild(tick);
        }
        answers.appendChild(row);
      });
      body.appendChild(title);
      body.appendChild(text);
      if (note) body.appendChild(note);
      const selectionMeta = document.createElement("div");
      selectionMeta.className = "public-question-meta";
      const selectedLabel = question.selectedLetters?.length
        ? question.selectedLetters.join(", ")
        : "Nessuna";
      const correctLabel = question.correctLetters?.length
        ? question.correctLetters.join(", ")
        : "-";
      selectionMeta.innerHTML = `<span><strong>Selezionate:</strong> ${selectedLabel}</span><span><strong>Corrette:</strong> ${correctLabel}</span>`;
      body.appendChild(selectionMeta);
      body.appendChild(answers);

      // Add "Next Question" icon button for all except the last question
      if (qIndex < payload.questions.length - 1) {
        const nextBtn = document.createElement("button");
        nextBtn.className = "btn btn-link text-secondary next-question-btn";
        nextBtn.type = "button";
        nextBtn.innerHTML = '<i class="fa-solid fa-circle-chevron-down fa-2x"></i>';
        nextBtn.title = "Prossima domanda";
        nextBtn.setAttribute("aria-label", "Prossima domanda");
        nextBtn.addEventListener("click", () => {
          const nextCard = publicResultQuestions.querySelector(
            `.public-question-card[data-question-index="${qIndex + 1}"]`
          );
          if (nextCard) {
            nextCard.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
        body.appendChild(nextBtn);
      }

      card.appendChild(body);
      publicResultQuestions.appendChild(card);
    });
  }
};

const initPublicAccess = () => {
  if (!publicAccessForm) return;
  loadPublicExams();

  if (publicAccessClose) {
    publicAccessClose.addEventListener("click", closePublicAccessModal);
  }
  if (publicAccessBackdrop) {
    publicAccessBackdrop.addEventListener("click", (event) => {
      if (event.target === publicAccessBackdrop) {
        closePublicAccessModal();
      }
    });
  }
  if (publicAccessModal) {
    publicAccessModal.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }
  if (backToCoursesBtn) {
    backToCoursesBtn.addEventListener("click", () => {
      if (publicExamSection) publicExamSection.classList.add("is-hidden");
      if (publicCourseGrid) publicCourseGrid.classList.remove("is-hidden");
      updatePublicAccessHeader("courses");
    });
  }

  publicAccessForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Clear previous errors and results
    if (publicAccessError) publicAccessError.textContent = "";
    if (publicResultWrap) publicResultWrap.classList.add("is-hidden");
    if (publicPrintResult) publicPrintResult.classList.add("is-hidden");
    if (publicAccessForm) publicAccessForm.classList.remove("is-hidden");

    // Get form values
    const examId = publicSelectedExam ? Number(publicSelectedExam.id) : null;
    const matricola = String(publicMatricola?.value || "").trim();
    const password = String(publicPassword?.value || "");

    // Validate inputs
    if (!Number.isFinite(examId)) {
      if (publicAccessError) publicAccessError.textContent = "Errore: traccia non selezionata.";
      console.error("Exam ID not valid:", publicSelectedExam);
      return;
    }
    if (!matricola || !password) {
      if (publicAccessError) publicAccessError.textContent = "Inserisci matricola e password.";
      return;
    }

    // Make API request
    try {
      const response = await fetch("api/public-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, matricola, password }),
      });

      if (!response.ok) {
        const info = await response.json().catch(() => ({}));
        if (publicAccessError) {
          publicAccessError.textContent = info.error || "Matricola o password errati.";
        }
        console.error("API error:", info);
        return;
      }

      const payload = await response.json();

      // Store credentials for prompt testing
      currentStudentCredentials = {
        examId: examId,
        matricola: matricola,
        password: password
      };

      renderPublicResults(payload);
      closePublicAccessModal();
    } catch (error) {
      if (publicAccessError) publicAccessError.textContent = "Errore di rete.";
      console.error("Network error:", error);
    }
  });
  if (publicPrintResult) {
    publicPrintResult.addEventListener("click", () => {
      window.print();
    });
  }
};

const setMappingBadge = (text, isActive = false) => {
  if (!mappingBadge) return;
  mappingBadge.textContent = text;
  mappingBadge.classList.toggle("is-active", isActive);
  debugLog("setMappingBadge", text, isActive);
};

const examSections = Array.from(document.querySelectorAll(".exam-section"));
const examEmptyState = document.getElementById("examEmptyState");
const examLockedState = document.getElementById("examLockedState");

const updateExamVisibility = (hasExam, requiresClose = false) => {
  const resolvedHasExam = Boolean(hasExam || mapping);
  debugLog("updateExamVisibility", {
    hasExam,
    resolvedHasExam,
    requiresClose,
    mapping,
  });
  if (examEmptyState) {
    examEmptyState.classList.toggle("is-hidden", resolvedHasExam || requiresClose);
  }
  if (examLockedState) {
    examLockedState.classList.toggle("is-hidden", !requiresClose);
  }
  examSections.forEach((section) => {
    section.classList.toggle("is-hidden", !resolvedHasExam || requiresClose);
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
    debugLog("loadSession start", sessionId);
    const response = await fetch(`api/sessions/${sessionId}`);
    debugLog("loadSession response", response.status);
    if (!response.ok) {
      showToast("Errore nel caricamento sessione.", "error");
      return;
    }
    const payload = await response.json();
    currentSessionId = payload.session.id;
    students = payload.students || [];
    persistStudents();
    resultDateInput.value = payload.session.result_date || "";
    if (targetTopGradeInput) {
      const target = Number(payload.session.target_top_grade);
      targetTopGradeInput.value = Number.isFinite(target) ? target : 30;
    }
    debugLog("loadSession payload", {
      sessionId: payload.session.id,
      students: students.length,
      targetTopGrade: payload.session.target_top_grade,
    });
    renderTable();
    renderGrading();
    showToast("Sessione caricata.", "success");
  } catch {
    showToast("Errore nel caricamento sessione.", "error");
  }
};

const saveSession = async (options = {}) => {
  if (!currentSessionId) return;
  try {
    const includeNormalization = options.includeNormalization === true;
    const studentsPayload = students.map((student) => {
      const { normalizedScore, ...rest } = student;
      return includeNormalization ? { ...rest, normalizedScore } : rest;
    });
    const payload = {
      title: sessionSelect?.selectedOptions?.[0]?.textContent || null,
      resultDate: resultDateInput.value || "",
      includeNormalization,
      ...(includeNormalization && targetTopGradeInput
        ? { targetTopGrade: Number(targetTopGradeInput.value) }
        : {}),
      students: studentsPayload,
    };
    await fetch(`api/sessions/${currentSessionId}`, {
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
    debugLog("loadSessionsForExam start", examId);
    const response = await fetch(`api/exams/${examId}/sessions`);
    debugLog("loadSessionsForExam response", response.status);
    if (!response.ok) {
      renderSessionSelect([], null);
      return;
    }
    const payload = await response.json();
    const sessions = payload.sessions || [];
    debugLog("loadSessionsForExam payload", sessions.length, sessions);
    renderSessionSelect(sessions, currentSessionId);
    if (!sessions.length) {
      const title = formatSessionTitle(resultDateInput.value || "");
      const createResponse = await fetch(`api/exams/${examId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          resultDate: resultDateInput.value || "",
        }),
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
      note: ans.note || "",
      isCorrect: Boolean(ans.isCorrect),
    }));
  }
  const adict = mapping.randomizedanswersdictionary[version - 1];
  const cdict = mapping.correctiondictionary;
  if (!adict || !adict[originalIndex] || !cdict || !cdict[originalIndex]) {
    return rawAnswers.map((ans) => ({
      text: ans.text || "",
      note: ans.note || "",
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
        note: answer.note || "",
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
  if (question.note) {
    const note = document.createElement("div");
    note.className = "public-question-note";
    note.innerHTML = "<strong>Nota:</strong>";
    const noteBody = document.createElement("div");
    noteBody.className = "public-question-note-body";
    renderLatexHtml(question.note, noteBody);
    note.appendChild(noteBody);
    examPreviewBody.appendChild(note);
  }
  if (question.imagePath) {
    const imgWrap = document.createElement("div");
    imgWrap.className = "selected-question-image";
    const img = document.createElement("img");
    img.className = "selected-preview-thumb";
    img.src = question.imageThumbnailPath || question.imagePath;
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
        if (answer.note) {
          const note = document.createElement("div");
          note.className = "preview-answer-note";
          note.innerHTML = "<strong>Nota:</strong>";
          const noteBody = document.createElement("div");
          noteBody.className = "preview-answer-note-body";
          renderLatexHtml(answer.note, noteBody);
          note.appendChild(noteBody);
          row.appendChild(note);
        }
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
    row.dataset.question = String(i);

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
        activeQuestionIndex = i;
        activeAnswerIndex = ANSWER_OPTIONS.indexOf(letter);
        updateAnswerRowFocus();
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
  updateAnswerRowFocus();
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

const filterStudents = (query) =>
  students
    .map((student, index) => ({ student, index }))
    .filter(({ student }) => {
      if (!query) return true;
      return (
        String(student.matricola || "").toLowerCase().includes(query) ||
        String(student.nome || "").toLowerCase().includes(query) ||
        String(student.cognome || "").toLowerCase().includes(query)
      );
    });

const loadStudentForEdit = (idx) => {
  const student = students[idx];
  if (!student) return;
  editingIndex = idx;
  if (submitBtn) submitBtn.textContent = "Aggiorna studente";
  matricolaInput.value = student.matricola || "";
  nomeInput.value = student.nome || "";
  cognomeInput.value = student.cognome || "";
  versioneInput.value = student.versione || "";
  if (studentSearchInput) studentSearchInput.value = "";
  renderTable();
  versioneInput.focus();
  renderAnswerGrid();
  activeQuestionIndex = 1;
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
};

const updateAnswerRowFocus = () => {
  if (!answersGrid) return;
  answersGrid.querySelectorAll(".answer-row").forEach((row) => {
    const idx = Number(row.dataset.question);
    row.classList.toggle("is-active", idx === activeQuestionIndex);
  });
  updateAnswerButtonFocus();
};

const updateAnswerButtonFocus = () => {
  if (!answersGrid) return;
  const row = answersGrid.querySelector(
    `.answer-row[data-question="${activeQuestionIndex}"]`
  );
  if (!row) return;
  row.querySelectorAll(".toggle").forEach((btn, idx) => {
    btn.classList.toggle("is-focused", idx === activeAnswerIndex);
  });
};

const setActiveQuestion = (nextIndex) => {
  if (!Number.isFinite(nextIndex)) return;
  const clamped = Math.min(questionCount, Math.max(1, nextIndex));
  activeQuestionIndex = clamped;
  activeAnswerIndex = 0;
  updateAnswerRowFocus();
  const row = answersGrid.querySelector(`.answer-row[data-question="${activeQuestionIndex}"]`);
  if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
};

const handleAnswerShortcut = (event) => {
  if (!answersGrid || questionCount < 1) return;
  const target = event.target;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
  const key = event.key.toUpperCase();
  if (!ANSWER_OPTIONS.includes(key)) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveQuestion(activeQuestionIndex + 1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveQuestion(activeQuestionIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      activeAnswerIndex = Math.min(ANSWER_OPTIONS.length - 1, activeAnswerIndex + 1);
      updateAnswerButtonFocus();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      activeAnswerIndex = Math.max(0, activeAnswerIndex - 1);
      updateAnswerButtonFocus();
    }
    return;
  }
  event.preventDefault();
  const btn = answersGrid.querySelector(
    `.toggle[data-question="${activeQuestionIndex}"][data-answer="${key}"]`
  );
  if (btn) {
    btn.click();
    activeAnswerIndex = ANSWER_OPTIONS.indexOf(key);
    updateAnswerButtonFocus();
  }
};

const renderTable = () => {
  studentsTable.innerHTML = "";
  const query = String(studentSearchInput?.value || "").trim().toLowerCase();
  const filtered = filterStudents(query);
  debugLog("renderTable", {
    total: students.length,
    filtered: filtered.length,
    query,
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
    const isEvaluated = score !== null;
    const versionLabel = isEvaluated && student.versione ? student.versione : "-";
    const answersLabel = isEvaluated
      ? student.answers.join(" | ")
      : "-";
    const normalized =
      isEvaluated
        ? (Number.isFinite(Number(student.normalizedScore))
            ? Number(student.normalizedScore)
            : normalizeGrade(grade))
        : null;
    const row = document.createElement("tr");
    row.dataset.index = String(index);
    row.innerHTML = `
      <td>${student.matricola}</td>
      <td>${formatName(student.cognome)}</td>
      <td>${formatName(student.nome)}</td>
      <td>${versionLabel}</td>
      <td>${answersLabel}</td>
      <td>${score === null ? "-" : score}</td>
      <td>${grade === null ? "-" : grade.toFixed(2)}</td>
      <td>${normalized === null ? "-" : normalized}</td>
      <td class="row-actions">
        <button class="btn btn-sm btn-outline-secondary mini load" data-index="${index}" title="Modifica studente" aria-label="Modifica studente">
          <i class="fa-solid fa-user-pen"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger mini remove" data-index="${index}" title="Elimina studente" aria-label="Elimina studente">
          <i class="fa-solid fa-user-xmark"></i>
        </button>
        <button class="btn btn-sm btn-outline-primary mini show-prompt" data-index="${index}" title="Mostra prompt LLM" aria-label="Mostra prompt LLM">
          <i class="fa-solid fa-robot"></i>
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
  studentsTable.querySelectorAll("tr[data-index]").forEach((row) => {
    row.addEventListener("dblclick", () => {
      const idx = Number(row.dataset.index);
      if (!Number.isFinite(idx)) return;
      loadStudentForEdit(idx);
    });
  });

  studentsTable.querySelectorAll(".mini.load").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      loadStudentForEdit(idx);
    });
  });

  studentsTable.querySelectorAll(".mini.show-prompt").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.index);
      const student = students[idx];
      if (!student || !currentExamId) {
        alert("Errore: dati studente non disponibili");
        return;
      }

      // Open modal
      if (promptTestBackdrop) promptTestBackdrop.classList.remove("is-hidden");
      if (promptTestModal) promptTestModal.classList.remove("is-hidden");
      if (promptTestContent) promptTestContent.textContent = "Caricamento prompt...";

      try {
        const response = await fetch("api/study-advice-prompt-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId: currentExamId,
            matricola: student.matricola
          })
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API error:", errorData);
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log("Prompt received, length:", data.prompt?.length);
        if (promptTestContent) promptTestContent.textContent = data.prompt;
      } catch (error) {
        console.error("Error fetching prompt:", error);
        if (promptTestContent) {
          promptTestContent.textContent = "Errore: " + error.message;
        }
      }
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

    if (gradeHistogram) gradeHistogram.innerHTML = "";
    if (gradingFactor) gradingFactor.textContent = "Fattore: -";
    if (targetTopGradeInput) targetTopGradeInput.disabled = true;
    if (currentTopGradeBadge) currentTopGradeBadge.textContent = "-";
    if (exportGradedBtn) exportGradedBtn.disabled = true;
    if (exportResultsXlsBtn) exportResultsXlsBtn.disabled = true;
    if (topbarExportXls) topbarExportXls.disabled = true;
    return;
  }

  if (exportGradedBtn) exportGradedBtn.disabled = false;
  if (exportResultsXlsBtn) exportResultsXlsBtn.disabled = false;
  if (topbarExportXls) topbarExportXls.disabled = false;
  if (targetTopGradeInput) targetTopGradeInput.disabled = false;
  const maxPoints = getMaxPoints();
  const scores = students.map((student) => gradeStudent(student)).filter((val) => val !== null);
  if (scores.length === 0) {
    if (gradeHistogram) gradeHistogram.innerHTML = "";
    if (currentTopGradeBadge) currentTopGradeBadge.textContent = "-";
    if (exportGradedBtn) exportGradedBtn.disabled = true;
    if (exportResultsXlsBtn) exportResultsXlsBtn.disabled = true;
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
  if (gradingFactor) {
    gradingFactor.textContent = factor ? `Fattore: ${factor.toFixed(3)}` : "Fattore: -";
  }


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
    currentExam = null;
    updatePublicAccessUI(null);
    return;
  }
  currentExamId = parsedId;
  mappingStatus.textContent = "Caricamento mapping in corso...";
  debugLog("loadMappingFromExam start", parsedId);
  try {
    const response = await fetch(`api/exams/${parsedId}/mapping`);
    debugLog("mapping response", response.status);
    if (!response.ok) {
      const info = await response.json().catch(() => ({}));
      const errorMessage = info.error || "Errore nel mapping.";
      debugLog("mapping error", errorMessage);
      mappingStatus.textContent = errorMessage;
      setMappingBadge("Nessuna traccia", false);
      const lower = errorMessage.toLowerCase();
      if (lower.includes("non e chiusa")) {
        setMappingBadge("Traccia non chiusa", false);
        updateExamVisibility(false, true);
      } else {
        updateExamVisibility(false);
      }
      try {
        const examResponse = await fetch(`api/exams/${parsedId}`);
        debugLog("exam details response", examResponse.status);
        if (examResponse.ok) {
          const examPayload = await examResponse.json();
          currentExam = examPayload.exam;
          debugLog("exam details", currentExam);
          if (currentExam?.isDraft) {
            setMappingBadge("Traccia non chiusa", false);
            updateExamVisibility(false, true);
          }
        }
      } catch {
        // ignore
      }
      return;
    }
    const payload = await response.json();
    debugLog("mapping payload", payload);
    mapping = payload.mapping;
    questionCount = mapping.Nquestions;
    mappingStatus.textContent = `Mapping caricato: ${mapping.Nquestions} domande, ${mapping.Nversions} versioni.`;
    setMappingBadge("Traccia selezionata", true);
    updateExamVisibility(true);
    try {
      const examResponse = await fetch(`api/exams/${parsedId}`);
      debugLog("exam response", examResponse.status);
      if (examResponse.ok) {
        const examPayload = await examResponse.json();
        currentExam = examPayload.exam;
        examQuestions = examPayload.questions || [];
        debugLog("exam loaded", currentExam, examQuestions.length);
        updatePublicAccessUI(currentExam);
      } else {
        currentExam = null;
        examQuestions = [];
        updatePublicAccessUI(null);
      }
    } catch {
      currentExam = null;
      examQuestions = [];
      updatePublicAccessUI(null);
    }
    setActiveExam(parsedId);
    await loadSessionsForExam(parsedId);
    try {
      renderTable();
      renderGrading();
      renderAnswerGrid();
      applyCorrectHints();
      updatePerQuestionScores();
      updateExamInfo(parsedId);
    } catch (err) {
      debugLog("loadMappingFromExam render error", err);
    }
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
    const response = await fetch("api/exams");
    if (!response.ok) {
      mappingStatus.textContent = "Errore caricamento tracce.";
      return;
    }
    const payload = await response.json();
    examsCache = payload.exams || [];
    debugLog("exams loaded", examsCache.length, examsCache);
    if (Number.isFinite(activeCourseId)) {
      examsCache = examsCache.filter((exam) => exam.course_id === activeCourseId);
    }
    examStatsCache = await loadExamStats();
    renderExamHistory(examsCache);
    if (!mapping) setMappingBadge("Nessuna traccia", false);
    updateExamVisibility(Boolean(mapping));
    if (!currentExamId) updatePublicAccessUI(null);
  } catch {
    mappingStatus.textContent = "Errore caricamento tracce.";
    setMappingBadge("Nessuna traccia", false);
    updateExamVisibility(Boolean(mapping));
    updatePublicAccessUI(null);
  }
};

const loadExamStats = async () => {
  try {
    const response = await fetch("api/exams/stats");
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
  const response = await fetch("api/import-esse3", {
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

const recalcNormalizedScores = async () => {
  if (!mapping) {
    showToast("Carica una traccia prima di ricalcolare.", "error");
    return;
  }
  const maxPoints = getMaxPoints();
  students.forEach((student) => {
    const score = gradeStudent(student);
    if (score === null) {
      student.normalizedScore = null;
      return;
    }
    const grade = toThirty(score, maxPoints);
    student.normalizedScore = normalizeGrade(grade);
  });
  renderTable();
  renderGrading();
  await saveSession({ includeNormalization: true });
  showToast("Voti normalizzati aggiornati.", "success");
};

const renderHistogram = (normalizedGrades) => {
  if (!gradeHistogram) return;
  const buckets = Array.from({ length: 31 }, () => 0);
  normalizedGrades.forEach((grade) => {
    const clamped = Math.min(30, Math.max(0, Number(grade)));
    buckets[clamped] += 1;
  });
  const maxCount = Math.max(1, ...buckets);
  if (!gradeHistogram) return;
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

if (publicPasswordToggle && publicPassword) {
  publicPasswordToggle.addEventListener("click", () => {
    const isPassword = publicPassword.type === "password";
    publicPassword.type = isPassword ? "text" : "password";
    publicPasswordToggle.innerHTML = isPassword
      ? "<i class=\"fa-regular fa-eye-slash\"></i>"
      : "<i class=\"fa-regular fa-eye\"></i>";
    publicPasswordToggle.setAttribute(
      "aria-label",
      isPassword ? "Nascondi password" : "Mostra password"
    );
  });
}

if (publicAccessPasswordInput) {
  publicAccessPasswordInput.addEventListener("focus", () => {
    if (publicAccessPasswordInput.classList.contains("is-masked")) {
      publicAccessPasswordInput.value = "";
      publicAccessPasswordInput.classList.remove("is-masked");
    }
  });
}

if (!appUser) {
  initPublicAccess();
} else {
  if (resetFormBtn && studentForm) {
    resetFormBtn.addEventListener("click", () => {
      studentForm.reset();
      clearSelections();
      applyCorrectHints();
      updatePerQuestionScores();
      editingIndex = null;
      if (submitBtn) submitBtn.textContent = "Aggiungi studente";
    });
  }
  if (studentForm) studentForm.addEventListener("submit", addStudent);
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
  if (publicAccessToggleBtn) {
    publicAccessToggleBtn.addEventListener("click", () => {
      const enabled = !publicAccessEnabled;
      setPublicAccessControlsEnabled(enabled);
      if (enabled && publicAccessExpiresAtInput && !publicAccessExpiresAtInput.value) {
        publicAccessExpiresAtInput.value = getDefaultAccessExpiry();
      }
      if (!enabled) {
        savePublicAccess();
      } else {
        showToast("Inserisci una password e salva per attivare.");
      }
    });
  }
  if (recalcNormalizedBtn) {
    recalcNormalizedBtn.addEventListener("click", () => {
      recalcNormalizedScores();
    });
  }
  if (publicAccessSaveBtn) publicAccessSaveBtn.addEventListener("click", savePublicAccess);

  // Prompt test modal event listeners
  if (promptTestClose) {
    promptTestClose.addEventListener("click", () => {
      if (promptTestBackdrop) promptTestBackdrop.classList.add("is-hidden");
      if (promptTestModal) promptTestModal.classList.add("is-hidden");
    });
  }

  if (promptTestBackdrop) {
    promptTestBackdrop.addEventListener("click", (event) => {
      if (event.target === promptTestBackdrop) {
        promptTestBackdrop.classList.add("is-hidden");
        if (promptTestModal) promptTestModal.classList.add("is-hidden");
      }
    });
  }

  if (copyPromptBtn) {
    copyPromptBtn.addEventListener("click", () => {
      if (!promptTestContent) return;
      const text = promptTestContent.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = copyPromptBtn.innerHTML;
        copyPromptBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copiato!';
        setTimeout(() => {
          copyPromptBtn.innerHTML = originalText;
        }, 2000);
      }).catch(err => {
        console.error("Failed to copy:", err);
        alert("Errore nella copia del testo");
      });
    });
  }

  // Teaching improvement prompt button
  if (topbarTeachingPrompt) {
    topbarTeachingPrompt.addEventListener("click", async () => {
      if (!currentExamId) {
        alert("Seleziona prima una traccia");
        return;
      }

      // Open modal
      if (teachingPromptBackdrop) teachingPromptBackdrop.classList.remove("is-hidden");
      if (teachingPromptModal) teachingPromptModal.classList.remove("is-hidden");
      if (teachingPromptContent) teachingPromptContent.textContent = "Caricamento prompt...";

      try {
        const response = await fetch("api/teaching-improvement-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId: currentExamId })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Errore nella generazione del prompt");
        }

        const data = await response.json();
        if (teachingPromptContent) teachingPromptContent.textContent = data.prompt;
      } catch (err) {
        console.error("Error fetching teaching prompt:", err);
        if (teachingPromptContent) {
          teachingPromptContent.textContent = "Errore: " + err.message;
        }
        alert("Errore nella generazione del prompt: " + err.message);
      }
    });
  }

  // Teaching prompt modal event listeners
  if (teachingPromptClose) {
    teachingPromptClose.addEventListener("click", () => {
      if (teachingPromptBackdrop) teachingPromptBackdrop.classList.add("is-hidden");
      if (teachingPromptModal) teachingPromptModal.classList.add("is-hidden");
    });
  }

  if (teachingPromptBackdrop) {
    teachingPromptBackdrop.addEventListener("click", (event) => {
      if (event.target === teachingPromptBackdrop) {
        teachingPromptBackdrop.classList.add("is-hidden");
        if (teachingPromptModal) teachingPromptModal.classList.add("is-hidden");
      }
    });
  }

  if (copyTeachingPromptBtn) {
    copyTeachingPromptBtn.addEventListener("click", () => {
      if (!teachingPromptContent) return;
      const text = teachingPromptContent.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const originalText = copyTeachingPromptBtn.innerHTML;
        copyTeachingPromptBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copiato!';
        setTimeout(() => {
          copyTeachingPromptBtn.innerHTML = originalText;
        }, 2000);
      }).catch(err => {
        console.error("Failed to copy:", err);
        alert("Errore nella copia del testo");
      });
    });
  }

  if (exportGradedBtn) {
    exportGradedBtn.addEventListener("click", () => {
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
  }
  if (examPreviewCloseBtn) examPreviewCloseBtn.addEventListener("click", closeExamPreview);
  if (examPreviewBackdrop) examPreviewBackdrop.addEventListener("click", closeExamPreview);
  if (examHistoryCloseBtn) examHistoryCloseBtn.addEventListener("click", closeExamHistoryModal);
  if (examHistoryBackdrop) examHistoryBackdrop.addEventListener("click", closeExamHistoryModal);
  if (versioneInput) {
    versioneInput.addEventListener("input", () => {
      applyCorrectHints();
      updatePerQuestionScores();
    });
  }
  if (targetTopGradeInput) targetTopGradeInput.addEventListener("input", renderGrading);
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
    studentSearchInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const query = String(studentSearchInput.value || "").trim().toLowerCase();
      const filtered = filterStudents(query);
      if (filtered.length === 1) {
        event.preventDefault();
        loadStudentForEdit(filtered[0].index);
      }
    });
  }
  if (answersGrid) {
    answersGrid.addEventListener("click", (event) => {
      const row = event.target.closest(".answer-row");
      if (!row) return;
      const idx = Number(row.dataset.question);
      if (Number.isFinite(idx)) {
        activeQuestionIndex = idx;
        updateAnswerRowFocus();
      }
    });
  }
  document.addEventListener("keydown", handleAnswerShortcut);
  document.addEventListener("keydown", (event) => {
    if (!studentSearchInput) return;
    if (event.ctrlKey && event.key.toLowerCase() === "f") {
      event.preventDefault();
      studentSearchInput.focus();
      studentSearchInput.select();
    }
  });
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
        const response = await fetch(`api/exams/${currentExamId}/sessions`, {
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
  if (exportResultsXlsBtn) {
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
      const response = await fetch("api/results-xls", {
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
  }

  initApp();
}
