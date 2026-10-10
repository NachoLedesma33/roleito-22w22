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
      keyframes: {
        vortex: {
          '0%': { transform: 'scale(1) rotate(0deg)', filter: 'blur(0px)', opacity: '1' },
          '40%': {
            transform: 'scale(0.85) rotate(90deg)',
            filter: 'blur(2px)',
            opacity: '1',
          },
          '70%': {
            transform: 'scale(0.4) rotate(260deg)',
            filter: 'blur(10px)',
            opacity: '0.85',
          },
          '100%': {
            transform: 'scale(0.05) rotate(760deg)',
            filter: 'blur(28px)',
            opacity: '0',
          },
        },
      },
      animation: {
        vortex: 'vortex 0.85s cubic-bezier(0.55, 0, 0.85, 0.35) forwards',
      },
    },
  },
  plugins: [animate],
}