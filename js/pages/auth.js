Edel.initIcons();
EdelModules.auth.initInteractiveEffects();
Ui.initPasswordToggles?.();

const authPage = EdelModules.auth.createPageController();
const locationButton = document.getElementById("btn-detect-location");
const locationStatus = document.getElementById("signup-location-status");
const locationLabelInput = document.querySelector(
  '[name="signup_location_label"]',
);
const latitudeInput = document.querySelector('[name="signup_latitude"]');
const longitudeInput = document.querySelector('[name="signup_longitude"]');

async function captureSignupLocation() {
  if (!locationButton || !locationStatus) return;

  const originalText = locationButton.innerHTML;
  locationButton.disabled = true;
  locationButton.innerHTML =
    '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Detecting...';
  locationStatus.textContent = "Trying to get your current location...";
  Edel.initIcons();

  try {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const signupMaxAccuracy = isMobile ? 100 : Infinity;

    const coords = await EdelModules.location.getBestBrowserLocation({
      maxAcceptedAccuracy: signupMaxAccuracy,
      timeout: 7000,
      maximumAge: 15000,
    });
    if (latitudeInput) latitudeInput.value = coords.latitude;
    if (longitudeInput) longitudeInput.value = coords.longitude;

    // Suggest a real address instead of generic "Current location"
    if (locationLabelInput && !locationLabelInput.value.trim()) {
      const realAddress = await EdelModules.location.reverseGeocode(
        coords.latitude,
        coords.longitude,
      );
      locationLabelInput.value = realAddress || "Current location";
    }

    locationStatus.textContent = `Location captured (${Math.round(coords.accuracy)}m accuracy). Feel free to rename it if needed.`;
    Ui.toast(
      "success",
      "Location Ready",
      "Your coordinates have been captured.",
    );
  } catch (error) {
    if (error.isLowAccuracy) {
      locationStatus.textContent =
        'Your location signal is too weak right now. Move to a clearer area and try again, or enter your area and city manually like "Yaba, Lagos".';
    } else {
      locationStatus.textContent =
        'We could not get your location. Please allow location access and try again, or enter your area and city manually like "Yaba, Lagos".';
    }

    Ui.toast(
      "error",
      "Location Required",
      error.message || "Location access failed.",
    );
  } finally {
    locationButton.disabled = false;
    locationButton.innerHTML = originalText;
    Edel.initIcons();
  }
}

if (EdelModules.auth.isLoggedIn()) {
  const currentUser = EdelModules.auth.getUser();
  EdelModules.auth.redirectAfterLogin(currentUser?.role);
}

locationButton?.addEventListener("click", captureSignupLocation);

window.addEventListener("load", () => {
  if (locationButton) {
    captureSignupLocation();
  }
});

window.switchAuthView = (view) => authPage.activateView(view);
window.updateRoleUI = () => authPage.updateRoleUI();
window.goToStep = (step) => authPage.goToStep(step);
window.handleAuth = (event, type) => authPage.handleSubmit(event, type);
