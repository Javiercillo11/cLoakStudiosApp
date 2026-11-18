import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Mismos valores que src/styles/tokens.css (hex para permitir modificadores de opacidad /NN)
      colors: {
        obsidian: '#09090B',
        carbon: '#18181B',
        ghost: '#F4F4F5',
        muted: '#A1A1AA',
        violet: { DEFAULT: '#8B5CF6', soft: '#C4B5FD' },
        success: '#4ADE80',
        danger: '#F87171',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        brand: 'var(--font-brand)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
    },
  },
  plugins: [],
} satisfies Config
