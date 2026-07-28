Edel.initIcons();
EdelModules.auth.initInteractiveEffects();
Ui.initPasswordToggles?.();

const authPage = EdelModules.auth.createPageController();
const loginView = document.getElementById("view-login");
const signupView = document.getElementById("view-signup");
const accountChoiceView = document.getElementById("view-account-choice");
const verificationView = document.getElementById("view-email-verification");
const faceCaptureView = document.getElementById("view-face-capture");
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

// â”€â”€â”€ Face Capture State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let _faceStream = null;
let _faceDetectionInterval = null;
let _faceCaptureEmail = null;
let _faceModelsLoaded = false;
let _faceDetected = false;
let _capturedBlob = null;

const FACE_MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

async function loadFaceModels() {
  if (_faceModelsLoaded) return;
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_URL);
    _faceModelsLoaded = true;
  } catch (e) {
    console.warn('[Face Capture] Could not load face detection model:', e);
  }
}

function stopFaceCamera() {
  if (_faceDetectionInterval) {
    clearInterval(_faceDetectionInterval);
    _faceDetectionInterval = null;
  }
  if (_faceStream) {
    _faceStream.getTracks().forEach(t => t.stop());
    _faceStream = null;
  }
}

function setFaceStatus(text, type = 'neutral') {
  const el = document.getElementById('face-status-text');
  const ring = document.getElementById('face-detect-ring');
  if (!el || !ring) return;
  el.textContent = text;
  if (type === 'good') {
    el.className = 'text-center text-sm font-semibold text-green-600 mb-4';
    ring.style.boxShadow = '0 0 0 4px #16a34a';
  } else if (type === 'warn') {
    el.className = 'text-center text-sm font-semibold text-amber-500 mb-4';
    ring.style.boxShadow = '0 0 0 4px #f59e0b';
  } else if (type === 'error') {
    el.className = 'text-center text-sm font-semibold text-red-500 mb-4';
    ring.style.boxShadow = '0 0 0 0 transparent';
  } else {
    el.className = 'text-center text-sm font-semibold text-slate-500 mb-4';
    ring.style.boxShadow = '0 0 0 0 transparent';
  }
}

async function startFaceDetectionLoop(video) {
  if (!_faceModelsLoaded) {
    setFaceStatus('Face detection unavailable. You can still capture a photo.', 'warn');
    document.getElementById('btn-capture-face').disabled = false;
    return;
  }

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

  _faceDetectionInterval = setInterval(async () => {
    if (!video || video.readyState < 2) return;
    try {
      const result = await faceapi.detectSingleFace(video, options);
      const captureBtn = document.getElementById('btn-capture-face');
      if (result) {
        _faceDetected = true;
        setFaceStatus('Face detected! Ready to capture.', 'good');
        if (captureBtn) captureBtn.disabled = false;
      } else {
        _faceDetected = false;
        setFaceStatus('Position your face inside the circle.', 'warn');
        if (captureBtn) captureBtn.disabled = true;
      }
    } catch (e) {
      // Silent â€” detection errors happen on first frames
    }
  }, 400);
}

async function showFaceCaptureView(email) {
  _faceCaptureEmail = email;
  _capturedBlob = null;

  // Hide all other views
  [loginView, signupView, accountChoiceView, verificationView].forEach(v => {
    if (v) { v.classList.add('hidden'); v.classList.remove('fade-enter-active', 'flex'); }
  });

  if (!faceCaptureView) return;
  faceCaptureView.classList.remove('hidden');
  faceCaptureView.classList.add('fade-enter-active');

  // Reset UI state
  const captureBtn = document.getElementById('btn-capture-face');
  const retakeBtn = document.getElementById('btn-retake-face');
  const confirmBtn = document.getElementById('btn-confirm-face');
  const snapshotCanvas = document.getElementById('face-capture-snapshot');
  const video = document.getElementById('face-capture-video');

  if (captureBtn) { captureBtn.classList.remove('hidden'); captureBtn.disabled = true; }
  if (retakeBtn) retakeBtn.classList.add('hidden');
  if (confirmBtn) confirmBtn.classList.add('hidden');
  if (snapshotCanvas) snapshotCanvas.classList.add('hidden');
  if (video) video.classList.remove('hidden');

  Edel.initIcons();
  setFaceStatus('Starting camera...', 'neutral');

  // Load face detection models (non-blocking)
  loadFaceModels().catch(() => {});

  // Request camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
      audio: false
    });
    _faceStream = stream;
    if (video) {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        setFaceStatus('Position your face inside the circle.', 'warn');
        // Wait for models then start detection
        loadFaceModels().then(() => startFaceDetectionLoop(video)).catch(() => {
          setFaceStatus('Detection unavailable â€” you can still capture.', 'warn');
          if (captureBtn) captureBtn.disabled = false;
        });
      };
    }
  } catch (err) {
    setFaceStatus('Camera access denied. You can skip verification for now.', 'error');
    if (captureBtn) captureBtn.disabled = true;
  }
}

