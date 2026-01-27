// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // Ensure global CSS is explicitly included so font-face and utilities load
  // Use a root-anchored path so Vite resolves it from project root
  // css: ["/assets/css/tailwind.css"],

  modules: ["@nuxtjs/tailwindcss"],

  tailwindcss: {
    // Don't let the Tailwind module inject the same css path again (causes
    // unresolved "~/" import in generated .nuxt files on some setups).
    configPath: "tailwind.config.ts",
  },
});
