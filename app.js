const STORAGE_KEY = "c3lab-exam-registry";
const ANSWER_OPTIONS = ["A", "B", "C", "D"];

const templateStatus = document.getElementById("templateStatus");
const answersGrid = document.getElementById("answersGrid");
const mappingStatus = document.getElementById("mappingStatus");
const examSelect = document.getElementById("examSelect");
const loadExamMappingBtn = document.getElementById("loadExamMapping");
const examInfo = document.getElementById("examInfo");
const esse3FileInput = document.getElementById("esse3File");
const importEsse3Btn = document.getElementById("importEsse3");
const esse3Status = document.getElementById("esse3Status");

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
const gradingStatus = document.getElementById("gradingStatus");
const gradingStats = document.getElementById("gradingStats");
const exportGradedBtn = document.getElementById("exportGradedCsv");
const gradingTable = document.getElementById("gradingTable");
const gradeHistogram = document.getElementById("gradeHistogram");
const exportResultsPdfBtn = document.getElementById("exportResultsPdf");
const exportResultsXlsBtn = document.getElementById("exportResultsXls");
const resultDateInput = document.getElementById("resultDate");
const esse3ResultsFileInput = document.getElementById("esse3ResultsFile");
const currentTopGradeInput = document.getElementById("currentTopGrade");
const targetTopGradeInput = document.getElementById("targetTopGrade");
const gradingFactor = document.getElementById("gradingFactor");

let questionCount = 0;
let students = [];
let mapping = null;
let editingIndex = null;
let esse3Base64 = "";
let examsCache = [];

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
    label.className = "answer-label";
    label.textContent = `Es. ${i}`;

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
  studentForm.reset();
  clearSelections();
  editingIndex = null;
  if (submitBtn) submitBtn.textContent = "Aggiungi studente";
};

