import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#F5F4F1', 
          100: '#EBE9E4', 
          200: '#E0DBD2', 
          300: '#D1CABC',
          400: '#BDB4A0',
          500: '#A69882', 
          600: '#8E806A',
          700: '#756855',
          800: '#5F5345',
          900: '#4A3F35',
        },
        charcoal: '#2D2A26',
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#8B7E74",
        "primary-hover": "#6D635B",
        "background-light": "#FAF9F6",
        "background-dark": "#1C1917",
        "surface-light": "#FFFFFF",
        "surface-dark": "#292524",
        "text-main-light": "#2D2A26",
        "text-secondary-light": "#88827A",
        "accent-soft": "#F0EFEA",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        serif: ["Instrument Serif", "Lora", "serif"],
        sans: ["Manrope", "sans-serif"],
      },
      boxShadow: {
        soft: "0 20px 60px -15px rgba(139, 126, 116, 0.1)",
        float: "0 10px 40px -10px rgba(0,0,0,0.05)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 15s ease-in-out infinite",
        "float-medium": "float 10s ease-in-out infinite reverse",
        "float-fast": "float 8s ease-in-out infinite",
        "pulse-slow": "pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up": "fadeUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        blob: "blob 25s infinite",
        pop: "pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        breathe: "float 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-15px) scale(1.02)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(20px, -30px) scale(1.05)" },
          "66%": { transform: "translate(-15px, 15px) scale(0.95)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        pop: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