function hideFaceCaptureView() {
  stopFaceCamera();
  if (faceCaptureView) {
    faceCaptureView.classList.add('hidden');
    faceCaptureView.classList.remove('fade-enter-active');
  }
}

// Wire face capture buttons
document.getElementById('btn-capture-face')?.addEventListener('click', () => {
  const video = document.getElementById('face-capture-video');
  const snapshotCanvas = document.getElementById('face-capture-snapshot');
  const captureBtn = document.getElementById('btn-capture-face');
  const retakeBtn = document.getElementById('btn-retake-face');
  const confirmBtn = document.getElementById('btn-confirm-face');
  if (!video || !snapshotCanvas) return;

  // Draw current frame to snapshot canvas
  snapshotCanvas.width = video.videoWidth || 240;
  snapshotCanvas.height = video.videoHeight || 240;
  const ctx = snapshotCanvas.getContext('2d');
  // Mirror the frame (video is CSS-mirrored, so we mirror in canvas too for correct orientation)
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -snapshotCanvas.width, 0, snapshotCanvas.width, snapshotCanvas.height);
  ctx.restore();

  // Convert to blob
  snapshotCanvas.toBlob(blob => {
    _capturedBlob = blob;
  }, 'image/jpeg', 0.9);

  // Switch display
  video.classList.add('hidden');
  snapshotCanvas.classList.remove('hidden');
  captureBtn.classList.add('hidden');
  retakeBtn.classList.remove('hidden');
  confirmBtn.classList.remove('hidden');

  // Stop detection loop (keep stream for retake)
  if (_faceDetectionInterval) { clearInterval(_faceDetectionInterval); _faceDetectionInterval = null; }
  setFaceStatus('Looking good! Confirm or retake.', 'good');
  Edel.initIcons();
});

document.getElementById('btn-retake-face')?.addEventListener('click', () => {
  const video = document.getElementById('face-capture-video');
  const snapshotCanvas = document.getElementById('face-capture-snapshot');
  const captureBtn = document.getElementById('btn-capture-face');
  const retakeBtn = document.getElementById('btn-retake-face');
  const confirmBtn = document.getElementById('btn-confirm-face');

  _capturedBlob = null;
  video?.classList.remove('hidden');
  snapshotCanvas?.classList.add('hidden');
  captureBtn?.classList.remove('hidden');
  if (captureBtn) captureBtn.disabled = true;
  retakeBtn?.classList.add('hidden');
  confirmBtn?.classList.add('hidden');

  setFaceStatus('Position your face inside the circle.', 'warn');
  if (video) startFaceDetectionLoop(video);
  Edel.initIcons();
});

