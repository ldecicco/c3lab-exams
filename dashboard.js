const analysisExamList = document.getElementById("analysisExamList");
const analysisStatus = document.getElementById("analysisStatus");
const analysisSessionSection = document.getElementById("analysisSessionSection");
const analysisSessionSelect = document.getElementById("analysisSessionSelect");
const analysisSummary = document.getElementById("analysisSummary");
const analysisKpis = document.getElementById("analysisKpis");
const analysisQuestionsSection = document.getElementById("analysisQuestionsSection");
const analysisQuestions = document.getElementById("analysisQuestions");
const analysisTopicsSection = document.getElementById("analysisTopicsSection");
const analysisTopics = document.getElementById("analysisTopics");
const analysisCdfOpen = document.getElementById("analysisCdfOpen");
const analysisCdfBackdrop = document.getElementById("analysisCdfBackdrop");
const analysisCdfModal = document.getElementById("analysisCdfModal");
const analysisCdfClose = document.getElementById("analysisCdfClose");
const analysisCdfScope = document.getElementById("analysisCdfScope");
const analysisCdfCount = document.getElementById("analysisCdfCount");
const analysisCdfMedian = document.getElementById("analysisCdfMedian");
const analysisCdfStd = document.getElementById("analysisCdfStd");
const analysisCdfChart = document.getElementById("analysisCdfChart");
const analysisSessionEmpty = document.getElementById("analysisSessionEmpty");
const analysisCheatingSection = document.getElementById("analysisCheatingSection");
const analysisCheating = document.getElementById("analysisCheating");
const analysisCheatingStatus = document.getElementById("analysisCheatingStatus");
const analysisCheatingRun = document.getElementById("analysisCheatingRun");
const analysisToast = document.getElementById("analysisToast");
const analysisEmptyState = document.getElementById("analysisEmptyState");
const analysisExamSection = document.getElementById("analysisExamSection");
const analysisSelectExam = document.getElementById("analysisSelectExam");
const analysisExamBackdrop = document.getElementById("analysisExamBackdrop");
const analysisExamModal = document.getElementById("analysisExamModal");
const analysisExamClose = document.getElementById("analysisExamClose");
const analysisTopbarSelectExam = document.getElementById("analysisTopbarSelectExam");
const analysisTopbarStatus = document.getElementById("analysisTopbarStatus");
const courseEmptyState = document.getElementById("courseEmptyState");
const mainLayout = document.getElementById("mainLayout");

let examsCache = [];
let examStatsCache = {};
let currentExamId = null;
let currentSessionId = null;
let mapping = null;
let examQuestions = [];
let students = [];
let activeCourseId = null;
let currentSessionTargetTopGrade = null;
let cdfChart = null;
let cdfScope = "current";
let allCourseGrades = [];

const ANSWER_OPTIONS = ["A", "B", "C", "D"];

const showToast =
  typeof window.showToast === "function" ? window.showToast : () => {};
const bindModal = typeof window.bindModal === "function" ? window.bindModal : null;

const analysisExamModalApi = bindModal
  ? bindModal({
      modal: analysisExamModal,
      backdrop: analysisExamBackdrop,
      closers: [analysisExamClose],
    })
  : null;

const analysisCdfModalApi = bindModal
  ? bindModal({
      modal: analysisCdfModal,
      backdrop: analysisCdfBackdrop,
      closers: [analysisCdfClose],
    })
  : null;

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
  if (!rendered) target.textContent = trimmed;
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

const normalizeSet = (arr) => Array.from(new Set(arr)).sort().join(",");

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

const gradeStudentLocal = (student) => {
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
};

