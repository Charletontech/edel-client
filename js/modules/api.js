window.EdelModules = window.EdelModules || {};

window.EdelModules.api = {
  getErrorMessage(data) {
    if (!data) return "Request failed";

    if (typeof data === "string") {
      const trimmed = data.trim();
      return trimmed || "Request failed";
    }

    if (typeof data === "object") {
      return (
        data.message ||
        data.error ||
        data.details ||
        "Request failed"
      );
    }

    return "Request failed";
  },

  buildUrl(path = "") {
    if (/^https?:\/\//i.test(path)) return path;

    const normalizedPath = (path.startsWith("/") ? path : `/${path}`)
      .replace("/assets/images/avatar.webp", "/assets/images/avatar.jpg");
    if (normalizedPath.startsWith("/assets/")) {
      const pathSegments = window.location.pathname
        .split("/")
        .filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1] || "";
      const isFilePath = lastSegment.includes(".");
      const directoryDepth = isFilePath
        ? pathSegments.length - 1
        : pathSegments.length;
      const relativePrefix = directoryDepth > 0 ? "../" : "./";
      return `${relativePrefix}${normalizedPath.slice(1)}`;
    }

    const baseUrl = (window.EdelConfig?.apiBaseUrl || "").replace(/\/$/, "");
    return `${baseUrl}${normalizedPath}`;
  },

  async request(path, options = {}) {
    try {
      const { headers, body, ...restOptions } = options;
      
      const config = {
        ...restOptions,
        headers: {
          ...(headers || {}),
        },
      };

      if (body) {
        if (body instanceof FormData) {
          config.body = body;
          // Let browser set multipart/form-data with boundary
        } else {
          if (!config.headers["Content-Type"]) {
            config.headers["Content-Type"] = "application/json";
          }
          config.body = typeof body === "string" ? body : JSON.stringify(body);
        }
      }

      const response = await fetch(this.buildUrl(path), config);

      const contentType = response.headers.get("content-type") || "";
      let data = null;

      try {
        data = contentType.includes("application/json")
          ? await response.json()
          : await response.text();
      } catch (parseError) {
        data = null;
      }

      if (!response.ok) {
        const message = this.getErrorMessage(data);
        
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
        error.isApiError = true;
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
      body,
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
      body,
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
