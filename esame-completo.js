const multiModuleSelectBtn = document.getElementById("multiModuleSelectBtn");
const multiModuleSelectBtnEmpty = document.getElementById("multiModuleSelectBtnEmpty");
const multiModuleExportCsv = document.getElementById("multiModuleExportCsv");
const multiModuleStatus = document.getElementById("multiModuleStatus");
const multiModuleEmptyState = document.getElementById("multiModuleEmptyState");
const multiModuleSummary = document.getElementById("multiModuleSummary");
const multiModuleTitle = document.getElementById("multiModuleTitle");
const multiModuleMeta = document.getElementById("multiModuleMeta");
const multiModuleRuleBadges = document.getElementById("multiModuleRuleBadges");
const multiModuleResultsSection = document.getElementById("multiModuleResultsSection");
const multiModuleResultsBody = document.getElementById("multiModuleResultsBody");
const multiModuleCount = document.getElementById("multiModuleCount");
const module1Header = document.getElementById("module1Header");
const module2Header = document.getElementById("module2Header");
const multiModuleModalBackdrop = document.getElementById("multiModuleModalBackdrop");
const multiModuleModal = document.getElementById("multiModuleModal");
const multiModuleModalClose = document.getElementById("multiModuleModalClose");
const multiModuleList = document.getElementById("multiModuleList");
const courseEmptyState = document.getElementById("courseEmptyState");
const mainLayout = document.getElementById("mainLayout");
const filterButtons = Array.from(document.querySelectorAll(".chip-action"));
const multiModuleOverrideBackdrop = document.getElementById("multiModuleOverrideBackdrop");
const multiModuleOverrideModal = document.getElementById("multiModuleOverrideModal");
const multiModuleOverrideClose = document.getElementById("multiModuleOverrideClose");
const overrideModule1Label = document.getElementById("overrideModule1Label");
const overrideModule2Label = document.getElementById("overrideModule2Label");
const overrideModule1Select = document.getElementById("overrideModule1Select");
const overrideModule2Select = document.getElementById("overrideModule2Select");
const multiModuleOverrideSave = document.getElementById("multiModuleOverrideSave");
const multiModuleOverrideClear = document.getElementById("multiModuleOverrideClear");
const multiModuleOverrideStatus = document.getElementById("multiModuleOverrideStatus");

let activeCourseId = null;
let selectedMultiModule = null;
let selectedResults = [];
let activeFilter = "all";
let activeOverrideStudent = null;

const notify = (message, tone = "info") => {
  if (typeof window.showToast === "function") {
    window.showToast(message, tone);
  } else if (multiModuleOverrideStatus) {
    multiModuleOverrideStatus.textContent = message;
  }
};

