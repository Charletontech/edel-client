window.EdelModules = window.EdelModules || {};

window.EdelModules.api = {
  buildUrl(path = "") {
    if (/^https?:\/\//i.test(path)) return path;

    const baseUrl = (window.EdelConfig?.apiBaseUrl || "").replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  },

  async request(path, options = {}) {
    try {
      const { headers, ...restOptions } = options;
      const response = await fetch(this.buildUrl(path), {
        ...restOptions,
        headers: {
          "Content-Type": "application/json",
          ...(headers || {}),
        },
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message =
          (data && typeof data === "object" && data.message) ||
          (typeof data === "string" && data) ||
          "Request failed";
        
        // Auto-toast error unless silent option is true
        if (!options.silent) {
          if (window.Ui && typeof window.Ui.toast === "function") {
            window.Ui.toast("error", "API Error", message);
          } else {
            console.error("API Error:", message);
          }
        }

        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      // Re-throw if it was already an API error with message
      if (error.status) throw error;

      // Handle network errors
      const message = "Network error. Please check your connection.";
      if (!options.silent && window.Ui && typeof window.Ui.toast === "function") {
        window.Ui.toast("error", "Connection Failed", message);
      }
      throw new Error(message);
    }
  },

  post(path, body, options = {}) {
    return this.request(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    });
  },

  get(path, options = {}) {
    return this.request(path, {
      method: "GET",
      ...options,
    });
  },

  put(path, body, options = {}) {
    return this.request(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    });
  },

  delete(path, options = {}) {
    return this.request(path, {
      method: "DELETE",
      ...options,
    });
  },
};
