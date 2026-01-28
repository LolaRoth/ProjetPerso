<template>
  <div class="relative min-h-screen py-12 px-4 bg-MyBlack text-white">
    <div class="max-w-5xl mx-auto">
      <!-- Decorative background circles to match home style -->
      <div
        class="absolute -top-24 -left-24 w-72 h-72 bg-MyPink/10 rounded-full blur-3xl pointer-events-none"
      />
      <div
        class="absolute -bottom-32 -right-20 w-96 h-96 bg-MyBlue/10 rounded-full blur-3xl pointer-events-none"
      />
      <!-- Header / Hero -->
      <div class="relative mb-8">
        <div
          class="rounded-2xl p-6 bg-gradient-to-br from-MyPink/10 via-transparent to-MyBlue/10 backdrop-blur-sm border border-white/6 flex items-center justify-between shadow-lg"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold avatar-shadow"
              style="background: linear-gradient(135deg, #8b5cf6, #ec4899)"
            >
              {{ userInitials }}
            </div>
            <div>
              <h1
                class="text-4xl md:text-5xl font-extrabold leading-tight hero-title-glow"
              >
                Bonjour,
                <span
                  class="text-transparent bg-clip-text bg-gradient-to-r from-MyPink to-MyBlue"
                  >{{ userDisplayName }}</span
                >
              </h1>
              <p class="text-sm text-white/80 mt-1">
                Membre depuis
                <span class="font-medium text-MyPink">{{
                  profile?.created_at ? formatDate(profile.created_at) : "-"
                }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div v-if="editing" class="flex items-center gap-2">
              <input
                v-model="editUsername"
                placeholder="Nom d'utilisateur"
                class="px-3 py-2 rounded-md bg-zinc-800 border border-gray-700 text-white focus:outline-none"
              />
              <button
                @click="saveProfile"
                class="px-4 py-2 bg-MyPink text-white rounded-md hover:scale-105 transition-transform"
              >
                Enregistrer
              </button>
              <button
                @click="cancelEdit"
                class="px-3 py-2 text-gray-300 rounded-md hover:bg-gray-800/30"
              >
                Annuler
              </button>
            </div>
            <div v-else>
              <button
                @click="startEdit"
                class="px-4 py-2 bg-gradient-to-r from-MyPink to-MyBlue text-white rounded-lg transition-transform hover:scale-105"
              >
                Éditer le profil
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Global Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          class="stat-card rounded-xl p-6 bg-zinc-900/60 border border-MyPink/20 hover:shadow-lg hover:shadow-MyPink/20 transition-all"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center"
              style="background: linear-gradient(135deg, #7c3aed22, #ec489922)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-purple-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <p class="text-sm text-white/70">Meilleur Score</p>
              <p
                class="text-3xl font-bold text-white animate-gradient-x hero-title-glow"
              >
                {{ bestOverallScore }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="stat-card rounded-xl p-6 bg-zinc-900/60 border border-MyBlue/20 hover:shadow-lg hover:shadow-MyBlue/20 transition-all"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center"
              style="background: linear-gradient(135deg, #ec489922, #f9731622)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-pink-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p class="text-sm text-white/70">Parties Jouées</p>
              <p
                class="text-3xl font-bold text-white animate-gradient-x hero-title-glow"
              >
                {{ totalPlays }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="stat-card rounded-xl p-6 bg-zinc-900/60 border border-MyGreen/20 hover:shadow-lg hover:shadow-MyGreen/20 transition-all"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center"
              style="background: linear-gradient(135deg, #0891b222, #06b6d422)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-cyan-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <p class="text-sm text-white/70">Score Moyen</p>
              <p
                class="text-3xl font-bold text-white animate-gradient-x hero-title-glow"
              >
                {{ averageOverallScore }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats par jeu -->
      <div
        class="bg-zinc-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 mb-8"
      >
        <h2 class="text-xl font-semibold text-white mb-6">
          Statistiques par Jeu
        </h2>

        <!-- Loading State -->
        <div v-if="statsLoading" class="text-center py-8">
          <svg
            class="animate-spin h-8 w-8 mx-auto text-purple-500"
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
          <p class="text-gray-400 mt-2">Chargement...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="gameStats.length === 0" class="text-center py-8">
          <p class="text-gray-400 mb-4">Aucune statistique pour le moment</p>
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-MyPink to-MyBlue text-white font-semibold rounded-lg shadow-md hover:scale-105 transition-transform"
          >
            Jouer maintenant
          </NuxtLink>
        </div>

        <!-- Stats Grid -->
        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div
            v-for="gameId in allGameIds"
            :key="gameId"
            class="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-purple-500/50 transition-colors"
          >
            <div class="flex items-center gap-3 mb-4">
              <span class="text-2xl">{{ getGameInfo(gameId).icon }}</span>
              <div>
                <h3 class="font-semibold text-white">
                  {{ getGameInfo(gameId).name }}
                </h3>
                <p class="text-xs text-gray-500">
                  {{ getGameInfo(gameId).description }}
                </p>
              </div>
            </div>

            <div v-if="getStatsByGame(gameId)" class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Parties jouées</span>
                <span class="text-white font-medium">{{
                  getStatsByGame(gameId)?.total_plays || 0
                }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Meilleur score</span>
                <span class="text-green-400 font-medium">{{
                  getStatsByGame(gameId)?.best_score?.toFixed(0) || "-"
                }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Score moyen</span>
                <span class="text-cyan-400 font-medium">{{
                  getStatsByGame(gameId)?.average_score?.toFixed(0) || "-"
                }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Temps total</span>
                <span class="text-purple-400 font-medium">{{
                  formatTime(getStatsByGame(gameId)?.total_time_spent || 0)
                }}</span>
              </div>
            </div>
            <div v-else class="text-center py-4 text-gray-500 text-sm">
              Pas encore joué
            </div>
          </div>
        </div>
      </div>

      <!-- Sessions History -->
      <div
        class="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6"
      >
        <h2 class="text-xl font-semibold text-white mb-6">
          Historique des Sessions
        </h2>

        <!-- Filter by game -->
        <div class="mb-4">
          <select
            v-model="selectedGameFilter"
            @change="filterSessions"
            class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Tous les jeux</option>
            <option v-for="gameId in allGameIds" :key="gameId" :value="gameId">
              {{ getGameInfo(gameId).icon }} {{ getGameInfo(gameId).name }}
            </option>
          </select>
        </div>

        <!-- Loading State -->
        <div v-if="statsLoading" class="text-center py-8">
          <svg
            class="animate-spin h-8 w-8 mx-auto text-purple-500"
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
          <p class="text-gray-400 mt-2">Chargement...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="gameSessions.length === 0" class="text-center py-12">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-16 w-16 mx-auto text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p class="text-gray-400 mb-4">Aucun résultat pour le moment</p>
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
          >
            Commencer l'expérience
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </NuxtLink>
        </div>

        <!-- Sessions Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-700">
                <th class="text-left py-3 px-4 text-gray-400 font-medium">
                  Jeu
                </th>
                <th class="text-left py-3 px-4 text-gray-400 font-medium">
                  Date
                </th>
                <th class="text-left py-3 px-4 text-gray-400 font-medium">
                  Score
                </th>
                <th class="text-left py-3 px-4 text-gray-400 font-medium">
                  Résultat
                </th>
                <th class="text-left py-3 px-4 text-gray-400 font-medium">
                  Temps
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="session in gameSessions"
                :key="session.id"
                class="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
              >
                <td class="py-4 px-4 text-gray-300">
                  <span class="mr-2">{{
                    getGameInfo(session.game_id as any).icon
                  }}</span>
                  {{ getGameInfo(session.game_id as any).name }}
                </td>
                <td class="py-4 px-4 text-gray-300">
                  {{ formatDate(session.created_at) }}
                </td>
                <td class="py-4 px-4">
                  <span
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    :class="getScoreClass(session.score || 0)"
                  >
                    {{ session.score?.toFixed(0) || "-" }}
                  </span>
                </td>
                <td class="py-4 px-4">
                  <span
                    class="px-2 py-1 rounded text-xs font-medium"
                    :class="getResultClass(session.result_type)"
                  >
                    {{ getResultLabel(session.result_type) }}
                  </span>
                </td>
                <td class="py-4 px-4 text-gray-300">
                  {{ formatTime(session.time_spent || 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Back to Experience -->
      <div class="mt-8 text-center">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          ← Retour à l'expérience
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Page de profil utilisateur
 * Affiche les informations et l'historique des résultats par jeu
 */
import type { GameId } from "../../types/supabase";

definePageMeta({
  middleware: ["auth"],
});

const router = useRouter();
const { user, profile, updateProfile, fetchProfile } = useAuth();

// Display helpers
const userDisplayName = computed(() => {
  return profile.value?.username || user.value?.email || "Joueur";
});
const userInitials = computed(() => {
  const name = (userDisplayName.value || "").trim();
  if (!name) return "JD";
  return name
    .split(" ")
    .map((p: string) => p[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
});

// Profile edit state
const editing = ref(false);
const editUsername = ref("");

watch(
  () => profile.value,
  (p) => {
    editUsername.value = p?.username || "";
  },
  { immediate: true },
);

const startEdit = () => {
  editUsername.value = profile.value?.username || "";
  editing.value = true;
};

const cancelEdit = () => {
  editing.value = false;
  editUsername.value = profile.value?.username || "";
};

const saveProfile = async () => {
  try {
    const { error } = await updateProfile({ username: editUsername.value });
    if (error) {
      console.error("Erreur updateProfile:", error);
      return;
    }
    // refresh local profile
    await fetchProfile();
    editing.value = false;
  } catch (e) {
    console.error(e);
  }
};
const {
  stats: gameStats,
  sessions: gameSessions,
  loading: statsLoading,
  fetchStats,
  fetchSessions,
  getStatsByGame,
  getTotalPlays: totalPlays,
  getBestOverallScore: bestOverallScore,
  getAverageOverallScore: averageOverallScore,
} = useGameStats();

const { GAMES_INFO } = await import("../composables/useGameStats");

const allGameIds: GameId[] = [
  "color-sequence",
  "click-challenge",
  "puzzle-blocks",
  "target-shooting",
  "typing-game",
];

const selectedGameFilter = ref<GameId | "">("");

// Charger les données au montage
onMounted(async () => {
  await Promise.all([fetchStats(), fetchSessions()]);
});

/**
 * Filtre les sessions par jeu
 */
const filterSessions = async () => {
  if (selectedGameFilter.value) {
    await fetchSessions(selectedGameFilter.value);
  } else {
    await fetchSessions();
  }
};

/**
 * Récupère les infos d'un jeu
 */
const getGameInfo = (gameId: GameId) => {
  return GAMES_INFO[gameId] || { name: gameId, description: "", icon: "🎮" };
};

// Déconnexion retirée du header — fonction supprimée

/**
 * Formate une date ISO en format lisible
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formate le temps en secondes en format lisible
 */
const formatTime = (seconds: number): string => {
  if (seconds === 0) return "-";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Retourne les classes CSS en fonction du score
 */
const getScoreClass = (score: number): string => {
  if (score >= 80) return "bg-green-500/20 text-green-400";
  if (score >= 50) return "bg-yellow-500/20 text-yellow-400";
  return "bg-red-500/20 text-red-400";
};

/**
 * Retourne les classes CSS en fonction du résultat
 */
const getResultClass = (result: string | null): string => {
  switch (result) {
    case "win":
      return "bg-green-500/20 text-green-400";
    case "lose":
      return "bg-red-500/20 text-red-400";
    case "draw":
      return "bg-yellow-500/20 text-yellow-400";
    case "abort":
      return "bg-gray-500/20 text-gray-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
};

/**
 * Retourne le label du résultat
 */
const getResultLabel = (result: string | null): string => {
  switch (result) {
    case "win":
      return "Victoire";
    case "lose":
      return "Défaite";
    case "draw":
      return "Égalité";
    case "abort":
      return "Abandonné";
    default:
      return "-";
  }
};
</script>

<style scoped>
/* Profile page visual polish */
.avatar-shadow {
  box-shadow:
    0 10px 30px rgba(139, 92, 246, 0.18),
    inset 0 -6px 18px rgba(0, 0, 0, 0.2);
}

.neon-pink {
  text-shadow:
    0 0 8px #ff66c8,
    0 0 18px #ff66c8;
}
.neon-blue {
  text-shadow:
    0 0 8px #6bffff,
    0 0 18px #6bffff;
}
.neon-green {
  text-shadow:
    0 0 8px #bbff42,
    0 0 18px #bbff42;
}

.rounded-2xl {
  border-radius: 1rem;
}

/* Table polish */
table th {
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
table tbody tr:hover {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.02),
    rgba(255, 255, 255, 0.01)
  );
}

/* subtle shimmer for CTA buttons */
.shimmer-small {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.04),
    transparent
  );
  background-size: 200% 100%;
  animation: shimmer 3s ease-in-out infinite;
}

.stat-card {
  transition:
    transform 200ms ease,
    box-shadow 200ms ease;
}
.stat-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(2, 6, 23, 0.6);
}

.avatar-shadow,
.stat-card {
  will-change: transform, box-shadow;
}

/* Additional home-like utilities */
.hero-title-glow {
  text-shadow:
    0 0 28px rgba(255, 255, 255, 0.06),
    0 0 48px rgba(139, 92, 246, 0.08);
}
.bg-MyBlack {
  background-color: #07070b;
}

/* Ensure the page background is dark to avoid white strip at bottom */
:global(html, body, #__nuxt, #__layout) {
  height: 100%;
  margin: 0;
  background-color: #07070b;
}
</style>
