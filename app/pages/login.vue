<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Connexion</h1>
        <p class="text-gray-400">
          Connectez-vous pour sauvegarder vos résultats
        </p>
      </div>

      <!-- Login Form -->
      <form
        @submit.prevent="handleSubmit"
        class="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 space-y-6"
      >
        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm"
        >
          {{ errorMessage }}
        </div>

        <!-- Email Field -->
        <div>
          <label
            for="email"
            class="block text-sm font-medium text-gray-300 mb-2"
          >
            Email
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="votre@email.com"
          />
        </div>

        <!-- Password Field -->
        <div>
          <label
            for="password"
            class="block text-sm font-medium text-gray-300 mb-2"
          >
            Mot de passe
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg
            v-if="isSubmitting"
            class="animate-spin h-5 w-5"
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
          <span>{{ isSubmitting ? "Connexion..." : "Se connecter" }}</span>
        </button>

        <!-- Register Link -->
        <p class="text-center text-gray-400 text-sm">
          Pas encore de compte ?
          <NuxtLink
            to="/register"
            class="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Créer un compte
          </NuxtLink>
        </p>

        <!-- Back to Home -->
        <p class="text-center">
          <NuxtLink
            to="/"
            class="text-gray-500 hover:text-gray-400 text-sm transition-colors"
          >
            ← Retour à l'accueil
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Page de connexion
 * Permet aux utilisateurs existants de se connecter
 */
definePageMeta({
  middleware: ["guest"],
});

const router = useRouter();
const { signIn, isAuthenticated } = useAuth();

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);

// Rediriger si déjà connecté
watch(
  isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      router.push("/profile");
    }
  },
  { immediate: true },
);

const handleSubmit = async () => {
  errorMessage.value = "";
  isSubmitting.value = true;

  const { error } = await signIn(email.value, password.value);

  if (error) {
    errorMessage.value = getErrorMessage(error.message);
    isSubmitting.value = false;
    return;
  }

  // Redirection vers le profil après connexion réussie
  router.push("/profile");
};

/**
 * Traduit les messages d'erreur Supabase en français
 */
const getErrorMessage = (message: string): string => {
  const errorMessages: Record<string, string> = {
    "Invalid login credentials": "Email ou mot de passe incorrect",
    "Email not confirmed":
      "Veuillez confirmer votre email avant de vous connecter",
    "Too many requests": "Trop de tentatives, veuillez réessayer plus tard",
  };
  return errorMessages[message] || message;
};
</script>
