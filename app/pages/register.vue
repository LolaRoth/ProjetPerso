<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Créer un compte</h1>
        <p class="text-gray-400">
          Inscrivez-vous pour sauvegarder vos résultats
        </p>
      </div>

      <!-- Register Form -->
      <form
        @submit.prevent="handleSubmit"
        class="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 space-y-6"
      >
        <!-- Success Message -->
        <div
          v-if="successMessage"
          class="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm"
        >
          {{ successMessage }}
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm"
        >
          {{ errorMessage }}
        </div>

        <!-- Username Field -->
        <div>
          <label
            for="username"
            class="block text-sm font-medium text-gray-300 mb-2"
          >
            Nom d'utilisateur
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            autocomplete="username"
            class="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="MonPseudo"
          />
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
            minlength="6"
            autocomplete="new-password"
            class="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
          <p class="mt-1 text-xs text-gray-500">Minimum 6 caractères</p>
        </div>

        <!-- Confirm Password Field -->
        <div>
          <label
            for="confirmPassword"
            class="block text-sm font-medium text-gray-300 mb-2"
          >
            Confirmer le mot de passe
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
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
          <span>{{ isSubmitting ? "Création..." : "Créer mon compte" }}</span>
        </button>

        <!-- Login Link -->
        <p class="text-center text-gray-400 text-sm">
          Déjà un compte ?
          <NuxtLink
            to="/login"
            class="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Se connecter
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
 * Page d'inscription
 * Permet aux nouveaux utilisateurs de créer un compte
 */
definePageMeta({
  middleware: ["guest"],
});

const router = useRouter();
const { signUp, isAuthenticated } = useAuth();

const username = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const errorMessage = ref("");
const successMessage = ref("");
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
  successMessage.value = "";

  // Validation côté client
  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Les mots de passe ne correspondent pas";
    return;
  }

  if (password.value.length < 6) {
    errorMessage.value = "Le mot de passe doit contenir au moins 6 caractères";
    return;
  }

  isSubmitting.value = true;

  const { error } = await signUp(email.value, password.value, username.value);

  if (error) {
    errorMessage.value = getErrorMessage(error.message);
    isSubmitting.value = false;
    return;
  }

  // Afficher le message de succès
  successMessage.value =
    "Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription.";
  isSubmitting.value = false;

  // Redirection après un court délai
  setTimeout(() => {
    router.push("/profile");
  }, 2000);
};

/**
 * Traduit les messages d'erreur Supabase en français
 */
const getErrorMessage = (message: string): string => {
  const errorMessages: Record<string, string> = {
    "User already registered": "Un compte existe déjà avec cet email",
    "Password should be at least 6 characters":
      "Le mot de passe doit contenir au moins 6 caractères",
    "Unable to validate email address: invalid format":
      "Format d'email invalide",
    "Signup requires a valid password":
      "Veuillez entrer un mot de passe valide",
    "Rate limit exceeded":
      "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.",
    "Request rate limit reached":
      "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.",
  };

  // Gérer l'erreur 429 qui peut avoir différents formats
  if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
    return "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.";
  }

  return errorMessages[message] || message;
};
</script>
