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
   * Persistent Inline Banner
   * Injects a dismissible info/warning banner into a given container element.
   * @param {string} type - 'info' | 'warning' | 'error' | 'success'
   * @param {string} message - Banner message text
   * @param {HTMLElement|string} container - DOM element or CSS selector to inject into
   * @param {object} options - { dismissible: true, actionLabel, onAction }
   * @returns {HTMLElement} the banner element
   */
  banner(type = 'info', message = '', container = null, options = {}) {
    const target = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    if (!target) return null;

    const colorMap = {
      info:    { bg: '#f0f7ff', border: '#2196f3', text: '#1565c0', icon: 'ℹ️' },
      warning: { bg: '#fff8e1', border: '#ff9800', text: '#e65100', icon: '⚠️' },
      error:   { bg: '#fff0f0', border: '#f44336', text: '#b71c1c', icon: '❌' },
      success: { bg: '#f0fff4', border: '#4caf50', text: '#1b5e20', icon: '✅' },
    };
    const c = colorMap[type] || colorMap.info;
    const id = `edel-banner-${Date.now()}`;

    const actionHtml = options.actionLabel
      ? `<button id="${id}-action" style="margin-left:12px;font-weight:700;text-decoration:underline;background:none;border:none;cursor:pointer;color:${c.text};padding:0;">${options.actionLabel}</button>`
      : '';
    const dismissHtml = options.dismissible !== false
      ? `<button id="${id}-close" aria-label="Dismiss" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:18px;color:${c.text};padding:0 4px;line-height:1;">&times;</button>`
      : '';

    const el = document.createElement('div');
    el.id = id;
    el.setAttribute('role', 'status');
    el.style.cssText = `
      display:flex;align-items:center;gap:10px;padding:12px 16px;margin:10px 0;
      border-radius:8px;font-size:14px;line-height:1.4;
      background:${c.bg};border-left:4px solid ${c.border};color:${c.text};
    `;
    el.innerHTML = `<span>${c.icon}</span><span style="flex:1">${message}</span>${actionHtml}${dismissHtml}`;
    target.prepend(el);

    const closeBtn = el.querySelector(`#${id}-close`);
    if (closeBtn) closeBtn.addEventListener('click', () => el.remove());

    const actionBtn = el.querySelector(`#${id}-action`);
    if (actionBtn && typeof options.onAction === 'function') {
      actionBtn.addEventListener('click', () => options.onAction(el));
    }

    return el;
  },

  /**
   * Location Permission Primer Modal
   * Shows an educational modal BEFORE the browser location prompt fires,
   * so users understand WHY the permission is being requested.
   *
   * @param {object} callbacks - { onAllow, onManual, onSkip }
   * @returns Promise — resolves when user makes a choice
   */
  async locationPrimerModal({ onAllow, onManual, onSkip } = {}) {
    const alertLib = typeof CoolAlert !== 'undefined' ? CoolAlert
      : (typeof coolalert !== 'undefined' ? coolalert : null);

    if (alertLib && typeof alertLib.show === 'function') {
      const result = await alertLib.show({
        icon: 'info',
        title: '📍 Location helps us connect you',
        html: `
          <p style="text-align:left;font-size:14px;color:#ccc;line-height:1.6;margin:0">
            To show you relevant providers near you, we need to know your general area.
            Your precise location is only used to find nearby services and is
            <strong style="color:#fbbf24">never shared</strong> with others.
          </p>
          <p style="text-align:left;font-size:13px;color:#999;margin-top:10px;">
            You can also type your city manually if you prefer.
          </p>
        `,
        showConfirmButton: true,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Allow Location',
        cancelButtonText: 'Enter Manually',
        denyButtonText: 'Skip for now',
        confirmButtonColor: '#fbbf24',
        cancelButtonColor: '#1B3358',
        denyButtonColor: '#64748b',
        background: '#2D1157',
        color: '#ffffff',
        allowOutsideClick: false,
      });

      if (result.isConfirmed && typeof onAllow === 'function') return onAllow();
      if (result.isDismissed && typeof onManual === 'function') return onManual();
      if (result.isDenied && typeof onSkip === 'function') return onSkip();
      return;
    }

    // Fallback: if CoolAlert not available, go straight to allow flow
    if (typeof onAllow === 'function') onAllow();
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
