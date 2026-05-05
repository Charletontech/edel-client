window.EdelModules = window.EdelModules || {};

window.EdelModules.storage = {
  get(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },

  set(key, value) {
    const normalized =
      typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, normalized);
  },

  remove(key) {
    localStorage.removeItem(key);
  },
};
