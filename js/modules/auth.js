window.EdelModules = window.EdelModules || {};

window.EdelModules.auth = {
  getUser() {
    const raw = localStorage.getItem("edel_user");

    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem("edel_user", JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem("edel_user");
  },

  getToken() {
    return localStorage.getItem("edel_token");
  },

  setToken(token) {
    localStorage.setItem("edel_token", token);
  },

  clearToken() {
    localStorage.removeItem("edel_token");
  },

  parseJwt(token) {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch (e) {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  saveSession(payload) {
    if (payload?.token) {
      this.setToken(payload.token);
    }

    this.setUser({
      id: payload?.id,
      fullName: payload?.fullName,
      email: payload?.email,
      phoneNumber: payload?.phoneNumber,
      locationLabel: payload?.locationLabel,
      latitude: payload?.latitude,
      longitude: payload?.longitude,
      role: payload?.role,
      serviceCategory: payload?.serviceCategory,
      serviceTitle: payload?.serviceTitle,
      basePrice: payload?.basePrice,
      serviceDescription: payload?.serviceDescription,
    });
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  getRedirectPath(role) {
    if (role === "admin") return "/admin/";
    return "/profile/";
  },

  redirectAfterLogin(role) {
    window.location.href = this.getRedirectPath(role);
  },

  requireAuth() {
    if (this.isLoggedIn()) return true;

    window.location.href = "/auth/";
    return false;
  },

  logout() {
    this.clearToken();
    this.clearUser();
    window.location.href = "/auth/";
  },

  async login(credentials) {
    const response = await EdelModules.api.post("/api/auth/login", credentials);
    this.saveSession(response);
    return response;
  },

  async signup(payload) {
    const response = await EdelModules.api.post("/api/auth/signup", payload);
    this.saveSession(response);
    return response;
  },

  async fetchDashboard() {
    return EdelModules.api.get("/api/dashboard", {
      headers: this.getAuthHeaders(),
    });
  },

  initInteractiveEffects() {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!prefersReduced) {
      document.querySelectorAll("button").forEach((btn) => {
        if (btn.__rippleBound) return;
        btn.__rippleBound = true;
        btn.classList.add("ripple");
        btn.addEventListener("click", function (e) {
          const rect = this.getBoundingClientRect();
          const diameter = Math.max(rect.width, rect.height);
          const ripple = document.createElement("span");
          ripple.className = "ripple-effect";
          ripple.style.width = ripple.style.height = `${diameter}px`;
          ripple.style.left = `${e.clientX - rect.left - diameter / 2}px`;
          ripple.style.top = `${e.clientY - rect.top - diameter / 2}px`;
          this.appendChild(ripple);
          window.setTimeout(() => ripple.remove(), 700);
        });
      });

      const tiltRoot = document.querySelector(".tilt-container");
      if (tiltRoot) {
        const maxRotateX = 6;
        const maxRotateY = 10;

        tiltRoot.addEventListener("mousemove", (e) => {
          const rect = tiltRoot.getBoundingClientRect();
          const percentX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const percentY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
          const rotateY = percentX * maxRotateY;
          const rotateX = -percentY * maxRotateX;

          tiltRoot.style.transform =
            `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
        });

        tiltRoot.addEventListener("mouseleave", () => {
          tiltRoot.style.transform = "";
        });
      }

      document.querySelectorAll(".fade-enter").forEach((block, index) => {
        block.style.transitionDelay = `${index * 60}ms`;
      });
    }
  },

  createPageController() {
    const loginView = document.getElementById("view-login");
    const signupView = document.getElementById("view-signup");
    const btnLogin = document.getElementById("btn-toggle-login");
    const btnSignup = document.getElementById("btn-toggle-signup");
    const step1 = document.getElementById("signup-step-1");
    const step2 = document.getElementById("signup-step-2");
    const btnNext = document.getElementById("btn-next");
    const btnSubmit = document.getElementById("btn-submit");
    const authModule = this;

    const loginBtnClass =
      "px-5 py-2 rounded-lg bg-white text-brand-navy font-bold text-sm shadow-sm transition-all";
    const signupBtnClass =
      "px-5 py-2 rounded-lg text-slate-500 font-medium text-sm hover:text-brand-navy transition-all";

    const providerNextClass =
      "hidden w-full bg-brand-navy text-brand-accent hover:bg-brand-blue font-bold text-lg py-4 rounded-xl shadow-lg transition-all active:scale-95 items-center justify-center gap-2 mt-6";
    const providerSubmitClass =
      "w-full flex bg-brand-navy text-brand-accent hover:bg-brand-blue font-bold text-lg py-4 rounded-xl shadow-lg transition-all active:scale-95 justify-center items-center gap-2 mt-6";

    const getStep2Inputs = () =>
      document.querySelectorAll(
        "#signup-step-2 select, #signup-step-2 input, #signup-step-2 textarea",
      );

    const activateView = (view) => {
      loginView.classList.remove("fade-enter-active");
      signupView.classList.remove("fade-enter-active");

      window.setTimeout(() => {
        const showLogin = view === "login";
        const visibleView = showLogin ? loginView : signupView;
        const hiddenView = showLogin ? signupView : loginView;

        hiddenView.classList.add("hidden");
        visibleView.classList.remove("hidden");
        void visibleView.offsetWidth;
        visibleView.classList.add("fade-enter-active");

        if (btnLogin && btnSignup) {
          btnLogin.className = showLogin ? loginBtnClass : signupBtnClass;
          btnSignup.className = showLogin ? signupBtnClass : loginBtnClass;
        }
      }, 50);
    };

    const updateRoleUI = () => {
      const selectedRole =
        document.querySelector('input[name="user_role"]:checked')?.value ||
        "customer";

      if (selectedRole === "provider") {
        btnNext.classList.remove("hidden");
        btnNext.classList.add("flex");
        btnSubmit.classList.add("hidden");
        btnSubmit.classList.remove("flex");
        getStep2Inputs().forEach((input) => input.removeAttribute("required"));
        return;
      }

      btnNext.className = providerNextClass;
      btnSubmit.className = providerSubmitClass;
      step1.classList.remove("hidden");
      step2.classList.add("hidden");
      step1.classList.add("fade-enter-active");
      getStep2Inputs().forEach((input) => input.removeAttribute("required"));
    };

    const goToStep = (step) => {
      const step2Inputs = getStep2Inputs();

      if (step === 2) {
        const step1Inputs = step1.querySelectorAll("input[required]");
        let isValid = true;

        step1Inputs.forEach((input) => {
          if (input.checkValidity()) return;
          input.reportValidity();
          isValid = false;
        });

        if (!isValid) return;

        step1.classList.add("hidden");
        step1.classList.remove("fade-enter-active");
        step2.classList.remove("hidden");
        void step2.offsetWidth;
        step2.classList.add("fade-enter-active");
        btnNext.classList.add("hidden");
        btnNext.classList.remove("flex");
        btnSubmit.classList.remove("hidden");
        btnSubmit.classList.add("flex");
        step2Inputs.forEach((input) => input.setAttribute("required", "true"));
        Edel.initIcons();
        return;
      }

      step2.classList.add("hidden");
      step2.classList.remove("fade-enter-active");
      step1.classList.remove("hidden");
      void step1.offsetWidth;
      step1.classList.add("fade-enter-active");
      btnNext.classList.remove("hidden");
      btnNext.classList.add("flex");
      btnSubmit.classList.add("hidden");
      btnSubmit.classList.remove("flex");
      step2Inputs.forEach((input) => input.removeAttribute("required"));
      Edel.initIcons();
    };

    const setSubmittingState = (button, submitting, loadingText) => {
      if (!button) return;

      if (!button.dataset.originalText) {
        button.dataset.originalText = button.innerHTML;
      }

      if (submitting) {
        button.disabled = true;
        button.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> ${loadingText}`;
        button.classList.add("opacity-80", "cursor-not-allowed");
        Edel.initIcons();
        return;
      }

      button.disabled = false;
      button.innerHTML = button.dataset.originalText;
      button.classList.remove("opacity-80", "cursor-not-allowed");
      Edel.initIcons();
    };

    const buildLoginPayload = (form) => ({
      email: form.querySelector('[name="login_email"]')?.value.trim(),
      password: form.querySelector('[name="login_password"]')?.value,
    });

    const buildSignupPayload = (form) => {
      const role =
        form.querySelector('input[name="user_role"]:checked')?.value ||
        "customer";
      const latitudeValue = form.querySelector('[name="signup_latitude"]')?.value;
      const longitudeValue = form.querySelector('[name="signup_longitude"]')?.value;

      return {
        fullName: form.querySelector('[name="signup_full_name"]')?.value.trim(),
        email: form.querySelector('[name="signup_email"]')?.value.trim(),
        phoneNumber: form.querySelector('[name="signup_phone"]')?.value.trim(),
        locationLabel: form.querySelector('[name="signup_location_label"]')?.value.trim(),
        latitude: latitudeValue === "" ? null : Number(latitudeValue),
        longitude: longitudeValue === "" ? null : Number(longitudeValue),
        password: form.querySelector('[name="signup_password"]')?.value,
        role,
        serviceCategory:
          role === "provider"
            ? form.querySelector('[name="provider_service_category"]')?.value
            : null,
        serviceTitle:
          role === "provider"
            ? form.querySelector('[name="provider_service_title"]')?.value.trim()
            : null,
        basePrice:
          role === "provider"
            ? Number(form.querySelector('[name="provider_base_price"]')?.value)
            : null,
        serviceDescription:
          role === "provider"
            ? form
                .querySelector('[name="provider_service_description"]')
                ?.value.trim()
            : null,
      };
    };

    const handleSubmit = async (event, type) => {
      event.preventDefault();
      const form = event.target;
      const button = form.querySelector('button[type="submit"]');
      const loadingText =
        type === "login" ? "Signing In..." : "Creating Account...";

      setSubmittingState(button, true, loadingText);

      try {
        const response =
          type === "login"
            ? await authModule.login(buildLoginPayload(form))
            : await authModule.signup(buildSignupPayload(form));

        setSubmittingState(button, false);

        // Mark post-auth events so the destination page can show notifications
        try {
          if (type === "login") {
            localStorage.setItem("edel_just_logged_in", "true");
          } else {
            localStorage.setItem("edel_just_signed_up", "true");
          }
        } catch (e) {
          console.warn("Could not set post-auth flag:", e);
        }

        // For signup show a quick toast here; login will show an alert on profile load
        if (type === "signup") {
          Ui.toast(
            "success",
            "Signup Successful",
            `Welcome ${response.fullName || "to Edel"}! Redirecting...`,
          );
        }

        window.setTimeout(() => {
          authModule.redirectAfterLogin(response.role);
        }, 1200);
      } catch (error) {
        setSubmittingState(button, false);
        Ui.alert(
          "error",
          type === "login" ? "Access Denied" : "Signup Failed",
          error.message || "Authentication request failed.",
        );
      }
    };

    return {
      activateView,
      updateRoleUI,
      goToStep,
      handleSubmit,
    };
  },
};