const renderTable = () => {
  studentsTable.innerHTML = "";
  if (students.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "Nessun risultato inserito.";
    row.appendChild(cell);
    studentsTable.appendChild(row);
    return;
  }
  students.forEach((student, index) => {
    const score = mapping ? gradeStudent(student) : null;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${student.matricola}</td>
      <td>${student.nome}</td>
      <td>${student.cognome}</td>
      <td>${student.versione}</td>
      <td>${student.answers.join(" | ")}</td>
      <td>${score === null ? "-" : score}</td>
      <td class="row-actions">
        <button class="btn btn-sm btn-outline-secondary mini load" data-index="${index}">Carica</button>
        <button class="btn btn-sm btn-outline-danger mini remove" data-index="${index}">Rimuovi</button>
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
};

const renderGrading = () => {
  if (!mapping) {
    gradingStatus.textContent = "Carica un mapping per abilitare il grading automatico.";
    gradingStats.innerHTML = "";
    gradingTable.innerHTML = "";
    gradeHistogram.innerHTML = "";
    gradingFactor.textContent = "Fattore: -";
    currentTopGradeInput.value = "";
    currentTopGradeInput.disabled = true;
    targetTopGradeInput.disabled = true;
    exportGradedBtn.disabled = true;
    exportResultsPdfBtn.disabled = true;
    exportResultsXlsBtn.disabled = true;
    return;
  }
  gradingStatus.textContent = "Grading attivo. I punteggi sono calcolati automaticamente.";
  exportGradedBtn.disabled = false;
  exportResultsPdfBtn.disabled = false;
  exportResultsXlsBtn.disabled = false;
  currentTopGradeInput.disabled = false;
  targetTopGradeInput.disabled = false;
  const maxPoints = getMaxPoints();
  const scores = students.map((student) => gradeStudent(student)).filter((val) => val !== null);
  if (scores.length === 0) {
    gradingStats.innerHTML = "";
    gradingTable.innerHTML = "";
    gradeHistogram.innerHTML = "";
    exportGradedBtn.disabled = true;
    exportResultsPdfBtn.disabled = true;
    exportResultsXlsBtn.disabled = true;
    return;
  }
  const total = scores.reduce((sum, val) => sum + val, 0);
  const avg = total / scores.length;
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const grades = scores.map((points) => toThirty(points, maxPoints));
  const avgGrade = grades.reduce((sum, val) => sum + val, 0) / grades.length;
  const bestGrade = Math.max(...grades);
  if (currentTopGradeInput.value === "") {
    currentTopGradeInput.value = bestGrade.toFixed(1);
  }
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
      <td>${student.nome}</td>
      <td>${student.cognome}</td>
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

const loadMappingFromExam = async () => {
  const selectedId = Number(examSelect?.value || "");
  if (!Number.isFinite(selectedId)) {
    mappingStatus.textContent = "Seleziona una traccia.";
    return;
  }
  mappingStatus.textContent = "Caricamento mapping in corso...";
  try {
    const response = await fetch(`/api/exams/${selectedId}/mapping`);
    if (!response.ok) {
      const info = await response.json().catch(() => ({}));
      mappingStatus.textContent = info.error || "Errore nel mapping.";
      return;
    }
    const payload = await response.json();
    mapping = payload.mapping;
    questionCount = mapping.Nquestions;
    templateStatus.textContent = `Template attivo: ${mapping.Nquestions} domande.`;
    mappingStatus.textContent = `Mapping caricato: ${mapping.Nquestions} domande, ${mapping.Nversions} versioni.`;
    renderTable();
    renderGrading();
    renderAnswerGrid();
    applyCorrectHints();
    updatePerQuestionScores();
    updateExamInfo(selectedId);
  } catch {
    mappingStatus.textContent = "Errore nel mapping.";
  }
};

const renderExamOptions = (exams) => {
  if (!examSelect) return;
  examSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Seleziona traccia";
  examSelect.appendChild(placeholder);
  exams.forEach((exam) => {
    if (exam.is_draft) return;
    const opt = document.createElement("option");
    opt.value = String(exam.id);
    const dateText = exam.date ? ` • ${exam.date}` : "";
    opt.textContent = `${exam.title} • ${exam.course_name}${dateText}`;
    examSelect.appendChild(opt);
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
    renderExamOptions(examsCache);
  } catch {
    mappingStatus.textContent = "Errore caricamento tracce.";
  }
};

const importEsse3 = async () => {
  const file = esse3FileInput.files && esse3FileInput.files[0];
  if (!file) return;
  esse3Status.textContent = "Import in corso...";
  const buffer = await file.arrayBuffer();
  esse3Base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const response = await fetch("/api/import-esse3", {
    method: "POST",
    headers: { "Content-Type": "application/vnd.ms-excel" },
    body: buffer,
  });
  if (!response.ok) {
    const info = await response.json().catch(() => ({}));
    esse3Status.textContent = info.error || "Errore import.";
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
  skipped = (payload.students || []).length - added;
  esse3Status.textContent = `Import completato: ${added} aggiunti, ${skipped} duplicati ignorati.`;
};

const normalizeSet = (arr) => Array.from(new Set(arr)).sort().join(",");

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

const getNormalizationFactor = () => {
  const current = Number(currentTopGradeInput.value);
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
  if (!confirm("Vuoi davvero svuotare tutto il registro?")) return;
  students = [];
  persistStudents();
  renderTable();
  renderGrading();
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
clearBtn.addEventListener("click", clearAll);
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
if (loadExamMappingBtn) loadExamMappingBtn.addEventListener("click", loadMappingFromExam);
if (examSelect) {
  examSelect.addEventListener("change", () => {
    const selectedId = Number(examSelect.value || "");
    updateExamInfo(selectedId);
  });
}
versioneInput.addEventListener("input", () => {
  applyCorrectHints();
  updatePerQuestionScores();
});
currentTopGradeInput.addEventListener("input", renderGrading);
targetTopGradeInput.addEventListener("input", renderGrading);
importEsse3Btn.addEventListener("click", importEsse3);
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
