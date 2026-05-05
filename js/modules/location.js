window.EdelModules = window.EdelModules || {};

window.EdelModules.location = {
  getCurrentPosition(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  },

  simulateLocationText(target, value = "Lagos, Nigeria", delay = 1200) {
    if (!target) return;

    target.innerHTML = '<span class="animate-pulse">Locating...</span>';
    window.setTimeout(() => {
      target.innerText = value;
    }, delay);
  },
};