const computeMedian = (values) => {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const computeStd = (values) => {
  if (!values.length) return null;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const computeCdfPoints = (values) => {
  if (!values.length) return { x: [], y: [] };
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const x = [];
  const y = [];
  sorted.forEach((val, idx) => {
    x.push(val);
    y.push((idx + 1) / n);
  });
  return { x, y };
};

const updateCdfStats = (grades) => {
  if (analysisCdfCount) analysisCdfCount.textContent = grades.length || "-";
  const median = computeMedian(grades);
  const std = computeStd(grades);
  if (analysisCdfMedian) {
    analysisCdfMedian.textContent =
      median === null ? "-" : median.toFixed(1);
  }
  if (analysisCdfStd) {
    analysisCdfStd.textContent = std === null ? "-" : std.toFixed(2);
  }
};

const renderCdfChart = (grades) => {
  if (!analysisCdfChart) return;
  if (!window.Chart) {
    analysisCdfChart.replaceWith("Chart.js non disponibile.");
    return;
  }
  const { x, y } = computeCdfPoints(grades);
  const data = x.map((val, idx) => ({ x: val, y: y[idx] }));
  if (cdfChart) {
    cdfChart.data.datasets[0].data = data;
    cdfChart.update();
    return;
  }
  cdfChart = new Chart(analysisCdfChart, {
    type: "line",
    data: {
      datasets: [
        {
          label: "CDF",
          data,
          borderColor: "#2f5fa7",
          backgroundColor: "rgba(47, 95, 167, 0.15)",
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 4,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      scales: {
        x: {
          type: "linear",
          title: { display: true, text: "Voto (30)" },
          min: 0,
          max: 31,
        },
        y: {
          title: { display: true, text: "CDF" },
          min: 0,
          max: 1,
          ticks: {
            callback: (value) => `${Math.round(value * 100)}%`,
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `Voto: ${ctx.parsed.x.toFixed(1)} • CDF: ${(ctx.parsed.y * 100).toFixed(0)}%`,
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "x",
          },
        },
      },
    },
  });
};

const computeCurrentGrades = () => {
  if (!students.length) return [];
  const normalized = students
    .map((student) => Number(student.normalizedScore))
    .filter((val) => Number.isFinite(val));
  if (normalized.length === students.length) return normalized;
  const maxPoints = getMaxPoints();
  if (!maxPoints) return normalized;
  const rawGrades = students
    .map((student) => {
      const score = gradeStudentLocal(student);
      return score === null ? null : (score / maxPoints) * 30;
    })
    .filter((val) => val !== null);
  const top = rawGrades.length ? Math.max(...rawGrades) : null;
  const target = Number(currentSessionTargetTopGrade);
  const targetTop = Number.isFinite(target) ? target : 30;
  const factor = top && top > 0 ? targetTop / top : null;
  return rawGrades.map((grade) =>
    Math.round(factor ? grade * factor : grade)
  );
};

const loadAllCourseGrades = async () => {
  if (!activeCourseId) return [];
  try {
    const response = await fetch(`api/courses/${activeCourseId}/grades?scope=all`);
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload.grades) ? payload.grades : [];
  } catch {
    return [];
  }
};

const renderCdfForScope = async (scope) => {
  if (!analysisCdfModal) return;
  let grades = [];
  if (scope === "all") {
    if (!allCourseGrades.length) {
      allCourseGrades = await loadAllCourseGrades();
    }
    grades = allCourseGrades.slice();
  } else {
    grades = computeCurrentGrades();
  }
  updateCdfStats(grades);
  renderCdfChart(grades);
};

const getSelectedOriginalAnswers = (student, questionIndex) => {
  if (!mapping) return [];
  const version = Number(student.versione);
  if (!Number.isFinite(version) || version < 1 || version > mapping.Nversions) {
    return [];
  }
  const qdict = mapping.questiondictionary[version - 1];
  const adict = mapping.randomizedanswersdictionary[version - 1];
  const displayedIndex = qdict[questionIndex] - 1;
  const selected = (student.answers[displayedIndex] || "").split("");
  const selectedIdx = selected
    .map((letter) => ANSWER_OPTIONS.indexOf(letter) + 1)
    .filter((idx) => idx > 0);
  return selectedIdx.map((idx) => adict[questionIndex][idx - 1]);
};

const getCorrectForQuestion = (student, questionIndex) => {
  if (!mapping) return null;
  const version = Number(student.versione);
  if (!Number.isFinite(version) || version < 1 || version > mapping.Nversions) {
    return null;
  }
  const qdict = mapping.questiondictionary[version - 1];
  const adict = mapping.randomizedanswersdictionary[version - 1];
  const cdict = mapping.correctiondictionary;
  const override = student.overrides ? student.overrides[questionIndex] : null;
  if (typeof override === "number" && Number.isFinite(override)) {
    const maxPoints = getQuestionPoints(cdict[questionIndex]);
    return override >= maxPoints;
  }
  const displayedIndex = qdict[questionIndex] - 1;
  const selected = (student.answers[displayedIndex] || "").split("");
  const selectedIdx = selected
    .map((letter) => ANSWER_OPTIONS.indexOf(letter) + 1)
    .filter((idx) => idx > 0);
  const originalSelected = selectedIdx.map((idx) => adict[questionIndex][idx - 1]);
  const correctIdx = cdict[questionIndex]
    .map((val, i) => (val > 0 ? i + 1 : null))
    .filter(Boolean);
  return normalizeSet(originalSelected) === normalizeSet(correctIdx);
};

const setSectionVisible = (section, visible) => {
  if (!section) return;
  section.classList.toggle("is-hidden", !visible);
};

const updateDashboardVisibility = (hasExam) => {
  if (analysisEmptyState) analysisEmptyState.classList.toggle("is-hidden", hasExam);
  setSectionVisible(analysisExamSection, false);
  setSectionVisible(analysisSessionSection, hasExam);
  if (!hasExam) {
    setSectionVisible(analysisSummary, false);
    setSectionVisible(analysisQuestionsSection, false);
    setSectionVisible(analysisTopicsSection, false);
    setSectionVisible(analysisCheatingSection, false);
  }
};

const updateTopbarStatus = (text, isActive = false) => {
  if (!analysisTopbarStatus) return;
  analysisTopbarStatus.textContent = text;
  analysisTopbarStatus.classList.toggle("is-active", isActive);
};

const openExamModal = () => {
  if (analysisExamModalApi) {
    analysisExamModalApi.open();
    return;
  }
  if (typeof window.openModal === "function") {
    window.openModal(analysisExamModal, analysisExamBackdrop);
    return;
  }
  if (analysisExamBackdrop) analysisExamBackdrop.classList.remove("is-hidden");
  if (analysisExamModal) analysisExamModal.classList.remove("is-hidden");
};

const closeExamModal = () => {
  if (analysisExamModalApi) {
    analysisExamModalApi.close();
    return;
  }
  if (typeof window.closeModal === "function") {
    window.closeModal(analysisExamModal, analysisExamBackdrop);
    return;
  }
  if (analysisExamBackdrop) analysisExamBackdrop.classList.add("is-hidden");
  if (analysisExamModal) analysisExamModal.classList.add("is-hidden");
};

if (analysisCheatingRun) {
  analysisCheatingRun.addEventListener("click", () => {
    loadCheating();
  });
}

const renderExamList = (exams) => {
  if (!analysisExamList || !window.ExamCards) return;
  ExamCards.render(analysisExamList, exams, {
    emptyText: "Nessuna traccia chiusa disponibile.",
    filter: (exam) => !exam.is_draft,
    stats: examStatsCache,
    actions: (exam) => [
      {
        label: "Seleziona",
        className: "btn btn-outline-primary btn-sm",
        onClick: () => {
          loadExam(exam.id);
          closeExamModal();
        },
      },
    ],
  });
};

const renderSessions = (sessions) => {
  if (!analysisSessionSelect) return;
  analysisSessionSelect.innerHTML = "";
  if (!sessions.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Nessuna sessione";
    analysisSessionSelect.appendChild(opt);
    analysisSessionSelect.disabled = true;
    return;
  }
  sessions.forEach((session) => {
    const opt = document.createElement("option");
    opt.value = String(session.id);
    const dateLabel = session.result_date ? ` · ${session.result_date}` : "";
    const title = session.title ? session.title : `Sessione ${session.id}`;
    opt.textContent = `${title}${dateLabel}`;
    if (session.id === currentSessionId) opt.selected = true;
    analysisSessionSelect.appendChild(opt);
  });
  analysisSessionSelect.disabled = false;
};

const renderSummary = (stats) => {
  if (!analysisKpis) return;
  analysisKpis.innerHTML = "";
  const cards = [
    { label: "Studenti", value: stats.studentCount },
    { label: "Domande", value: stats.questionCount },
    { label: "Risposte totali", value: stats.totalAnswers },
    { label: "Media corrette", value: `${stats.correctRate.toFixed(1)}%` },
  ];
  cards.forEach((card) => {
    const item = document.createElement("div");
    item.className = "stat-card";
    item.innerHTML = `<span>${card.label}</span><strong>${card.value}</strong>`;
    analysisKpis.appendChild(item);
  });
};

const renderQuestionTable = (questionStats, answerStats) => {
  if (!analysisQuestions) return;
  analysisQuestions.innerHTML = "";
  if (!questionStats.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "Nessun dato disponibile.";
    row.appendChild(cell);
    analysisQuestions.appendChild(row);
    return;
  }
  questionStats.forEach((stat) => {
    const row = document.createElement("tr");
    const qCell = document.createElement("td");
    qCell.textContent = `Es. ${stat.index + 1}`;
    const textCell = document.createElement("td");
    const details = document.createElement("details");
    details.className = "answer-breakdown";
    const summary = document.createElement("summary");
    const summaryText = document.createElement("div");
    summaryText.className = "analysis-question";
    renderLatexHtml(stat.text, summaryText);
    summary.appendChild(summaryText);
    const answersWrap = document.createElement("div");
    answersWrap.className = "answer-breakdown-body";
    const list = document.createElement("div");
    list.className = "answer-breakdown-list";
    const answerInfo = answerStats[stat.index] || { total: 0, counts: [] };
    const total = answerInfo.total || 0;
    (stat.answers || []).forEach((answer, idx) => {
      const rowItem = document.createElement("div");
      rowItem.className = "answer-breakdown-item";
      const text = document.createElement("div");
      text.className = "answer-breakdown-text";
      renderLatexHtml(answer.text || "", text);
      const percent = document.createElement("span");
      percent.className = "answer-breakdown-percent";
      const count = answerInfo.counts[idx] || 0;
      const pct = total ? (count / total) * 100 : 0;
      percent.textContent = `${pct.toFixed(1)}%`;
      rowItem.appendChild(text);
      rowItem.appendChild(percent);
      if (answer.isCorrect) {
        const tick = document.createElement("span");
        tick.className = "answer-tick";
        tick.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.4-1.4z"/></svg>';
        rowItem.appendChild(tick);
      }
      list.appendChild(rowItem);
    });
    answersWrap.appendChild(list);
    details.appendChild(summary);
    details.appendChild(answersWrap);
    textCell.appendChild(details);
    const topicCell = document.createElement("td");
    topicCell.textContent = stat.topics.length ? stat.topics.join(", ") : "-";
    const rateCell = document.createElement("td");
    rateCell.textContent = `${stat.rate.toFixed(1)}%`;
    const statusCell = document.createElement("td");
    statusCell.innerHTML = `<span class="pill ${stat.statusClass}">${stat.status}</span>`;
    row.appendChild(qCell);
    row.appendChild(textCell);
    row.appendChild(topicCell);
    row.appendChild(rateCell);
    row.appendChild(statusCell);
    analysisQuestions.appendChild(row);
  });
};

const renderTopicsTable = (topicStats) => {
  if (!analysisTopics) return;
  analysisTopics.innerHTML = "";
  if (!topicStats.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "Nessun argomento disponibile.";
    row.appendChild(cell);
    analysisTopics.appendChild(row);
    return;
  }
  topicStats.forEach((topic) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${topic.name}</td>
      <td>${topic.rate.toFixed(1)}%</td>
      <td>${topic.questionCount}</td>
    `;
    analysisTopics.appendChild(row);
  });
};

const renderCheatingTable = (payload) => {
  if (!analysisCheating) return;
  analysisCheating.innerHTML = "";
  const pairs = payload?.pairs || [];
  if (!pairs.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "Nessuna coppia sospetta.";
    row.appendChild(cell);
    analysisCheating.appendChild(row);
  } else {
    pairs.forEach((pair) => {
      const row = document.createElement("tr");
      const a = pair.studentA;
      const b = pair.studentB;
      const studentA = `${a.cognome} ${a.nome} (${a.matricola})`.trim();
      const studentB = `${b.cognome} ${b.nome} (${b.matricola})`.trim();
      row.innerHTML = `
        <td>${studentA}</td>
        <td>${studentB}</td>
        <td>${pair.score}</td>
        <td>${pair.matchCount}</td>
        <td>${pair.matchQuestions.join(", ")}</td>
      `;
      analysisCheating.appendChild(row);
    });
  }
  if (analysisCheatingStatus) {
    const threshold = payload?.threshold;
    const perms = payload?.permutations || 0;
    const sample = payload?.pairSample || 0;
    const totalPairs = payload?.totalPairs || 0;
    if (threshold === null || threshold === undefined) {
      analysisCheatingStatus.textContent = "Nessuna soglia disponibile.";
    } else {
      analysisCheatingStatus.textContent =
        `Soglia S2 (99%): ${threshold.toFixed(3)} · ` +
        `${perms} permutazioni · ${sample}/${totalPairs} coppie`;
    }
  }
  setSectionVisible(analysisCheatingSection, true);
};

const computeAnalytics = () => {
  if (!mapping || !examQuestions.length) return;
  if (!students.length) {
    setSectionVisible(analysisSummary, false);
    if (cdfScope === "all") {
      renderCdfForScope("all");
    }
    setSectionVisible(analysisQuestionsSection, false);
    setSectionVisible(analysisTopicsSection, false);
    setSectionVisible(analysisCheatingSection, false);
    setSectionVisible(analysisSessionEmpty, true);
    return;
  }
  setSectionVisible(analysisSessionEmpty, false);
  const questionCount =
    Math.min(mapping.Nquestions || examQuestions.length, examQuestions.length) ||
    mapping.Nquestions ||
    examQuestions.length;
  const questionStats = Array.from({ length: questionCount }, (_, idx) => ({
    index: idx,
    total: 0,
    correct: 0,
  }));

  const answerStats = Array.from({ length: questionCount }, (_, idx) => {
    const answerCount = examQuestions[idx]?.answers?.length || 0;
    return { total: 0, counts: Array.from({ length: answerCount }, () => 0) };
  });

  students.forEach((student) => {
    for (let q = 0; q < questionCount; q += 1) {
      const isCorrect = getCorrectForQuestion(student, q);
      if (isCorrect === null) continue;
      questionStats[q].total += 1;
      if (isCorrect) questionStats[q].correct += 1;
      const selected = getSelectedOriginalAnswers(student, q);
      answerStats[q].total += 1;
      selected.forEach((answerIdx) => {
        const pos = answerIdx - 1;
        if (pos >= 0 && pos < answerStats[q].counts.length) {
          answerStats[q].counts[pos] += 1;
        }
      });
    }
  });

  const totalAnswers = questionStats.reduce((sum, q) => sum + q.total, 0);
  const totalCorrect = questionStats.reduce((sum, q) => sum + q.correct, 0);
  const studentCount = students.length;

  const enhanced = questionStats.map((stat) => {
    const question = examQuestions[stat.index] || {};
    const rate = stat.total ? (stat.correct / stat.total) * 100 : 0;
    let status = "Normale";
    let statusClass = "pill-neutral";
    if (rate >= 85) {
      status = "Troppo facile";
      statusClass = "pill-easy";
    } else if (rate <= 30) {
      status = "Troppo difficile";
      statusClass = "pill-hard";
    }
    return {
      ...stat,
      text: question.text || "",
      answers: question.answers || [],
      topics: question.topics || [],
      rate,
      status,
      statusClass,
    };
  });

  const topicsMap = new Map();
  enhanced.forEach((stat) => {
    const topics = stat.topics.length ? stat.topics : ["Senza argomento"];
    topics.forEach((topic) => {
      const item = topicsMap.get(topic) || { name: topic, total: 0, correct: 0, questionCount: 0 };
      item.total += stat.total;
      item.correct += stat.correct;
      item.questionCount += 1;
      topicsMap.set(topic, item);
    });
  });

  const topicStats = Array.from(topicsMap.values())
    .map((topic) => ({
      name: topic.name,
      rate: topic.total ? (topic.correct / topic.total) * 100 : 0,
      questionCount: topic.questionCount,
    }))
    .sort((a, b) => b.rate - a.rate);

  renderSummary({
    studentCount,
    questionCount,
    totalAnswers,
    correctRate: totalAnswers ? (totalCorrect / totalAnswers) * 100 : 0,
  });
  renderCdfForScope("current");
  renderQuestionTable(enhanced, answerStats);
  renderTopicsTable(topicStats);
  setSectionVisible(analysisSummary, true);
  setSectionVisible(analysisQuestionsSection, true);
  setSectionVisible(analysisTopicsSection, true);
};

const loadCheating = async () => {
  if (!currentExamId || !currentSessionId) return;
  if (analysisCheatingStatus) analysisCheatingStatus.textContent = "Calcolo in corso...";
  try {
    const params = new URLSearchParams({
      sessionId: String(currentSessionId),
    });
    const response = await fetch(`api/exams/${currentExamId}/cheating?${params.toString()}`);
    if (!response.ok) {
      renderCheatingTable({ pairs: [] });
      if (analysisCheatingStatus) analysisCheatingStatus.textContent = "Nessun dato.";
      return;
    }
    const payload = await response.json();
    renderCheatingTable(payload);
  } catch {
    renderCheatingTable({ pairs: [] });
    if (analysisCheatingStatus) analysisCheatingStatus.textContent = "Errore nel calcolo.";
  }
};

const loadSession = async (sessionId) => {
  if (!sessionId) return;
  try {
    const response = await fetch(`api/sessions/${sessionId}`);
    if (!response.ok) {
      showToast("Errore nel caricamento sessione.", "error");
      return;
    }
    const payload = await response.json();
    currentSessionId = payload.session.id;
    currentSessionTargetTopGrade = payload.session.target_top_grade;
    students = payload.students || [];
    computeAnalytics();
    if (analysisCheatingStatus) analysisCheatingStatus.textContent = "Pronto al calcolo.";
    renderCheatingTable({ pairs: [] });
    if (!students.length) {
      if (analysisCheatingStatus) analysisCheatingStatus.textContent = "Nessuno studente valutato.";
      setSectionVisible(analysisSummary, false);
      if (cdfScope === "all") {
        renderCdfForScope("all");
      }
      setSectionVisible(analysisQuestionsSection, false);
      setSectionVisible(analysisTopicsSection, false);
      setSectionVisible(analysisCheatingSection, false);
      setSectionVisible(analysisSessionEmpty, true);
    }
  } catch {
    showToast("Errore nel caricamento sessione.", "error");
  }
};

const loadSessions = async (examId) => {
  try {
    const response = await fetch(`api/exams/${examId}/sessions`);
    if (!response.ok) {
      renderSessions([]);
      return;
    }
    const payload = await response.json();
    const sessions = payload.sessions || [];
    currentSessionId = sessions.length ? sessions[0].id : null;
    renderSessions(sessions);
    setSectionVisible(analysisSessionSection, Boolean(sessions.length));
    if (currentSessionId) {
      await loadSession(currentSessionId);
    }
  } catch {
    renderSessions([]);
  }
};

const loadExam = async (examId) => {
  if (!examId) return;
  currentExamId = examId;
  analysisStatus.textContent = "Caricamento traccia...";
  try {
    const [examRes, mapRes] = await Promise.all([
      fetch(`api/exams/${examId}`),
      fetch(`api/exams/${examId}/mapping`),
    ]);
    if (!examRes.ok || !mapRes.ok) {
      analysisStatus.textContent = "Errore nel caricamento traccia.";
      updateTopbarStatus("Nessuna traccia", false);
      return;
    }
    const examPayload = await examRes.json();
    const mapPayload = await mapRes.json();
    examQuestions = examPayload.questions || [];
    mapping = mapPayload.mapping;
    analysisStatus.textContent = "Traccia selezionata";
    const dateText = examPayload.exam?.date ? ` • ${examPayload.exam.date}` : "";
    const titleText = examPayload.exam?.title || "Traccia selezionata";
    const courseName =
      examsCache.find((exam) => exam.id === examId)?.course_name || "";
    const courseText = courseName ? `${courseName} — ` : "";
  updateTopbarStatus(`${courseText}${titleText}${dateText}`, true);
  updateDashboardVisibility(true);
  await loadSessions(examId);
  setActiveExam(examId);
  allCourseGrades = [];
  if (cdfScope === "all") {
    renderCdfForScope("all");
  }
  } catch {
    analysisStatus.textContent = "Errore nel caricamento traccia.";
    updateTopbarStatus("Nessuna traccia", false);
    updateDashboardVisibility(false);
  }
};

const loadExams = async () => {
  try {
    const response = await fetch("api/exams");
    if (!response.ok) {
      analysisExamList.textContent = "Errore nel caricamento tracce.";
      return;
    }
    const payload = await response.json();
    examsCache = payload.exams || [];
    if (Number.isFinite(activeCourseId)) {
      examsCache = examsCache.filter((exam) => exam.course_id === activeCourseId);
    }
    examStatsCache = await loadExamStats();
    renderExamList(examsCache);
    updateDashboardVisibility(false);
    updateTopbarStatus("Nessuna traccia", false);
  } catch {
    analysisExamList.textContent = "Errore nel caricamento tracce.";
    updateTopbarStatus("Nessuna traccia", false);
    updateDashboardVisibility(false);
  }
};

const initDashboard = async () => {
  const activeCourse = await fetchActiveCourse();
  if (!activeCourse) {
    if (courseEmptyState) courseEmptyState.classList.remove("is-hidden");
    if (mainLayout) mainLayout.classList.add("is-hidden");
    return;
  }
  activeCourseId = activeCourse.id;
  if (courseEmptyState) courseEmptyState.classList.add("is-hidden");
  if (mainLayout) mainLayout.classList.remove("is-hidden");
  const activeExam = await fetchActiveExam();
  await loadExams();
  if (activeExam?.id) {
    loadExam(activeExam.id);
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

if (analysisSessionSelect) {
  analysisSessionSelect.addEventListener("change", () => {
    const nextId = Number(analysisSessionSelect.value);
    if (!Number.isFinite(nextId)) return;
    loadSession(nextId);
  });
}

initDashboard();

if (analysisSelectExam) {
  analysisSelectExam.addEventListener("click", () => {
    openExamModal();
  });
}
if (analysisTopbarSelectExam) {
  analysisTopbarSelectExam.addEventListener("click", () => {
    openExamModal();
  });
}
if (analysisCdfOpen) {
  analysisCdfOpen.addEventListener("click", async () => {
    await renderCdfForScope(cdfScope);
    if (analysisCdfModalApi) {
      analysisCdfModalApi.open();
    } else if (typeof window.openModal === "function") {
      window.openModal(analysisCdfModal, analysisCdfBackdrop);
    } else {
      if (analysisCdfBackdrop) analysisCdfBackdrop.classList.remove("is-hidden");
      if (analysisCdfModal) analysisCdfModal.classList.remove("is-hidden");
    }
  });
}
if (analysisCdfScope) {
  analysisCdfScope.addEventListener("change", async (event) => {
    cdfScope = event.target.value || "current";
    await renderCdfForScope(cdfScope);
  });
}
if (!analysisExamModalApi) {
  if (analysisExamClose) {
    analysisExamClose.addEventListener("click", closeExamModal);
  }
  if (analysisExamBackdrop) {
    analysisExamBackdrop.addEventListener("click", closeExamModal);
  }
}