document.getElementById('btn-confirm-face')?.addEventListener('click', async () => {
  if (!_capturedBlob || !_faceCaptureEmail) {
    Ui.toast('error', 'Capture Error', 'No photo captured. Please try again.');
    return;
  }

  const confirmBtn = document.getElementById('btn-confirm-face');
  const retakeBtn = document.getElementById('btn-retake-face');
  const skipBtn = document.getElementById('btn-skip-face');
  const originalHtml = confirmBtn.innerHTML;

  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Uploading...';
  if (retakeBtn) retakeBtn.disabled = true;
  if (skipBtn) skipBtn.disabled = true;
  Edel.initIcons();

  try {
    const formData = new FormData();
    formData.append('email', _faceCaptureEmail);
    formData.append('facePhoto', _capturedBlob, 'face.jpg');

    await EdelModules.api.post('/api/auth/upload-face', formData, { silent: true });

    // Update local user data if already stored
    const currentUser = EdelModules.auth.getUser();
    if (currentUser) {
      currentUser.faceVerified = true;
      EdelModules.auth.setUser(currentUser);
    }

    Ui.toast('success', 'Face Verified', 'Your identity has been confirmed.');
    hideFaceCaptureView();
    showVerificationView(_faceCaptureEmail, null, 'signup');
  } catch (err) {
    Ui.toast('error', 'Upload Failed', err.message || 'Could not upload face photo. You can try again or skip.');
    confirmBtn.innerHTML = originalHtml;
    confirmBtn.disabled = false;
    if (retakeBtn) retakeBtn.disabled = false;
    if (skipBtn) skipBtn.disabled = false;
    Edel.initIcons();
  }
});

document.getElementById('btn-skip-face')?.addEventListener('click', () => {
  hideFaceCaptureView();
  showVerificationView(_faceCaptureEmail, null, 'signup');
});

// ─── Location Detection ──────────────────────────────────────────────────────

/** Store the pending location result for form submission */
let _pendingLocation = null;

/** Track if primer has been shown this session */
const _primerShownKey = 'edel_location_primer_shown';

/**
 * Wire up the manual location input: debounced geocoding as user types.
 */
function initManualLocationInput() {
  const manualSection = document.getElementById('signup-manual-location-section');
  const manualInput   = document.getElementById('signup-manual-location-input');
  const manualStatus  = document.getElementById('signup-manual-location-status');
  if (!manualSection || !manualInput) return;

  // Disable main input so user focuses on the search bar
  if (locationLabelInput) {
    locationLabelInput.value = "Location not detected";
    locationLabelInput.disabled = true;
    locationLabelInput.classList.add("bg-slate-100", "text-slate-400", "cursor-not-allowed");
  }

  manualSection.classList.remove('hidden');

  const updateStatus = (html) => {
    if (manualStatus) {
      manualStatus.innerHTML = html;
      if (window.lucide) window.lucide.createIcons({ root: manualStatus });
    }
  };

  updateStatus('<span class="flex items-center gap-1"><i data-lucide="lightbulb" class="w-3.5 h-3.5"></i> Enter your city or area to find local services.</span>');

  let debounceTimer;
  manualInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = manualInput.value.trim();
    if (!query) return;

    debounceTimer = setTimeout(async () => {
      updateStatus('<span class="flex items-center gap-1 text-brand-accent"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Searching for location...</span>');

      try {
        const data = await EdelModules.location.geocodeQuery(query);

        if (!data.success || !data.location) {
          updateStatus(`<span class="flex items-center gap-1 text-red-500"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i> Could not find "${query}". Check spelling.</span>`);
          return;
        }

        // Confirm with user
        const loc = data.location;
        const result = await Ui.alert(
          'question',
          'Location Found',
          `📍 ${loc.label || loc.city}. Is this correct?`,
          true,
          true,
        );

        if (result && result.isConfirmed) {
          _pendingLocation = {
            lat: loc.lat,
            lng: loc.lng,
            city: loc.city || loc.label,
            source: 'manual',
            accuracy: 'medium',
          };
          if (latitudeInput)  latitudeInput.value = loc.lat;
          if (longitudeInput) longitudeInput.value = loc.lng;
          
          if (locationLabelInput) {
            locationLabelInput.value = loc.city || loc.label;
            locationLabelInput.disabled = false;
            locationLabelInput.classList.remove("bg-slate-100", "text-slate-400", "cursor-not-allowed");
          }
          if (locationStatus) locationStatus.textContent = `Location saved: ${loc.city || loc.label}`;
          Ui.toast('success', 'Location Saved', `✅ ${loc.city || loc.label}`);
          updateStatus('<span class="flex items-center gap-1 text-green-600"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Location confirmed.</span>');
        } else {
          updateStatus('<span class="flex items-center gap-1 text-amber-600"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Please try a different search term.</span>');
          manualInput.value = '';
          manualInput.focus();
        }
      } catch (err) {
        updateStatus('<span class="flex items-center gap-1 text-red-500"><i data-lucide="wifi-off" class="w-3.5 h-3.5"></i> Search failed. Check your internet.</span>');
      }
    }, 1500);
  });
}

