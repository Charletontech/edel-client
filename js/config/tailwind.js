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
          navy: 'var(--brand-navy, #06142E)',
          blue: 'var(--brand-blue, #1B3358)',
          accent: '#FBBF24',
          accentHover: '#D97706',
          glow: '#22D3EE',
          light: '#F8FAFC',
          surface: '#ffffff',
        },
      },
      boxShadow: {
        soft: '0 10px 40px -10px rgba(0,0,0,0.08)',
        glow: '0 0 20px rgba(251, 191, 36, 0.4)',
        'glow-cyan': '0 0 25px rgba(34, 211, 238, 0.3)',
        'inner-glow': 'inset 0 0 0 1px rgba(255,255,255,0.1)',
        floating: '0 20px 50px -12px rgba(6, 20, 46, 0.25)',
      },
    },
  },
};
