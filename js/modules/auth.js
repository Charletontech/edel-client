window.EdelModules = window.EdelModules || {};

window.EdelModules.auth = {
  getUser() {
    const raw = localStorage.getItem("edel_user");

    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("User Parse Error:", e);
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem("edel_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("edel_user");
    }
  },

  getAuthHeaders() {
    const user = this.getUser();
    return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
  },

  isLoggedIn() {
    const user = this.getUser();
    return !!(user && user.token);
  },

  redirectAfterLogin(role) {
    if (role === "admin") {
      window.location.href = "/admin/";
    } else {
      window.location.href = "/discovery/";
    }
  },

  requireAuth() {
    const user = this.getUser();
    if (!user || !user.token) {
      window.location.href = "/auth/";
      return false;
    }

    // Redirect admins away from customer/provider pages
    if (user.role === "admin" && !window.location.pathname.includes("/admin/")) {
      window.location.href = "/admin/";
      return false;
    }

    return true;
  },

  logout() {
    this.setUser(null);
    window.location.href = "/auth/";
  },

  async fetchDashboard() {
    return EdelModules.api.get("/api/dashboard", {
      headers: this.getAuthHeaders(),
      silent: true,
    });
  },

  initInteractiveEffects() {
    // Scroll progress indicator
    const progress = document.createElement("div");
    progress.className =
      "fixed top-0 left-0 h-1 bg-brand-accent z-50 transition-all duration-300";
    progress.style.width = "0%";
    document.body.appendChild(progress);

    window.addEventListener("scroll", () => {
      const winScroll =
        document.body.scrollTop || document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      progress.style.width = scrolled + "%";
    });
  },

  createPageController() {
    const state = {
      role: "customer",
      step: 1,
      providerData: {
        category: "",
        title: "",
        price: "",
        description: "",
      },
    };

    const activateView = (view) => {
      const loginView = document.getElementById("view-login");
      const signupView = document.getElementById("view-signup");
      const toggleLogin = document.getElementById("btn-toggle-login");
      const toggleSignup = document.getElementById("btn-toggle-signup");

      if (view === "login") {
        loginView.classList.remove("hidden");
        loginView.classList.add("fade-enter-active");
        signupView.classList.add("hidden");
        signupView.classList.remove("fade-enter-active");
        
        // Update toggle buttons if they exist
        if (toggleLogin && toggleSignup) {
          toggleLogin.classList.add("bg-white", "text-brand-navy", "font-bold", "shadow-sm");
          toggleLogin.classList.remove("text-slate-500", "font-medium");
          toggleSignup.classList.remove("bg-white", "text-brand-navy", "font-bold", "shadow-sm");
          toggleSignup.classList.add("text-slate-500", "font-medium");
        }
      } else {
        signupView.classList.remove("hidden");
        signupView.classList.add("fade-enter-active");
        loginView.classList.add("hidden");
        loginView.classList.remove("fade-enter-active");

        // Update toggle buttons if they exist
        if (toggleLogin && toggleSignup) {
          toggleSignup.classList.add("bg-white", "text-brand-navy", "font-bold", "shadow-sm");
          toggleSignup.classList.remove("text-slate-500", "font-medium");
          toggleLogin.classList.remove("bg-white", "text-brand-navy", "font-bold", "shadow-sm");
          toggleLogin.classList.add("text-slate-500", "font-medium");
        }
      }
      Edel.initIcons();
    };

    const updateRoleUI = () => {
      const roleInput = document.querySelector('input[name="user_role"]:checked');
      state.role = roleInput ? roleInput.value : "customer";

      const btnNext = document.getElementById("btn-next");
      const btnSubmit = document.getElementById("btn-submit");

      if (state.role === "provider") {
        if (state.step === 1) {
          btnNext?.classList.remove("hidden");
          btnNext?.classList.add("flex");
          btnSubmit?.classList.add("hidden");
          btnSubmit?.classList.remove("flex");
        }
      } else {
        btnNext?.classList.add("hidden");
        btnNext?.classList.remove("flex");
        btnSubmit?.classList.remove("hidden");
        btnSubmit?.classList.add("flex");
      }
    };

    const goToStep = (step) => {
      const step1 = document.getElementById("signup-step-1");
      const step2 = document.getElementById("signup-step-2");
      const btnNext = document.getElementById("btn-next");
      const btnSubmit = document.getElementById("btn-submit");

      if (step === 2) {
        step1.classList.add("hidden");
        step1.classList.remove("fade-enter-active");
        step2.classList.remove("hidden");
        step2.classList.add("fade-enter-active");
        
        btnNext?.classList.add("hidden");
        btnNext?.classList.remove("flex");
        btnSubmit?.classList.remove("hidden");
        btnSubmit?.classList.add("flex");
      } else {
        step2.classList.add("hidden");
        step2.classList.remove("fade-enter-active");
        step1.classList.remove("hidden");
        step1.classList.add("fade-enter-active");

        if (state.role === "provider") {
          btnNext?.classList.remove("hidden");
          btnNext?.classList.add("flex");
          btnSubmit?.classList.add("hidden");
          btnSubmit?.classList.remove("flex");
        }
      }
      state.step = step;
      window.scrollTo(0, 0);
      Edel.initIcons();
    };

    const handleSubmit = async (event, type) => {
      event.preventDefault();
      const form = event.target;
      const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('#btn-submit');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Processing...';
        Edel.initIcons();
      }

      try {
        if (type === "signup") {
          const rawFormData = new FormData(form);
          const formData = new FormData();
          
          formData.append("role", state.role);
          formData.append("fullName", rawFormData.get("signup_full_name"));
          formData.append("email", rawFormData.get("signup_email"));
          formData.append("password", rawFormData.get("signup_password"));
          formData.append("phoneNumber", rawFormData.get("signup_phone"));
          formData.append("locationLabel", rawFormData.get("signup_location_label"));
          formData.append("latitude", rawFormData.get("signup_latitude"));
          formData.append("longitude", rawFormData.get("signup_longitude"));

          const photoFile = rawFormData.get("profilePhoto");
          if (photoFile && photoFile.size > 0) {
            formData.append("profilePhoto", photoFile);
          }
          
          if (state.role === "provider") {
            formData.append("serviceCategory", rawFormData.get("provider_service_category"));
            formData.append("serviceTitle", rawFormData.get("provider_service_title"));
            formData.append("basePrice", rawFormData.get("provider_base_price"));
            formData.append("serviceDescription", rawFormData.get("provider_service_description"));
          }

          const response = await EdelModules.api.post("/api/auth/signup", formData, {
            silent: true,
          });
          handleAuthSuccess(response);
        } else {
          const rawFormData = new FormData(form);
          const data = {
            email: rawFormData.get("login_email"),
            password: rawFormData.get("login_password")
          };
          const response = await EdelModules.api.post("/api/auth/login", data, {
            silent: true,
          });
          handleAuthSuccess(response);
        }
      } catch (error) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
          Edel.initIcons();
        }

        const message = error.message || "Request failed";

        if (/suspended/i.test(message)) {
          Ui.alert(
            "error",
            "Account Suspended",
            message,
            true,
            false,
          );
          return;
        }

        if (type === "signup" && /already exists/i.test(message)) {
          Ui.alert(
            "warning",
            "Email Already Exists",
            "An account with this email already exists. Sign in instead or use another email.",
            true,
            false,
          );
          return;
        }

        Ui.toast(
          "error",
          type === "login" ? "Login Failed" : "Signup Failed",
          message,
        );
      }
    };

    const handleAuthSuccess = (user) => {
      EdelModules.auth.setUser(user);
      localStorage.setItem("edel_just_logged_in", "true");
      EdelModules.auth.redirectAfterLogin(user?.role);
    };

    return {
      activateView,
      updateRoleUI,
      goToStep,
      handleSubmit,
    };
  },
};
