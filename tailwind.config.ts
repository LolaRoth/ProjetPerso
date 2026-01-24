import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{vue,js,ts,jsx,tsx}",
    "./components/**/*.{vue,js,ts,jsx,tsx}",
    "./layouts/**/*.{vue,js,ts,jsx,tsx}",
    "./pages/**/*.{vue,js,ts,jsx,tsx}",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        MyBlack: "#121212",
        MyPink: "#FF66C8",
        MyBlue: "#6BFFFF",
        MyYellow: "#FFF746",
        MyGreen: "#BBFF42",
      },
      fontFamily: {
        // 'sans' étend la pile système avec InterVariable en première position
        sans: ["InterVariable", "ui-sans-serif", "system-ui"],
        // 'display' pour vos polices personnalisées (ex: titre)
        display: ['"MyCustomDisplay"', "InterVariable", "sans-serif"],
        // Polices fournies dans public/font
        bricolage: ["BricolageGrotesque", "InterVariable", "sans-serif"],
        candy: ["CandyPlanet", "InterVariable", "sans-serif"],
        sugar: ["SugarPeachy", "InterVariable", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
