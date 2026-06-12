Edel.initIcons();
EdelModules.auth.initInteractiveEffects();
Ui.initPasswordToggles?.();

const authPage = EdelModules.auth.createPageController();
const loginView = document.getElementById("view-login");
const signupView = document.getElementById("view-signup");
const accountChoiceView = document.getElementById("view-account-choice");
const verificationView = document.getElementById("view-email-verification");
const verificationEmailText = document.getElementById("verification-email-text");
const verificationEmailInput = document.getElementById("verification-email-input");
const resendVerificationBtn = document.getElementById("btn-resend-verification");
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

function showAccountChoiceView() {
  if (!accountChoiceView) return;
  if (loginView) {
    loginView.classList.add("hidden");
    loginView.classList.remove("fade-enter-active");
  }
  if (signupView) {
    signupView.classList.add("hidden");
    signupView.classList.remove("fade-enter-active");
  }
  accountChoiceView.classList.remove("hidden");
  accountChoiceView.classList.add("fade-enter-active", "flex");
  Edel.initIcons();
}

function hideVerificationView() {
  if (!verificationView) return;
  verificationView.classList.add("hidden");
  verificationView.classList.remove("fade-enter-active", "flex");
}

function showVerificationView(email, message, type) {
  if (!verificationView) return;

  if (loginView) {
    loginView.classList.add("hidden");
    loginView.classList.remove("fade-enter-active");
  }
  if (signupView) {
    signupView.classList.add("hidden");
    signupView.classList.remove("fade-enter-active");
  }
  if (accountChoiceView) {
    accountChoiceView.classList.add("hidden");
    accountChoiceView.classList.remove("fade-enter-active", "flex");
  }

  verificationView.classList.remove("hidden");
  verificationView.classList.add("fade-enter-active", "flex");

  if (verificationEmailText) {
    verificationEmailText.textContent = email ? `Verification email: ${email}` : "";
  }

  const messageEl = document.getElementById("verification-message-text");
  if (messageEl) {
    if (type === "signup") {
      messageEl.textContent = "Your account has been created! Please check your inbox and click the verification link to continue.";
    } else if (type === "login") {
      messageEl.textContent = "We found your account, but you need to verify your email before we can let you into the app.";
    } else if (message) {
      messageEl.textContent = message;
    }
  }

  const loginEmailInput = document.querySelector('[name="login_email"]');
  const signupEmailInput = document.querySelector('[name="signup_email"]');
  if (email) {
    if (verificationEmailInput) {
      verificationEmailInput.value = email;
    }
    if (loginEmailInput && !loginEmailInput.value.trim()) {
      loginEmailInput.value = email;
    }
    if (signupEmailInput) {
      signupEmailInput.value = email;
    }
  }

  if (message) {
    Ui.toast("info", "Verification Required", message);
  }

  Edel.initIcons();
}

function hideAccountChoiceView() {
  if (!accountChoiceView) return;
  accountChoiceView.classList.add("hidden");
  accountChoiceView.classList.remove("fade-enter-active", "flex");
}

function completeLogin(user) {
  EdelModules.auth.setUser(user);
  localStorage.setItem("edel_just_logged_in", "true");
  EdelModules.auth.redirectAfterLogin(user?.role);
}

function promptForAccountChoice(user) {
  EdelModules.auth.setUser({ ...user, activeRole: null });
  showAccountChoiceView();
}

async function verifyEmailToken(token) {
  if (!token) return;

  showVerificationView("", "Verifying your email address now.");

  try {
    await EdelModules.api.post(
      "/api/auth/verify-email",
      { token },
      { silent: true },
    );

    Ui.alert(
      "success",
      "Email Verified",
      "Your email has been verified. You can now sign in.",
      true,
      false,
    );

    window.history.replaceState({}, document.title, window.location.pathname);
    switchAuthView("login");
  } catch (error) {
    Ui.alert(
      "error",
      "Verification Failed",
      error.message || "We could not verify your email link.",
      true,
      false,
    );
    showVerificationView("", error.message || "We could not verify your email link.");
  }
}

window.chooseLoginRole = (role) => {
  const currentUser = EdelModules.auth.getUser();
  if (!currentUser || currentUser.role !== "both") return;

  EdelModules.auth.setSessionRole(role);
  hideAccountChoiceView();
  completeLogin(EdelModules.auth.getUser());
};

if (EdelModules.auth.isLoggedIn()) {
  const currentUser = EdelModules.auth.getUser();
  const sessionRole = EdelModules.auth.getSessionRole(currentUser);

  if (currentUser?.role === "both" && !sessionRole) {
    promptForAccountChoice(currentUser);
  } else {
    EdelModules.auth.redirectAfterLogin(currentUser?.role);
  }
}

const verificationToken = new URLSearchParams(window.location.search).get("verify");
if (verificationToken) {
  verifyEmailToken(verificationToken);
}

window.addEventListener("edel:account-choice-required", (event) => {
  promptForAccountChoice(event.detail);
});

window.addEventListener("edel:verification-required", (event) => {
  const detail = event.detail || {};
  showVerificationView(detail.email || "", detail.message || "Please verify your email to continue.", detail.type);
});

resendVerificationBtn?.addEventListener("click", async () => {
  const email =
    verificationEmailInput?.value?.trim() ||
    EdelModules.auth.getUser()?.email ||
    verificationEmailText?.textContent?.replace("Verification email: ", "").trim();
  const signupEmail = document.querySelector('[name="signup_email"]')?.value?.trim();
  const loginEmail = document.querySelector('[name="login_email"]')?.value?.trim();
  const targetEmail = email || signupEmail || loginEmail;

  if (!targetEmail) {
    Ui.toast("warning", "Email Required", "Please enter your email address first.");
    return;
  }

  try {
    await EdelModules.api.post(
      "/api/auth/resend-verification",
      { email: targetEmail },
      { silent: true },
    );

    Ui.toast(
      "success",
      "Verification Sent",
      "A new verification link has been sent to your email.",
    );
  } catch (error) {
    Ui.toast("error", "Resend Failed", error.message || "Could not resend verification email.");
  }
});

locationButton?.addEventListener("click", captureSignupLocation);

window.addEventListener("load", () => {
  if (locationButton) {
    captureSignupLocation();
  }
});

window.switchAuthView = (view) => authPage.activateView(view);
window.updateRoleUI = () => authPage.updateRoleUI();
window.handleAuth = (event, type) => authPage.handleSubmit(event, type);
