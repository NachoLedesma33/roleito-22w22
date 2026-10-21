import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './.storybook/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
        // Títulos: Cinzel (el sistema de diseño V2). Antes Playfair Display.
        display: ['Cinzel', 'Georgia', 'serif'],
        // Datos criticos (relojes, PV/PM) y campos de maquina.
        mono: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          2: 'var(--bg-surface-elevated)',
          elevated: 'var(--bg-surface-elevated)',
        },
        border: 'var(--border)',
        subtle: 'var(--border-subtle)',
        ring: 'var(--ring)',
        // Texto: alto contraste, siempre por token (nunca gris hardcodeado).
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        // Paleta arcana: la energía cian/violeta y el bronce de la maquinaria.
        // Con clave de tono (500, 600) para que enganche con los tokens.
        arcana: {
          500: 'var(--arcana-500)',
          600: 'var(--arcana-600)',
        },
        azure: { 500: 'var(--azure-500)' },
        brass: { 500: 'var(--brass-500)' },
        obsidian: {
          950: 'var(--obsidian-950)',
          900: 'var(--obsidian-900)',
          800: 'var(--obsidian-800)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
          faint: 'var(--ink-faint)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          hover: 'var(--accent-hover)',
        },
        'on-brand': 'var(--on-brand)',
        'on-danger': 'var(--on-danger)',
        hp: 'var(--hp)',
        mp: 'var(--mp)',
        def: 'var(--def)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        canon: 'var(--canon)',
        proposed: 'var(--proposed)',
        rejected: 'var(--rejected)',
        'dm-only': 'var(--dm-only)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
      },
      keyframes: {},
      animation: {},
    },
  },
  plugins: [animate],
}