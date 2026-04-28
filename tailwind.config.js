/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-mode="dark"]'],
  theme: {
    extend: {
      colors: {
        // Semantic (resolved via CSS vars; works in both themes)
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          code: 'var(--bg-code)',
          tintIndigo: 'var(--bg-tint-indigo)',
          tintAmber: 'var(--bg-tint-amber)',
        },
        fg: {
          primary: 'var(--fg-primary)',
          body: 'var(--fg-body)',
          heading: 'var(--fg-heading)',
          link: 'var(--fg-link)',
          muted: 'var(--fg-muted)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
        },
        status: {
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          error: 'var(--status-error)',
        },
        cta: {
          DEFAULT: 'var(--cta-bg)',
          fg: 'var(--cta-fg)',
        },
        // Brand primitives (direct access)
        brand: {
          indigo: '#6B5CE7',
          indigoDeep: '#4A3FA8',
          amber: '#F4A261',
          cream: '#FFF8F0',
          darkSurface: '#1A1A2E',
          darkElevated: '#242440',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        'ring-indigo': 'var(--shadow-ring-indigo)',
        'ring-amber': 'var(--shadow-ring-amber)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Nunito', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo'],
      },
    },
  },
  plugins: [],
};
