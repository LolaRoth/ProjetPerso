<template>
  <ClientOnly>
    <header class="fixed top-0 left-0 right-0 z-50 header-blur">
      <div
        class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between"
      >
        <!-- Logo / Home Link -->
        <NuxtLink
          to="/"
          class="group flex items-center gap-2 text-xl font-bold transition-all duration-300"
        >
          <span
            class="text-transparent bg-clip-text bg-gradient-to-r from-MyPink to-MyBlue group-hover:from-MyBlue group-hover:to-MyPink transition-all duration-500"
          >
            Experience
          </span>
          <span
            class="w-2 h-2 rounded-full bg-MyPink group-hover:bg-MyBlue animate-pulse transition-colors duration-300"
          ></span>
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
              class="group flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-MyPink/30 transition-all duration-300"
            >
              <!-- Avatar -->
              <div class="relative">
                <div
                  v-if="profile?.avatar_url"
                  class="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/20 group-hover:ring-MyPink/50 transition-all duration-300"
                >
                  <img
                    :src="profile.avatar_url"
                    :alt="displayName"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div
                  v-else
                  class="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ring-2 ring-white/20 group-hover:ring-MyPink/50 transition-all duration-300"
                  style="background: linear-gradient(135deg, #8b5cf6, #ec4899)"
                >
                  {{ userInitial }}
                </div>
                <!-- Online indicator -->
                <span
                  class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-MyGreen rounded-full border-2 border-MyBlack"
                ></span>
              </div>
              <span
                class="hidden sm:inline text-sm text-gray-300 group-hover:text-white transition-colors duration-300"
                >{{ displayName }}</span
              >
              <!-- Arrow -->
              <svg
                class="w-4 h-4 text-gray-500 group-hover:text-MyPink transition-colors duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </NuxtLink>
          </template>

          <!-- Guest User -->
          <template v-else>
            <NuxtLink
              to="/login"
              class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors duration-300 relative group"
            >
              Connexion
              <span
                class="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-MyPink to-MyBlue group-hover:w-full transition-all duration-300"
              ></span>
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="px-4 py-2 text-sm bg-gradient-to-r from-MyPink/20 to-MyBlue/20 hover:from-MyPink/30 hover:to-MyBlue/30 text-white rounded-lg transition-all duration-300 border border-white/10 hover:border-white/20 hover:scale-105"
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

<style scoped>
.header-blur {
  background: rgba(18, 18, 18, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
</style>

<style scoped>
/* Header totalement transparent */
</style>
