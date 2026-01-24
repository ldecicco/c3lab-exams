(() => {
  const normalizeDateToInput = (value) => {
    if (!value) return "";
    if (/\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (value) => {
    const normalized = normalizeDateToInput(value);
    if (!normalized) return "";
    const [year, month, day] = normalized.split("-");
    return `${day}-${month}-${year}`;
  };

  const formatScore = (value) => {
    if (!Number.isFinite(value)) return "-";
    return Number(value).toFixed(1).replace(/\.0$/, "");
  };

  const formatName = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return raw
      .toLowerCase()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  window.formatDateDisplay = formatDateDisplay;
  window.normalizeDateToInput = normalizeDateToInput;
  window.formatScore = formatScore;
  window.formatName = formatName;
})();
