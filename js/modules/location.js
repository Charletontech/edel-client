window.EdelModules = window.EdelModules || {};

window.EdelModules.location = {
  minAcceptedAccuracy: 100,

  getCurrentPosition(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  },

  normalizeLocationError(error, fallbackMessage) {
    if (error?.code === 1) {
      const permissionError = new Error(
        "Location access was denied. Please enable it and try again.",
      );
      permissionError.code = error.code;
      permissionError.isLocationPermissionDenied = true;
      return permissionError;
    }

    if (error?.code === 3) {
      const timeoutError = new Error(
        "Location request timed out. Please try again.",
      );
      timeoutError.code = error.code;
      return timeoutError;
    }

    const genericError = new Error(
      fallbackMessage || "We could not get your current location.",
    );
    genericError.code = error?.code;
    return genericError;
  },

  async getBrowserLocation(options = {}) {
    const position = await this.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000,
      ...options,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  },

  async getBestBrowserLocation(options = {}) {
    const {
      maxAcceptedAccuracy = this.minAcceptedAccuracy,
      ...positionOptions
    } = options;

    let location;

    try {
      location = await this.getBrowserLocation(positionOptions);
    } catch (error) {
      throw this.normalizeLocationError(error);
    }

    if (location.accuracy > maxAcceptedAccuracy) {
      const accuracyError = new Error(
        `Location accuracy is too low (${Math.round(location.accuracy)}m). Please try again in a clearer signal area.`,
      );
      accuracyError.accuracy = location.accuracy;
      accuracyError.isLowAccuracy = true;
      throw accuracyError;
    }

    return location;
  },

  formatLocationLabel(locationLabel, fallback = "Current location") {
    const value = (locationLabel || "").trim();
    return value || fallback;
  },

  simulateLocationText(target, value = "Lagos, Nigeria", delay = 1200) {
    if (!target) return;

    target.innerHTML = '<span class="animate-pulse">Locating...</span>';
    window.setTimeout(() => {
      target.innerText = value;
    }, delay);
  },
};
