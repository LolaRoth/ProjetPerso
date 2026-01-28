<template>
  <ClientOnly>
    <header
      class="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800"
    >
      <div
        class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between"
      >
        <!-- Logo / Home Link -->
        <NuxtLink
          to="/"
          class="text-xl font-bold text-white hover:text-purple-400 transition-colors"
        >
          Experience
        </NuxtLink>

        <!-- Auth Section -->
        <div class="flex items-center gap-4">
          <!-- Loading State -->
          <div v-if="loading" class="flex items-center gap-2 text-gray-400">
            <svg
              class="animate-spin h-4 w-4"
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

          <!-- Authenticated User -->
          <template v-else-if="isAuthenticated">
            <NuxtLink
              to="/profile"
              class="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <div
                class="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium text-sm"
              >
                {{ userInitial }}
              </div>
              <span class="hidden sm:inline">{{ displayName }}</span>
            </NuxtLink>
          </template>

          <!-- Guest User -->
          <template v-else>
            <NuxtLink
              to="/login"
              class="px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Connexion
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="px-4 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all"
            >
              S'inscrire
            </NuxtLink>
          </template>
        </div>
      </div>
    </header>
  </ClientOnly>
</template>

<script setup lang="ts">
/**
 * Composant Header d'authentification
 * Affiche l'état de connexion et les actions associées
 */
const router = useRouter();
const { user, profile, isAuthenticated, loading, initAuth } = useAuth();

// Initialiser l'auth au montage du composant
onMounted(() => {
  initAuth();
});

const displayName = computed(() => {
  if (profile.value?.username) return profile.value.username;
  if (user.value?.email) return user.value.email.split("@")[0];
  return "Utilisateur";
});

const userInitial = computed(() => {
  const name = displayName.value || "";
  return name.charAt(0).toUpperCase() || "";
});

// Logout removed from header by request
</script>
