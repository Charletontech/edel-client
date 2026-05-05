window.EdelModules = window.EdelModules || {};

window.EdelModules.validation = {
  requireValue(value) {
    return String(value || "").trim().length > 0;
  },
};
