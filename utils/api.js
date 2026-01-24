(() => {
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

  window.apiFetch = apiFetch;
})();
