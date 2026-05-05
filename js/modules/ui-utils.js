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
      if (typeof CoolAlert === "undefined") {
        console.warn("CoolAlert.js not loaded. Falling back to browser alert.");
        alert(`${title}: ${message}`);
        return Promise.resolve({ isConfirmed: true });
      }

      return CoolAlert.show({
        icon,
        title,
        text: message,
        showConfirmButton: confirm,
        showCancelButton: cancel,
        confirmButtonColor: "#FACC15",
        cancelButtonColor: "#1B3358",
      });
    } catch (e) {
      console.error("Alert error:", e);
      return Promise.resolve({ isConfirmed: true });
    }
  },

  /**
   * Lightweight Toast Notification
   */
  toast(icon = "success", title = "", message = "") {
    if (typeof CoolAlert === "undefined") {
      console.info("Toast (fallback):", title, message);
      return;
    }

    CoolAlert.show({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      icon,
      title,
      text: message,
    });
  },
};

// Global shorthand
window.Ui = window.EdelModules.uiUtils;
