/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',  // keeps working with your .dark class on html
  theme: {
    extend: {
      colors: {
        primary: '#1E3A8A',
        accent: '#FCD34D',
        buyer: '#3B82F6',
        seller: '#f97316',
        background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      card: 'hsl(var(--card))',
      'card-foreground': 'hsl(var(--card-foreground))',
      muted: 'hsl(var(--muted))',
      'muted-foreground': 'hsl(var(--muted-foreground))',
      accent: 'hsl(var(--accent))',
      border: 'hsl(var(--border))',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
      },
    },
  },
  plugins: [],
}