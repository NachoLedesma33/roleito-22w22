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
    },
  },
  plugins: [animate],
}