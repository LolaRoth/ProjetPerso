<template>
  <div
    class="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
  >
    <!-- Fond décoratif -->
    <div class="absolute inset-0 pointer-events-none">
      <div
        class="absolute -top-40 -left-40 w-80 h-80 bg-MyPink/20 rounded-full blur-3xl animate-pulse-slow"
      />
      <div
        class="absolute -bottom-40 -right-40 w-96 h-96 bg-MyBlue/15 rounded-full blur-3xl animate-pulse-slow"
        style="animation-delay: 1s"
      />
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-MyPink/5 to-MyBlue/5 rounded-full blur-3xl"
      />
    </div>

    <div class="w-full max-w-md relative z-10">
      <!-- Header -->
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-MyPink/20 to-MyBlue/20 border border-white/10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 text-MyPink"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
            />
          </svg>
        </div>
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
          :disabled="isSubmitting || isGoogleLoading"
          class="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]"
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

        <!-- Séparateur -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-700"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-4 bg-gray-900/50 text-gray-500">ou</span>
          </div>
        </div>

        <!-- Google Button -->
        <button
          type="button"
          :disabled="isGoogleLoading || isSubmitting"
          @click="handleGoogleSignIn"
          class="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-800 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <svg
            v-if="isGoogleLoading"
            class="animate-spin h-5 w-5 text-gray-600"
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
          <svg
            v-else
            class="h-5 w-5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>{{
            isGoogleLoading ? "Redirection..." : "Continuer avec Google"
          }}</span>
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
const { signIn, signInWithGoogle, isAuthenticated } = useAuth();

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);
const isGoogleLoading = ref(false);

// Rediriger si déjà connecté
watch(
  isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      router.push("/welcome");
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

  // Redirection vers l'écran de bienvenue après connexion réussie
  router.push("/welcome");
};

/**
 * Connexion avec Google OAuth
 */
const handleGoogleSignIn = async () => {
  errorMessage.value = "";
  isGoogleLoading.value = true;

  const { error } = await signInWithGoogle();

  if (error) {
    errorMessage.value = error.message;
    isGoogleLoading.value = false;
  }
  // Note: si pas d'erreur, l'utilisateur est redirigé vers Google
  // donc pas besoin de reset isGoogleLoading
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
