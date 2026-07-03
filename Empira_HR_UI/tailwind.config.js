/** @type {import('tailwindcss').Config} */
const hslVar = (name) => `hsl(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: hslVar('--background'),
        foreground: hslVar('--foreground'),
        card: hslVar('--card'),
        'card-foreground': hslVar('--card-foreground'),
        popover: hslVar('--popover'),
        'popover-foreground': hslVar('--popover-foreground'),
        muted: hslVar('--muted'),
        'muted-foreground': hslVar('--muted-foreground'),
        border: hslVar('--border'),
        input: hslVar('--input'),
        ring: hslVar('--ring'),

        accent: hslVar('--accent'),
        'accent-foreground': hslVar('--accent-foreground'),
        'accent-soft': `hsl(var(--accent-soft))`,
      },
    },
  },
  plugins: [],
};