const apiFetch = async (url, options = {}) => {
  const headers = options.headers || {};
  headers.Accept = "application/json";
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Errore ${response.status}`);
  }
  return response.json();
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

const openModal = () => {
  if (multiModuleModal) multiModuleModal.classList.remove("is-hidden");
  if (multiModuleModalBackdrop) multiModuleModalBackdrop.classList.remove("is-hidden");
};

const closeModal = () => {
  if (multiModuleModal) multiModuleModal.classList.add("is-hidden");
  if (multiModuleModalBackdrop) multiModuleModalBackdrop.classList.add("is-hidden");
};

const updateVisibility = () => {
  const hasSelection = Boolean(selectedMultiModule);
  if (multiModuleEmptyState) multiModuleEmptyState.classList.toggle("is-hidden", hasSelection);
  if (multiModuleSummary) multiModuleSummary.classList.toggle("is-hidden", !hasSelection);
  if (multiModuleResultsSection) multiModuleResultsSection.classList.toggle("is-hidden", !hasSelection);
  if (multiModuleExportCsv) multiModuleExportCsv.disabled = !hasSelection;
  if (multiModuleStatus) {
    multiModuleStatus.textContent = hasSelection ? selectedMultiModule.name : "Nessun esame completo";
    multiModuleStatus.classList.toggle("is-active", hasSelection);
  }
};

const renderBadges = (data) => {
  if (!multiModuleRuleBadges) return;
  multiModuleRuleBadges.innerHTML = "";
  const badges = [
    `Soglia Mod.1: ${data.module1MinGrade}`,
    `Soglia Mod.2: ${data.module2MinGrade}`,
    `Pesi: ${data.weightModule1} / ${data.weightModule2}`,
    `Finale: ≥ ${data.finalMinGrade}`,
    `Arrotondamento: ${data.rounding}`,
  ];
  badges.forEach((label) => {
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = label;
    multiModuleRuleBadges.appendChild(span);
  });
};

const formatScore = (value) => {
  if (!Number.isFinite(value)) return "-";
  return Number(value).toFixed(1).replace(/\.0$/, "");
};

const isPassingStatus = (status) => status === "passed";
const isNotPassedStatus = (status) => status === "not_passed";
const isIncompleteStatus = (status) => status === "incomplete";

const getFilteredResults = () => {
  if (activeFilter === "passed") return selectedResults.filter((row) => isPassingStatus(row.status));
  if (activeFilter === "not_passed")
    return selectedResults.filter((row) => isNotPassedStatus(row.status));
  if (activeFilter === "incomplete")
    return selectedResults.filter((row) => isIncompleteStatus(row.status));
  return selectedResults;
};

const openOverrideModal = (row) => {
  activeOverrideStudent = row;
  if (overrideModule1Label) overrideModule1Label.textContent = selectedMultiModule.module1.name;
  if (overrideModule2Label) overrideModule2Label.textContent = selectedMultiModule.module2.name;

  const buildOptions = (select, attempts, activeId) => {
    if (!select) return;
    select.innerHTML = "";
    if (!attempts || attempts.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Nessun risultato disponibile";
      select.appendChild(opt);
      select.disabled = true;
      return;
    }
    const sorted = [...attempts].sort((a, b) => {
      const ta = a.updatedAt || a.resultDate || "";
      const tb = b.updatedAt || b.resultDate || "";
      return String(tb).localeCompare(String(ta));
    });
    sorted.forEach((attempt, index) => {
      const opt = document.createElement("option");
      opt.value = String(attempt.resultId);
      const labelParts = [];
      labelParts.push(`Voto ${formatScore(attempt.score)}`);
      if (attempt.resultDate) labelParts.push(`(${attempt.resultDate})`);
      if (index === 0) labelParts.push("Ultimo");
      opt.textContent = labelParts.join(" ");
      select.appendChild(opt);
    });
    select.disabled = false;
    if (activeId) select.value = String(activeId);
  };

  buildOptions(overrideModule1Select, row.module1.attempts, row.module1.resultId);
  buildOptions(overrideModule2Select, row.module2.attempts, row.module2.resultId);

  if (multiModuleOverrideStatus) multiModuleOverrideStatus.textContent = "";
  if (multiModuleOverrideModal) multiModuleOverrideModal.classList.remove("is-hidden");
  if (multiModuleOverrideBackdrop) multiModuleOverrideBackdrop.classList.remove("is-hidden");
};

const closeOverrideModal = () => {
  if (multiModuleOverrideModal) multiModuleOverrideModal.classList.add("is-hidden");
  if (multiModuleOverrideBackdrop) multiModuleOverrideBackdrop.classList.add("is-hidden");
  activeOverrideStudent = null;
};

const renderTable = () => {
  if (!multiModuleResultsBody) return;
  const rows = getFilteredResults();
  multiModuleResultsBody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const esitoLabel =
      row.status === "passed"
        ? "Superato"
        : row.status === "not_passed"
          ? "Non superato"
          : "Incompleto";
    const esitoClass =
      row.status === "passed"
        ? "status-badge is-success"
        : row.status === "not_passed"
          ? "status-badge is-danger"
          : "status-badge is-warning";
    const module1Meta = row.module1.isManual
      ? '<span class="pill-badge">Override</span>'
      : "";
    const module2Meta = row.module2.isManual
      ? '<span class="pill-badge">Override</span>'
      : "";
    tr.innerHTML = `
        <td>${row.matricola}</td>
        <td>${row.cognome || ""}</td>
        <td>${row.nome || ""}</td>
        <td>
          <div class="result-score">
            <span>${formatScore(row.module1.score)}</span>
            ${module1Meta}
          </div>
        </td>
        <td>
          <div class="result-score">
            <span>${formatScore(row.module2.score)}</span>
            ${module2Meta}
          </div>
        </td>
        <td>${formatScore(row.finalScore)}</td>
        <td><span class="${esitoClass}">${esitoLabel}</span></td>
        <td>
          <button class="btn btn-outline-secondary btn-sm" type="button" data-override="${row.matricola}">
            <i class="fa-solid fa-pen"></i>
            Modifica
          </button>
        </td>
      `;
    const btn = tr.querySelector("[data-override]");
    if (btn) {
      btn.addEventListener("click", () => openOverrideModal(row));
    }
    multiModuleResultsBody.appendChild(tr);
  });
  if (multiModuleCount) multiModuleCount.textContent = `${rows.length} studenti`;
};

const renderResults = (payload) => {
  selectedMultiModule = payload.multiModule;
  selectedResults = payload.students || [];
  if (multiModuleTitle) multiModuleTitle.textContent = selectedMultiModule.name;
  if (multiModuleMeta) {
    multiModuleMeta.textContent = `${selectedMultiModule.module1.name} · ${selectedMultiModule.module2.name}`;
  }
  if (module1Header) module1Header.textContent = selectedMultiModule.module1.name;
  if (module2Header) module2Header.textContent = selectedMultiModule.module2.name;
  renderBadges(selectedMultiModule);
  renderTable();
  updateVisibility();
};

const loadResults = async (multiModuleId) => {
  const payload = await apiFetch(`api/multi-modules/${multiModuleId}/results`);
  renderResults(payload);
};

const renderMultiModuleList = (groups) => {
  if (!multiModuleList) return;
  multiModuleList.innerHTML = "";
  if (!groups.length) {
    multiModuleList.textContent = "Nessun esame completo disponibile.";
    return;
  }
  groups.forEach((group) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const content = document.createElement("div");
    content.className = "question-card-content";
    const title = document.createElement("div");
    title.className = "list-item-title";
    title.textContent = group.name;
    const meta = document.createElement("div");
    meta.className = "list-item-meta";
    meta.textContent = `${group.module1_name} · ${group.module2_name}`;
    const actions = document.createElement("div");
    actions.className = "list-actions";
    const selectBtn = document.createElement("button");
    selectBtn.className = "btn btn-outline-primary btn-sm";
    selectBtn.textContent = "Seleziona";
    selectBtn.addEventListener("click", async () => {
      closeModal();
      await loadResults(group.id);
    });
    actions.appendChild(selectBtn);
    content.appendChild(title);
    content.appendChild(meta);
    content.appendChild(actions);
    item.appendChild(content);
    multiModuleList.appendChild(item);
  });
};

const loadMultiModules = async () => {
  const params = new URLSearchParams();
  if (Number.isFinite(activeCourseId)) params.set("courseId", String(activeCourseId));
  const payload = await apiFetch(`api/multi-modules?${params.toString()}`);
  renderMultiModuleList(payload.multiModules || []);
};

const exportCsv = () => {
  if (!selectedMultiModule || !selectedResults.length) return;
  const header = [
    "matricola",
    "cognome",
    "nome",
    "modulo1_score",
    "modulo2_score",
    "finale",
    "esito",
  ];
  const rows = selectedResults.map((row) => {
    const esito = row.status === "passed" ? "Superato" : row.status === "not_passed" ? "Non superato" : "In attesa";
    return [
      row.matricola,
      row.cognome || "",
      row.nome || "",
      formatScore(row.module1.score),
      formatScore(row.module2.score),
      formatScore(row.finalScore),
      esito,
    ];
  });
  const csv = [header, ...rows]
    .map((line) =>
      line
        .map((cell) => `"${String(cell).replace(/\"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${selectedMultiModule.name}-risultati.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const saveOverride = async (reset = false) => {
  if (!selectedMultiModule || !activeOverrideStudent) return;
  const body = {
    matricola: activeOverrideStudent.matricola,
    chosenResultIdModule1: reset ? null : Number(overrideModule1Select?.value || "") || null,
    chosenResultIdModule2: reset ? null : Number(overrideModule2Select?.value || "") || null,
  };
  if (overrideModule1Select?.disabled) body.chosenResultIdModule1 = null;
  if (overrideModule2Select?.disabled) body.chosenResultIdModule2 = null;
  try {
    await apiFetch(`api/multi-modules/${selectedMultiModule.id}/selection`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    notify(reset ? "Override rimosso." : "Override salvato.", "success");
    closeOverrideModal();
    await loadResults(selectedMultiModule.id);
  } catch (err) {
    notify(err.message || "Errore salvataggio override.", "error");
  }
};

const init = async () => {
  const course = await fetchActiveCourse();
  if (!course) {
    if (courseEmptyState) courseEmptyState.classList.remove("is-hidden");
    if (mainLayout) mainLayout.classList.add("is-hidden");
    return;
  }
  activeCourseId = course.id;
  if (courseEmptyState) courseEmptyState.classList.add("is-hidden");
  if (mainLayout) mainLayout.classList.remove("is-hidden");
  await loadMultiModules();
  updateVisibility();
};

if (multiModuleSelectBtn) multiModuleSelectBtn.addEventListener("click", () => {
  loadMultiModules();
  openModal();
});
if (multiModuleSelectBtnEmpty) multiModuleSelectBtnEmpty.addEventListener("click", () => {
  loadMultiModules();
  openModal();
});
if (multiModuleModalClose) multiModuleModalClose.addEventListener("click", closeModal);
if (multiModuleModalBackdrop) multiModuleModalBackdrop.addEventListener("click", closeModal);
if (multiModuleExportCsv) multiModuleExportCsv.addEventListener("click", exportCsv);
if (multiModuleOverrideClose)
  multiModuleOverrideClose.addEventListener("click", closeOverrideModal);
if (multiModuleOverrideBackdrop)
  multiModuleOverrideBackdrop.addEventListener("click", closeOverrideModal);
if (multiModuleOverrideSave)
  multiModuleOverrideSave.addEventListener("click", () => saveOverride(false));
if (multiModuleOverrideClear)
  multiModuleOverrideClear.addEventListener("click", () => saveOverride(true));

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter || "all";
    renderTable();
  });
});

init();
