<template>
  <div class="min-h-screen bg-MyBlack flex items-center justify-center px-4">
    <div class="text-center max-w-md">
      <!-- État de chargement -->
      <div v-if="loading" class="space-y-6">
        <div class="flex justify-center">
          <svg
            class="animate-spin h-12 w-12 text-MyPink"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <p class="text-white/70 font-bricolage">Connexion en cours...</p>
      </div>

      <!-- État d'erreur -->
      <div v-else-if="error" class="space-y-6">
        <div
          class="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-white mb-2">
            Erreur de connexion
          </h1>
          <p class="text-red-400/80 text-sm">{{ error }}</p>
        </div>
        <NuxtLink
          to="/login"
          class="inline-block px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
        >
          Retour à la connexion
        </NuxtLink>
      </div>

      <!-- Succès (bref avant redirection) -->
      <div v-else class="space-y-6">
        <div
          class="w-16 h-16 mx-auto rounded-full bg-MyGreen/20 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 text-MyGreen"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p class="text-white/70 font-bricolage">Redirection...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Page de callback OAuth
 * Gère le retour après authentification Google/OAuth
 */

// Cette page ne doit pas être protégée par le middleware auth
definePageMeta({
  middleware: [],
});

// SEO - pas d'indexation
useSeoMeta({
  robots: "noindex, nofollow",
});

const router = useRouter();
const { initAuth, isAuthenticated, ensureProfile } = useAuth();

const loading = ref(true);
const error = ref<string | null>(null);

// Fonction pour vérifier si c'est une erreur d'abort (non critique)
const isAbortError = (e: any): boolean => {
  return (
    e?.name === "AbortError" ||
    e?.message?.includes("abort") ||
    e?.message?.includes("AbortError")
  );
};

onMounted(async () => {
  // Petit délai initial pour éviter les race conditions
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    // Supabase détecte automatiquement la session dans l'URL
    await initAuth();

    // Délai pour laisser Supabase traiter le token OAuth
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Vérifier si l'utilisateur est connecté
    if (isAuthenticated.value) {
      // S'assurer qu'un profil existe pour l'utilisateur OAuth
      try {
        await ensureProfile();
      } catch (profileError: any) {
        // Ignorer les erreurs d'abort pour le profil - non critiques
        if (!isAbortError(profileError)) {
          console.warn("Erreur création profil (non bloquante):", profileError);
        }
      }

      loading.value = false;
      // Rediriger vers la page de bienvenue
      await new Promise((resolve) => setTimeout(resolve, 300));
      router.push("/welcome");
    } else {
      // Vérifier s'il y a une erreur dans l'URL
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      const errorParam =
        urlParams.get("error") ||
        hashParams.get("error") ||
        urlParams.get("error_description") ||
        hashParams.get("error_description");

      if (errorParam) {
        error.value = decodeURIComponent(errorParam);
      } else {
        // Peut-être que la session est encore en cours de traitement
        // Réessayer une fois
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await initAuth();
        
        if (isAuthenticated.value) {
          loading.value = false;
          router.push("/welcome");
          return;
        }
        
        error.value = "La connexion a échoué. Veuillez réessayer.";
      }
      loading.value = false;
    }
  } catch (e: any) {
    // Ignorer les erreurs d'abort - elles sont causées par la navigation
    if (isAbortError(e)) {
      console.log("Navigation en cours, erreur d'abort ignorée");
      // Vérifier quand même si on est connecté
      if (isAuthenticated.value) {
        loading.value = false;
        router.push("/welcome");
        return;
      }
    }
    
    console.error("Erreur callback OAuth:", e);
    error.value = e.message || "Une erreur inattendue s'est produite.";
    loading.value = false;
  }
});
</script>
