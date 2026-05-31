window.EdelModules = window.EdelModules || {};

window.EdelModules.uiUtils = {
  /**
   * Enhanced Alert System using CoolAlert.js
   * @param {string} icon - 'success' | 'error' | 'warning' | 'info' | 'question'
   * @param {string} title - Alert heading
   * @param {string} message - Alert body text
   * @param {boolean} showConfirmButton - Toggle confirm button
   * @param {boolean} showCancelButton - Toggle cancel button
   */
  alert(
    icon = "success",
    title = "",
    message = "",
    showConfirmButton = null,
    showCancelButton = null,
  ) {
    const isAction = icon === "question" || icon === "warning";
    const confirm =
      typeof showConfirmButton === "boolean" ? showConfirmButton : isAction;
    const cancel =
      typeof showCancelButton === "boolean" ? showCancelButton : isAction;

    try {
      const alertLib = typeof CoolAlert !== "undefined" ? CoolAlert : (typeof coolalert !== "undefined" ? coolalert : undefined);

      if (typeof alertLib === "undefined") {
        console.warn("CoolAlert.js not loaded. Falling back to browser alert.");
        alert(`${title}: ${message}`);
        return Promise.resolve({ isConfirmed: true });
      }

      // Handle different CoolAlert API versions
      if (typeof alertLib.show === "function") {
        return alertLib.show({
          icon,
          title,
          text: message,
          showConfirmButton: confirm,
          showCancelButton: cancel,
          confirmButtonColor: "#fbbf24",
          cancelButtonColor: "#1B3358",
          background: "#2D1157",
          color: "#ffffff",
        });
      } else if (typeof alertLib.alert === "function") {
        return alertLib.alert({
          type: icon === "error" ? "error" : (icon === "warning" ? "warning" : (icon === "success" ? "success" : "info")),
          title,
          text: message,
          background: "#2D1157",
          color: "#ffffff",
        });
      } else {
        // Direct call if alertLib is a function itself (unlikely but safe)
        if (typeof alertLib === "function") {
            alertLib({ type: icon, title, text: message });
            return Promise.resolve({ isConfirmed: true });
        }
        alert(`${title}: ${message}`);
        return Promise.resolve({ isConfirmed: true });
      }
    } catch (e) {
      console.error("Alert error:", e);
      alert(`${title}: ${message}`);
      return Promise.resolve({ isConfirmed: true });
    }
  },

  /**
   * Lightweight Toast Notification
   */
  toast(icon = "success", title = "", message = "", options = {}) {
    const alertLib = typeof CoolAlert !== "undefined" ? CoolAlert : (typeof coolalert !== "undefined" ? coolalert : undefined);
    const timer = Number(options?.timer) > 0 ? Number(options.timer) : 3000;

    if (typeof alertLib === "undefined") {
      console.info("Toast (fallback):", title, message);
      // For errors, fallback to alert if toast is not available
      if (icon === "error") alert(`${title}: ${message}`);
      return;
    }

    try {
      if (typeof alertLib.show === "function") {
        alertLib.show({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer,
          timerProgressBar: true,
          icon,
          title,
          text: message,
          background: "#2D1157",
          color: "#ffffff",
        });
      } else {
        // Fallback to regular alert if toast is not supported by this version
        this.alert(icon, title, message);
      }
    } catch (e) {
      console.error("Toast error:", e);
      if (icon === "error") alert(`${title}: ${message}`);
    }
  },

  /**
   * Initialize password visibility toggles for inputs with an eye icon.
   * Finds buttons inside `.input-focus-lift` that contain an <i data-lucide="eye"> icon
   * and toggles the associated input between `password` and `text` on click.
   */
  initPasswordToggles() {
    try {
      const groups = document.querySelectorAll('.input-focus-lift');
      groups.forEach((group) => {
        const btn = group.querySelector('button');
        const icon = btn && btn.querySelector('[data-lucide="eye"], [data-lucide="eye-off"]');
        const input = group.querySelector('input[type="password"], input');
        if (!btn || !icon || !input || btn.__passwordToggleBound) return;

        btn.__passwordToggleBound = true;

        // Ensure button has accessible attributes
        btn.setAttribute('type', btn.getAttribute('type') || 'button');
        btn.setAttribute('aria-pressed', 'false');
        btn.title = btn.title || 'Show password';

        btn.addEventListener('click', () => {
          const isHidden = input.type === 'password';
          input.type = isHidden ? 'text' : 'password';
          btn.setAttribute('aria-pressed', String(isHidden));
          btn.title = isHidden ? 'Hide password' : 'Show password';

          // Swap icon between eye and eye-off
          const currentIcon = btn.querySelector('[data-lucide="eye"], [data-lucide="eye-off"]');
          if (currentIcon) {
            currentIcon.setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
          }

          if (window.Edel && typeof Edel.initIcons === 'function') {
            Edel.initIcons();
          }
        });
      });
    } catch (e) {
      // fail silently
      console.error('initPasswordToggles error', e);
    }
  },
};

// Global shorthand
window.Ui = window.EdelModules.uiUtils;