/**
 * Apply a resolved location result to the signup form hidden fields.
 */
function applyLocationResult(locationResult) {
  if (!locationResult || !locationResult.success || !locationResult.location) return;

  const loc = locationResult.location;
  _pendingLocation = loc;

  if (latitudeInput)  latitudeInput.value  = loc.lat;
  if (longitudeInput) longitudeInput.value = loc.lng;
  if (locationLabelInput && !locationLabelInput.value.trim()) {
    locationLabelInput.value = loc.city || 'My location';
  }
  if (locationStatus) {
    const sourceNote = loc.source === 'ip' ? ' (approximate)' : '';
    locationStatus.textContent = `Location captured: ${loc.city}${sourceNote}. Feel free to rename it if needed.`;
  }
}

/**
 * Handle the "Allow Location" choice from the primer modal.
 * Calls the master getLocation() function which handles GPS → IP fallback.
 */
async function handleAllowLocation() {
  const spinner = document.getElementById("signup-location-spinner");
  const icon = document.getElementById("signup-location-icon");

  if (locationStatus) locationStatus.textContent = 'Detecting your location...';
  
  if (spinner) spinner.classList.remove('hidden');
  if (icon) icon.classList.add('hidden');

  const result = await EdelModules.location.getLocation();

  if (spinner) spinner.classList.add('hidden');
  if (icon) icon.classList.remove('hidden');

  if (result.success) {
    applyLocationResult(result);

    // If the result came from IP, ask the user to confirm it's correct
    if (result.location.source === 'ip') {
      const confirmed = await Ui.alert(
        'question',
        'Location Approximated',
        `📍 We detected your area as: ${result.location.city}. Is this correct?`,
        true,
        true,
      );
      if (!confirmed || !confirmed.isConfirmed) {
        // User said no — clear and show manual input
        _pendingLocation = null;
        if (latitudeInput)  latitudeInput.value  = '';
        if (longitudeInput) longitudeInput.value = '';
        if (locationLabelInput) locationLabelInput.value = '';
        if (locationStatus) locationStatus.textContent = '';
        initManualLocationInput();
      }
    }
  } else {
    // All automated methods failed — show manual input
    initManualLocationInput();
  }
}

/**
 * Main signup location flow.
 * Calls handleAllowLocation() which uses the master getLocation() flow.
 */
async function captureSignupLocation() {
  if (!locationButton && !locationStatus) return;
  await handleAllowLocation();
}


// ─── View Helpers ──────────────────────────────────────────────────────────

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
  if (faceCaptureView) {
    faceCaptureView.classList.add("hidden");
    faceCaptureView.classList.remove("fade-enter-active", "flex");
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

// â”€â”€â”€ Event Listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

const urlParams = new URLSearchParams(window.location.search);
const refParam = urlParams.get("ref") || urlParams.get("referral") || urlParams.get("referralCode");
if (refParam) {
  sessionStorage.setItem("edel_ref_code", refParam);
  const handleRefView = () => {
    switchAuthView("signup");
    const banner = document.getElementById("signup-referral-banner");
    const codeBadge = document.getElementById("referral-code-badge");
    if (banner) banner.classList.remove("hidden");
    if (codeBadge) codeBadge.textContent = refParam.toUpperCase();
    Edel.initIcons();
  };
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', handleRefView);
  } else {
    handleRefView();
  }
}

const tabParam = urlParams.get("tab");
if (tabParam === "signup") {
  window.addEventListener('load', () => switchAuthView("signup"));
} else if (tabParam === "login") {
  window.addEventListener('load', () => switchAuthView("login"));
}

window.addEventListener("edel:account-choice-required", (event) => {
  promptForAccountChoice(event.detail);
});

window.addEventListener("edel:verification-required", (event) => {
  const detail = event.detail || {};
  // Always go directly to email verification (face capture is now a post-login action only)
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

// (Location is now strictly triggered only by the button click)

window.switchAuthView = (view) => authPage.activateView(view);
window.updateRoleUI = () => authPage.updateRoleUI();
window.handleAuth = (event, type) => authPage.handleSubmit(event, type);
