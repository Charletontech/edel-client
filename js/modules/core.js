window.Edel = window.Edel || {
  initIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  },

  applySafeArea(selector = '.pb-safe') {
    const pb = getComputedStyle(document.documentElement).getPropertyValue('--sat') || '20px';
    document.querySelectorAll(selector).forEach((el) => {
      el.style.paddingBottom = `calc(env(safe-area-inset-bottom, ${pb}) + 12px)`;
    });
  },
};

// Initialize UI helpers after full page load so modules like `Ui` are available.
window.addEventListener('load', () => {
  try {
    if (window.Ui && typeof window.Ui.initPasswordToggles === 'function') {
      window.Ui.initPasswordToggles();
    }
  } catch (e) {
    console.error('Global initPasswordToggles error', e);
  }
});
