window.tailwind = window.tailwind || {};
window.tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      colors: {
        brand: {
          navy: 'var(--edel-purple-dark, #2D1157)',
          blue: 'var(--edel-purple-main, #3A1A6A)',
          accent: 'var(--brand-accent, #fbbf24)',
          accentHover: '#d97706',
          glow: 'var(--edel-purple-light, #4B2A7F)',
          light: 'var(--edel-soft-white, #F1F1F1)',
          surface: 'var(--edel-white, #FFFFFF)',
        },
      },
      boxShadow: {
        soft: '0 10px 40px -10px rgba(0,0,0,0.08)',
        glow: '0 0 20px rgba(251, 191, 36, 0.4)',
        'glow-purple': '0 0 25px rgba(75, 42, 127, 0.3)',
        'inner-glow': 'inset 0 0 0 1px rgba(255,255,255,0.1)',
        floating: '0 20px 50px -12px rgba(45, 17, 87, 0.25)',
      },
    },
  },
};
