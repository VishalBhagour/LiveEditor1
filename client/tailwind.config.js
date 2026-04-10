/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      colors: {
        editor: {
          bg: "#0d1117",
          surface: "#161b22",
          border: "#30363d",
          accent: "#58a6ff",
          green: "#3fb950",
          red: "#f85149",
          yellow: "#d29922",
          purple: "#bc8cff",
          text: "#c9d1d9",
          muted: "#8b949e",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        slideUp: { "0%": { transform: "translateY(10px)", opacity: 0 }, "100%": { transform: "translateY(0)", opacity: 1 } },
      },
    },
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        ".btn-primary": {
          "@apply bg-blue-500 hover:bg-blue-400 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900": {},
        },
        ".btn-ghost": {
          "@apply border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 focus:outline-none": {},
        },
        ".input-field": {
          "@apply w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200": {},
        },
        ".card": {
          "@apply bg-gray-900 border border-gray-800 rounded-xl p-6": {},
        },
        ".badge": {
          "@apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium": {},
        },
      });
    },
  ],
};