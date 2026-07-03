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

  getSessionRole(user = this.getUser()) {
    if (!user) return null;

    if (user.role === "both") {
      return user.activeRole || null;
    }

    return user.role || null;
  },

  getRoleLabel(user = this.getUser()) {
    const sessionRole = this.getSessionRole(user);
    const role = sessionRole || user?.role;

    if (role === "provider") return "Provider Account";
    if (role === "admin") return "Admin";
    if (role === "customer") return "Customer Account";
    if (user?.role === "both") return "Choose Account";
    return "Customer Account";
  },

  setSessionRole(role) {
    const user = this.getUser();
    if (!user) return null;

    if (user.role !== "both") {
      return user;
    }

    if (!["customer", "provider"].includes(role)) {
      return user;
    }

    user.activeRole = role;
    this.setUser(user);
    return user;
  },

  clearSessionRole() {
    const user = this.getUser();
    if (!user || !user.activeRole) return user;

    delete user.activeRole;
    this.setUser(user);
    return user;
  },

  getAuthHeaders() {
    const user = this.getUser();
    const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
    const sessionRole = this.getSessionRole(user);

    if (sessionRole) {
      headers["X-Edel-Session-Role"] = sessionRole;
    }

    return headers;
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

    if (user.emailVerified === false && !window.location.pathname.includes("/auth/")) {
      this.logout();
      return false;
    }

    if (user.role === "both" && !this.getSessionRole(user) && !window.location.pathname.includes("/auth/")) {
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
    };

    const activateView = (view) => {
      const loginView = document.getElementById("view-login");
      const signupView = document.getElementById("view-signup");
      const accountChoiceView = document.getElementById("view-account-choice");
      const verificationView = document.getElementById("view-email-verification");
      const faceCaptureView = document.getElementById("view-face-capture");
      const toggleLogin = document.getElementById("btn-toggle-login");
      const toggleSignup = document.getElementById("btn-toggle-signup");

      if (view === "login") {
        loginView.classList.remove("hidden");
        loginView.classList.add("fade-enter-active");
        signupView.classList.add("hidden");
        signupView.classList.remove("fade-enter-active");
        accountChoiceView?.classList.add("hidden");
        accountChoiceView?.classList.remove("fade-enter-active", "flex");
        verificationView?.classList.add("hidden");
        verificationView?.classList.remove("fade-enter-active", "flex");
        faceCaptureView?.classList.add("hidden");
        faceCaptureView?.classList.remove("fade-enter-active");
        
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
        accountChoiceView?.classList.add("hidden");
        accountChoiceView?.classList.remove("fade-enter-active", "flex");
        verificationView?.classList.add("hidden");
        verificationView?.classList.remove("fade-enter-active", "flex");
        faceCaptureView?.classList.add("hidden");
        faceCaptureView?.classList.remove("fade-enter-active");

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
      const btnSubmit = document.getElementById("btn-submit");
      const roleInput = document.querySelector('input[name="user_role"]:checked');
      state.role = roleInput ? roleInput.value : "customer";
      btnSubmit?.classList.remove("hidden");
      btnSubmit?.classList.add("flex");
    };

    const goToStep = (step) => {
      window.scrollTo(0, 0);
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

          const response = await EdelModules.api.post("/api/auth/signup", formData, {
            silent: true,
          });
          if (response?.requiresVerification) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnHtml;
              Edel.initIcons();
            }
            window.dispatchEvent(
              new CustomEvent("edel:verification-required", {
                detail: { email: response.email, message: response.message, type: 'signup' },
              }),
            );
            return;
          }
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
          const requiresRoleChoice = handleAuthSuccess(response);
          if (requiresRoleChoice) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnHtml;
              Edel.initIcons();
            }
            return;
          }
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

        if (type === "login") {
          if (error.data?.code === "EMAIL_NOT_VERIFIED" || error.data?.requiresVerification) {
            window.dispatchEvent(
              new CustomEvent("edel:verification-required", {
                detail: {
                  email: error.data?.email,
                  message: error.data?.message || error.message,
                  type: "login"
                },
              }),
            );
            return;
          }

          Ui.alert(
            "error",
            "Login Failed",
            message === "Unauthorized" || message === "Request failed" 
              ? "Invalid email or password. Please try again." 
              : message,
            true,
            false,
          );
        } else {
          Ui.toast(
            "error",
            "Signup Failed",
            message,
          );
        }
      }
    };

    const handleAuthSuccess = (user) => {
      localStorage.setItem("edel_just_logged_in", "true");

      if (user?.role === "both") {
        EdelModules.auth.setUser({ ...user, activeRole: null });
        window.dispatchEvent(
          new CustomEvent("edel:account-choice-required", {
            detail: user,
          }),
        );
        return true;
      }

      EdelModules.auth.setUser(user);
      EdelModules.auth.redirectAfterLogin(user?.role);
      return false;
    };

    return {
      activateView,
      updateRoleUI,
      handleSubmit,
    };
  },
};
