import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [],
  theme: {
    extend: {
      colors: {
        // nötr zinc yüzeyler
        space: {
          950: '#09090b',
          900: '#0f0f12',
          800: '#16161a',
          700: '#1f1f25',
          600: '#2c2c35',
        },
        // tek vurgu rengi: indigo
        arc: {
          400: '#a5b4fc',
          500: '#6366f1',
          600: '#4f46e5',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
}
