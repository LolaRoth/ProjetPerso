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
      viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
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
        { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
        // Theme color (pour les navigateurs mobiles)
        { name: "theme-color", content: "#0a0a0a", media: "(prefers-color-scheme: dark)" },
        { name: "theme-color", content: "#0a0a0a", media: "(prefers-color-scheme: light)" },
        // Color scheme
        { name: "color-scheme", content: "dark" },
        // Open Graph (Facebook, LinkedIn, etc.)
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Experience" },
        { property: "og:title", content: "Experience | Le site qui se dégrade" },
        {
          property: "og:description",
          content:
            "Une expérience web interactive unique où le site se dégrade progressivement. Trouvez le bouton secret avant le chaos total !",
        },
        { property: "og:image", content: "/og-image.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "Experience - Une expérience web chaotique" },
        { property: "og:locale", content: "fr_FR" },
        { property: "og:url", content: "https://experience.fr" },
        // Twitter Card
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Experience | Le site qui se dégrade" },
        {
          name: "twitter:description",
          content:
            "Une expérience web interactive unique. Jouez, explorez, et survivez au chaos !",
        },
        { name: "twitter:image", content: "/og-image.png" },
        { name: "twitter:image:alt", content: "Experience - Une expérience web chaotique" },
        // Apple
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
        { name: "apple-mobile-web-app-title", content: "Experience" },
        // Microsoft
        { name: "msapplication-TileColor", content: "#0a0a0a" },
        { name: "msapplication-config", content: "/browserconfig.xml" },
        // Format detection
        { name: "format-detection", content: "telephone=no, date=no, email=no, address=no" },
        // Referrer policy
        { name: "referrer", content: "strict-origin-when-cross-origin" },
      ],
      link: [
        // Favicon SVG (moderne)
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        // Favicon PNG fallback
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
        // Apple Touch Icon
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        // Manifest
        { rel: "manifest", href: "/site.webmanifest" },
        // Canonical
        { rel: "canonical", href: "https://experience.fr" },
        // DNS Prefetch & Preconnect pour performances
        { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
        { rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
      ],
      // Script JSON-LD pour données structurées
      script: [
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Experience",
            "description": "Une expérience web interactive unique où le site se dégrade progressivement.",
            "url": "https://experience.fr",
            "applicationCategory": "Game",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "EUR"
            },
            "author": {
              "@type": "Organization",
              "name": "Experience"
            },
            "inLanguage": "fr-FR",
            "genre": ["Interactive Art", "Puzzle Game", "Experimental"],
            "audience": {
              "@type": "Audience",
              "audienceType": "Gamers, Art enthusiasts"
            }
          }),
        },
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Experience",
            "url": "https://experience.fr",
            "description": "Le site qui se dégrade - Une expérience web interactive unique",
            "inLanguage": "fr-FR"
          }),
        },
      ],
    },
  },

  // ===== EXPERIMENTAL FEATURES =====
  experimental: {
    // Optimisations de payload
    payloadExtraction: true,
    // View transitions API - DÉSACTIVÉ car cause des AbortError sur les pages d'auth
    // viewTransition: true,
  },

  // ===== FEATURES =====
  features: {
    // Inline styles critiques
    inlineStyles: true,
  },

  // ===== VITE OPTIMIZATIONS =====
  vite: {
    build: {
      // Minification avec esbuild (plus rapide)
      minify: "esbuild",
      // CSS code splitting
      cssCodeSplit: true,
      // Taille des chunks
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          // Meilleur chunking pour le cache
          manualChunks: {
            "gsap": ["gsap"],
            "vue-vendor": ["vue", "vue-router"],
          },
        },
      },
    },
    // Optimisation des dépendances
    optimizeDeps: {
      include: ["vue", "vue-router", "gsap"],
    },
    // CSS
    css: {
      devSourcemap: true,
    },
  },

  // ===== MODULES =====
  modules: ["@nuxtjs/tailwindcss"],

  tailwindcss: {
    configPath: "tailwind.config.ts",
  },

  // ===== RUNTIME CONFIG =====
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
      siteUrl: process.env.SITE_URL || "https://experience.fr",
    },
  },

  // ===== NITRO (SSR & Performance) =====
  nitro: {
    // Compression
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    // Minification HTML
    minify: true,
    // Prerender
    prerender: {
      crawlLinks: true,
      routes: ["/login", "/register"],
    },
    // Headers de sécurité et cache
    routeRules: {
      // Assets statiques - cache long
      "/_nuxt/**": {
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
      },
      // Fonts - cache très long
      "/font/**": {
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
      },
      // SVGs - cache long
      "/svg/**": {
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
      },
      // Images - cache long
      "/**/*.png": {
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
      },
      "/**/*.jpg": {
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
      },
      "/**/*.webp": {
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
      },
      // Favicon
      "/favicon.svg": {
        headers: {
          "cache-control": "public, max-age=86400",
        },
      },
    },
  },

  // ===== ROUTE RULES =====
  routeRules: {
    // Pages statiques pre-rendues avec cache
    "/login": {
      prerender: true,
      headers: {
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
    "/register": {
      prerender: true,
      headers: {
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
    // Pages SSR dynamiques - pas de cache public
    "/": {
      ssr: true,
      headers: {
        "cache-control": "private, no-cache",
      },
    },
    "/welcome": {
      ssr: true,
      headers: {
        "cache-control": "private, no-cache",
      },
    },
    "/fin": {
      ssr: true,
      headers: {
        "cache-control": "private, no-cache",
      },
    },
    "/profile": {
      ssr: true,
      headers: {
        "cache-control": "private, no-cache",
      },
    },
    // API et auth - jamais de cache
    "/auth/**": {
      headers: {
        "cache-control": "private, no-store",
      },
    },
  },
});
