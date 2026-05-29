window.EdelModules = window.EdelModules || {};

window.EdelModules.location = {
  get minAcceptedAccuracy() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? 100 : 500;
  },

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

  isGenericLabel(label) {
    if (!label) return true;
    const genericTerms = [
      "current location",
      "currebt location",
      "saved location",
      "unknown location",
      "location captured",
      "lagos, nigeria",
    ];
    const lowerLabel = label.toLowerCase().trim();
    return genericTerms.some((term) => lowerLabel.includes(term));
  },

  simulateLocationText(target, value = "Lagos, Nigeria", delay = 1200) {
    if (!target) return;

    target.innerHTML = '<span class="animate-pulse">Locating...</span>';
    window.setTimeout(() => {
      target.innerText = value;
    }, delay);
  },

  async reverseGeocode(latitude, longitude) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "E-del-App",
          },
        },
      );

      if (!response.ok) throw new Error("Geocoding failed");

      const data = await response.json();
      const addr = data.address;

      // Prioritize area-specific fields for a concise label
      const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.town || addr.village;
      const city = addr.city || addr.state || "";

      if (area && city) return `${area}, ${city}`;
      if (area || city) return area || city;

      return data.display_name.split(",")[0] || "Unknown Location";
    } catch (error) {
      console.warn("Reverse geocoding failed:", error.message);
      return null;
    }
  },
};
