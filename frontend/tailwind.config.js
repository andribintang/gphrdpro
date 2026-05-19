/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter','Plus Jakarta Sans','system-ui','sans-serif'],
        mono: ['JetBrains Mono','Fira Code','monospace'],
      },
      colors: {
        brand: {
          50:'#fff1f2', 100:'#ffe4e6', 200:'#fecdd3', 300:'#fda4af',
          400:'#fb7185', 500:'#f43f5e', 600:'#e11d48', 700:'#be123c',
          800:'#9f1239', 900:'#881337', 950:'#4c0519',
        },
      },
      maxWidth: {
        '8xl': '88rem',   // 1408px — main container
        '9xl': '96rem',   // 1536px
      },
      spacing: {
        '4.5': '1.125rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'xs':      '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'sm':      '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'md':      '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'lg':      '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
        'xl':      '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
        'brand':   '0 4px 14px 0 rgb(225 29 72 / 0.25)',
        'brand-lg':'0 8px 24px 0 rgb(225 29 72 / 0.30)',
        'card':    '0 1px 3px rgb(0 0 0 / 0.04), 0 1px 2px rgb(0 0 0 / 0.02)',
        'card-hover':'0 4px 12px rgb(0 0 0 / 0.08), 0 2px 4px rgb(0 0 0 / 0.04)',
        'inset':   'inset 0 1px 2px rgb(0 0 0 / 0.06)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'scale-in':   'scaleIn 0.2s ease-out',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:    { from:{ opacity:'0' },                                    to:{ opacity:'1' } },
        slideUp:   { from:{ opacity:'0', transform:'translateY(10px)' },      to:{ opacity:'1', transform:'translateY(0)' } },
        slideDown: { from:{ opacity:'0', transform:'translateY(-8px)' },      to:{ opacity:'1', transform:'translateY(0)' } },
        scaleIn:   { from:{ opacity:'0', transform:'scale(0.96)' },           to:{ opacity:'1', transform:'scale(1)' } },
      },
      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
      },
    },
  },
  plugins: [],
}
