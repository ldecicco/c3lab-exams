(() => {
  const getBasePath = () => {
    const baseTag = document.querySelector("base");
    const baseHref = baseTag?.getAttribute("href") || "/";
    const trimmed = baseHref.endsWith("/") ? baseHref.slice(0, -1) : baseHref;
    return trimmed || "";
  };

  const withBasePath = (url) => {
    if (!url || typeof url !== "string") return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const basePath = getBasePath();
    if (!basePath || basePath === "/") return url;
    if (url.startsWith("/")) return `${basePath}${url}`;
    return `${basePath}/${url}`;
  };

  const apiFetch = async (url, options = {}) => {
    const headers = options.headers || {};
    headers.Accept = "application/json";
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const resolvedUrl = withBasePath(url);
    const response = await fetch(resolvedUrl, { ...options, headers });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Errore ${response.status}`);
    }
    return response.json();
  };

  window.apiFetch = apiFetch;
})();
