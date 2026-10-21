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
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        border: 'var(--border)',
        ring: 'var(--ring)',
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