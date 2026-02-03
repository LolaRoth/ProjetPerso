// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // ===== SEO & META =====
  app: {
    head: {
      htmlAttrs: {
        lang: "fr",
      },
      title: "Experience | Le site qui se dégrade",
      titleTemplate: "%s - Experience",
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      meta: [
        // Description principale
        {
          name: "description",
          content:
            "Une expérience web interactive unique où le site se dégrade progressivement. Jouez à des mini-jeux, découvrez des indices cachés et trouvez le bouton secret avant que le chaos ne prenne le dessus.",
        },
        // Mots-clés
        {
          name: "keywords",
          content:
            "expérience interactive, jeu web, chaos, dégradation, mini-jeux, puzzle, secret, français, art numérique, expérimental",
        },
        // Auteur
        { name: "author", content: "Experience" },
        // Robots
        { name: "robots", content: "index, follow" },
        // Theme color (pour les navigateurs mobiles)
        { name: "theme-color", content: "#0a0a0a" },
        // Open Graph (Facebook, LinkedIn, etc.)
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Experience" },
        {
          property: "og:title",
          content: "Experience | Le site qui se dégrade",
        },
        {
          property: "og:description",
          content:
            "Une expérience web interactive unique où le site se dégrade progressivement. Trouvez le bouton secret avant le chaos total !",
        },
        { property: "og:image", content: "/og-image.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:locale", content: "fr_FR" },
        // Twitter Card
        { name: "twitter:card", content: "summary_large_image" },
        {
          name: "twitter:title",
          content: "Experience | Le site qui se dégrade",
        },
        {
          name: "twitter:description",
          content:
            "Une expérience web interactive unique. Jouez, explorez, et survivez au chaos !",
        },
        { name: "twitter:image", content: "/og-image.png" },
        // Apple
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "apple-mobile-web-app-title", content: "Experience" },
        // Microsoft
        { name: "msapplication-TileColor", content: "#0a0a0a" },
        // Format detection (empêche la détection auto de numéros de téléphone)
        { name: "format-detection", content: "telephone=no" },
      ],
      link: [
        // Favicon SVG (moderne)
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        // Favicon PNG fallback
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32x32.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "/favicon-16x16.png",
        },
        // Apple Touch Icon
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/apple-touch-icon.png",
        },
        // Manifest
        { rel: "manifest", href: "/site.webmanifest" },
        // Canonical (sera surchargé par page si nécessaire)
        { rel: "canonical", href: "https://experience.fr" },
        // Preconnect pour les polices
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
      ],
    },
  },

  // Ensure global CSS is explicitly included so font-face and utilities load
  // Use a root-anchored path so Vite resolves it from project root
  // css: ["/assets/css/tailwind.css"],

  modules: ["@nuxtjs/tailwindcss"],

  tailwindcss: {
    // Don't let the Tailwind module inject the same css path again (causes
    // unresolved "~/" import in generated .nuxt files on some setups).
    configPath: "tailwind.config.ts",
  },

  // Configuration Supabase via variables d'environnement
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    },
  },

  // ===== NITRO (SSR & Génération) =====
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ["/", "/login", "/register", "/welcome"],
    },
  },

  // ===== ROUTES RULES =====
  routeRules: {
    // Page principale - SSR dynamique
    "/": { ssr: true },
    // Pages statiques
    "/login": { prerender: true },
    "/register": { prerender: true },
    "/welcome": { prerender: true },
    // Page de fin - SSR (nécessite vérification)
    "/fin": { ssr: true },
    // Profil - SSR dynamique
    "/profile": { ssr: true },
  },
});
