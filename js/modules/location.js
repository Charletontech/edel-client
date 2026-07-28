window.EdelModules = window.EdelModules || {};

window.EdelModules.location = {
  get minAcceptedAccuracy() {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    return isMobile ? 100 : 500;
  },

  // ─── Core Browser GPS Helpers ──────────────────────────────────────────────

  getCurrentPosition(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  },

  /**
   * Uses watchPosition to stream location updates.
   * Returns the first position received, then clears the watch.
   * Far more reliable than getCurrentPosition on mobile browsers.
   */
  watchForPosition(options = {}) {
    const { timeout = 20000, ...positionOptions } = options;
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          navigator.geolocation.clearWatch(watchId);
          const err = new Error("Location request timed out. Please try again.");
          err.code = 3;
          reject(err);
        }
      }, timeout);

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            navigator.geolocation.clearWatch(watchId);
            resolve(position);
          }
        },
        (error) => {
          // Permission denied is fatal — stop immediately
          if (error?.code === 1 && !resolved) {
            resolved = true;
            clearTimeout(timer);
            navigator.geolocation.clearWatch(watchId);
            reject(error);
          }
          // For other errors (POSITION_UNAVAILABLE), let watchPosition keep trying
          // until the timeout expires
        },
        {
          enableHighAccuracy: false,
          maximumAge: 300000, // Accept cached positions up to 5 minutes old
          ...positionOptions,
        },
      );
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
    const { timeout = 20000, maximumAge = 300000, ...restOptions } = options;

    // Strategy: Try a quick high-accuracy getCurrentPosition first (cached results).
    // If that fails for any reason other than permission denied,
    // fall back to watchPosition which streams updates and is far more reliable.
    try {
      const position = await this.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 3000,
        maximumAge,
        ...restOptions,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (err) {
      // Permission denied — do not retry, surface immediately
      if (err?.code === 1) throw err;
    }

    // Reliable fallback: watchPosition streams updates continuously
    // and returns the first fix it gets. Almost never times out.
    const watched = await this.watchForPosition({
      timeout,
      maximumAge,
      enableHighAccuracy: false,
      ...restOptions,
    });

    return {
      latitude: watched.coords.latitude,
      longitude: watched.coords.longitude,
      accuracy: watched.coords.accuracy,
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

  // ─── Permission Check (without triggering prompt) ─────────────────────────

  /**
   * Check browser permission state without triggering the prompt.
   * Returns: 'granted' | 'denied' | 'prompt' | 'unsupported'
   */
  async checkGeolocationPermission() {
    if (!navigator.permissions || !navigator.permissions.query) {
      return "prompt"; // Fallback for older browsers
    }
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state; // 'granted' | 'denied' | 'prompt'
    } catch (error) {
      return "prompt";
    }
  },

  // ─── IP Geolocation Fallback ───────────────────────────────────────────────

  /**
   * Get approximate location from the user's IP address (server-side call).
   * Returns location object or null.
   */
  async getLocationFromIP() {
    try {
      const response = await EdelModules.api.get("/api/location/from-ip", {
        silent: true,
      });
      return response.success ? response.location : null;
    } catch (error) {
      console.error("[Location] IP location failed:", error);
      return null;
    }
  },

  // ─── Reverse Geocoding (BigDataCloud client API — free, keyless) ───────────

  /**
   * Reverse geocode GPS coordinates using BigDataCloud client API.
   * This is called with GPS coords from the user's device.
   */
  async reverseGeocode(lat, lng) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Reverse geocoding failed");
      const data = await response.json();

      // Build a concise label from BigDataCloud response
      const area =
        data.locality || data.city || data.principalSubdivision || "";
      const state = data.principalSubdivision || "";
      const country = data.countryName || "";

      if (area && state && area !== state) return `${area}, ${state}`;
      if (area) return area;
      if (state) return state;
      return data.localityInfo?.administrative?.[2]?.name || null;
    } catch (error) {
      console.warn("[Location] Reverse geocoding failed:", error.message);
      return null;
    }
  },

  // ─── Server-side Text Geocoding ────────────────────────────────────────────

  /**
   * Geocode a text query (city name, area, postcode) via the backend.
   * Returns { success, location, results } or throws.
   */
  async geocodeQuery(query) {
    return await EdelModules.api.post(
      "/api/location/geocode",
      { query },
      { silent: true },
    );
  },

  // ─── Haversine Distance ────────────────────────────────────────────────────

  /**
   * Calculate distance in km between two coordinates using the Haversine formula.
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // ─── Utility Helpers ───────────────────────────────────────────────────────

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

  // ─── MASTER LOCATION FUNCTION ─────────────────────────────────────────────
  //
  // This is the single source of truth for ALL location logic.
  // Every page that needs a location calls this function.
  //
  // Returns: { success: boolean, location: { lat, lng, city, source, accuracy }, error?: string }
  //
  /**
   * Master location function — handles all location scenarios.
   * Flow: GPS (if permitted) → IP geolocation (silent fallback) → failure (UI shows manual input)
   */
  async getLocation() {
    // 1. Check browser permission state without triggering prompt
    const permissionStatus = await this.checkGeolocationPermission();

    // 2. If granted, use GPS
    if (permissionStatus === "granted") {
      try {
        if (window.Ui)
          Ui.toast(
            "info",
            "Detecting Location",
            "Getting your precise location...",
            { timer: 2500 },
          );

        const gpsCoords = await this.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        const lat = gpsCoords.coords.latitude;
        const lng = gpsCoords.coords.longitude;

        const cityData = await this.reverseGeocode(lat, lng);
        const city = cityData || "Your area";

        if (window.Ui) Ui.toast("success", "Location Detected", `📍 ${city}`);

        return {
          success: true,
          location: {
            lat,
            lng,
            city,
            source: "gps",
            accuracy: "high",
          },
        };
      } catch (error) {
        console.error("[Location] GPS failed:", error);
        if (window.Ui)
          Ui.toast(
            "warning",
            "GPS Unavailable",
            "⚠️ Could not get precise location. Trying approximate...",
            { timer: 3000 },
          );
      }
    }

    // 3. If prompt, show primer message then trigger browser prompt
    else if (permissionStatus === "prompt") {
      if (window.Ui) {
        await window.Ui.alert(
          "info",
          "Location Access",
          "Your browser will now ask if you want to grant us access. Please click 'Allow' so we can show you nearby services.",
          true,
          false,
        );
      }

      try {
        if (window.Ui)
          Ui.toast(
            "info",
            "Detecting Location",
            "Getting your precise location...",
            { timer: 2500 },
          );
        const gpsCoords = await this.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        const lat = gpsCoords.coords.latitude;
        const lng = gpsCoords.coords.longitude;

        const cityData = await this.reverseGeocode(lat, lng);
        const city = cityData || "Your area";

        if (window.Ui) Ui.toast("success", "Location Detected", `📍 ${city}`);

        return {
          success: true,
          location: {
            lat,
            lng,
            city,
            source: "gps",
            accuracy: "high",
          },
        };
      } catch (error) {
        console.error("[Location] GPS failed or denied:", error);
        // if (window.Ui) Ui.toast("warning", "Location Denied", "⚠️ You denied location access. We'll try to approximate your location instead.", { timer: 4000 });
      }
    }

    // 4 & 5. If denied or unsupported (or prompt failed/denied), skip directly to IP fallback

    // 3. If denied OR prompt/unknown, try IP geolocation (silent fallback)
    const ipLocation = await this.getLocationFromIP();
    if (ipLocation && (ipLocation.city || (ipLocation.lat && ipLocation.lng))) {
      const city = ipLocation.city || "Your area";
      return {
        success: true,
        location: {
          lat: ipLocation.lat,
          lng: ipLocation.lng,
          city,
          source: "ip",
          accuracy: "medium",
        },
      };
    }

    // 4. All automated methods failed — return failure (caller will handle UI)
    return {
      success: false,
      error: "location_required",
      location: null,
    };
  },
};

// ─── Global shorthand ─────────────────────────────────────────────────────────
// Expose getLocation() as a top-level function as specified in location-fix.md
window.getLocation = function () {
  return window.EdelModules.location.getLocation();
};
