window.EdelModules = window.EdelModules || {};

window.EdelModules.ui = {
  toggleHidden(element, force) {
    if (!element) return;

    if (typeof force === "boolean") {
      element.classList.toggle("hidden", force);
      return;
    }

    element.classList.toggle("hidden");
  },

  showOnly(elements, activeElement, visibleClass = "block", hiddenClass = "hidden") {
    elements.forEach((element) => {
      if (!element) return;

      if (element === activeElement) {
        element.classList.remove(hiddenClass);
        element.classList.add(visibleClass);
        return;
      }

      element.classList.remove(visibleClass);
      element.classList.add(hiddenClass);
    });
  },

  setClassName(element, className) {
    if (!element) return;
    element.className = className;
  },

  createOverlayModal({
    overlay,
    defaultPanelClass = "flex",
    overlayOpenDelay = 10,
  }) {
    let currentPanel = null;

    const closeCurrentPanel = () => {
      if (!currentPanel) return;
      currentPanel.classList.add("hidden");
      currentPanel.classList.remove(defaultPanelClass, "scale-100", "translate-y-0", "opacity-100");
      currentPanel.classList.add("scale-95", "translate-y-full", "opacity-0");
      currentPanel = null;
    };

    const open = (panel, options = {}) => {
      if (!overlay || !panel) return;

      const {
        panelClass = defaultPanelClass,
        hiddenPanelClasses = [],
        visiblePanelClasses = [],
        onOpen,
      } = options;

      closeCurrentPanel();
      currentPanel = panel;

      overlay.classList.remove("hidden");
      overlay.classList.add("flex");

      panel.classList.remove("hidden", ...hiddenPanelClasses);
      panel.classList.add(panelClass);

      window.setTimeout(() => {
        overlay.classList.remove("opacity-0");
        if (visiblePanelClasses.length > 0) {
          panel.classList.add(...visiblePanelClasses);
        }
        if (typeof onOpen === "function") {
          onOpen();
        }
      }, overlayOpenDelay);
    };

    const close = (options = {}) => {
      if (!overlay || !currentPanel) return;

      const {
        hiddenPanelClasses = [],
        visiblePanelClasses = [],
        onClose,
      } = options;

      overlay.classList.add("opacity-0");
      currentPanel.classList.remove(...visiblePanelClasses);
      if (hiddenPanelClasses.length > 0) {
        currentPanel.classList.add(...hiddenPanelClasses);
      }

      const panelToHide = currentPanel;
      currentPanel = null;

      window.setTimeout(() => {
        overlay.classList.add("hidden");
        overlay.classList.remove("flex");
        panelToHide.classList.add("hidden");
        panelToHide.classList.remove(defaultPanelClass);
        if (typeof onClose === "function") {
          onClose();
        }
      }, 300);
    };

    const getCurrentPanel = () => currentPanel;

    return { open, close, getCurrentPanel };
  },
};
