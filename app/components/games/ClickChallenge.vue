<script setup lang="ts">
/**
 * ClickChallenge - Mini-jeu de clics rapides
 * L'utilisateur doit atteindre un nombre cible de clics avant la fin du temps.
 * Le timer ne démarre qu'au premier clic pour une expérience plus équitable.
 */
import { ref, computed, onUnmounted } from "vue";

const props = defineProps<{
  degradationLevel: number;
}>();

const emit = defineEmits<{
  complete: [won: boolean, score: number, timeSpent: number];
  interaction: [weight: number];
}>();

// État du jeu
const state = ref({
  target: 15,
  current: 0,
  active: false,
  started: false,
  timeLeft: 5,
});

let timerInterval: ReturnType<typeof setInterval> | null = null;

// Texte de progression affiché
const progressText = computed(() => {
  if (!state.value.active) return "Clique pour commencer";
  if (!state.value.started)
    return `Objectif: ${state.value.target} clics en 5s`;
  return `${state.value.current} / ${state.value.target}`;
});

// Couleur de la barre de progression
const progressColor = computed(() => {
  const ratio = state.value.current / state.value.target;
  if (ratio >= 1) return "bg-MyGreen";
  if (ratio >= 0.7) return "bg-MyYellow";
  return "bg-MyPink";
});

const prepare = () => {
  state.value = {
    target: 15 + Math.floor(props.degradationLevel * 20),
    current: 0,
    active: true,
    started: false,
    timeLeft: 5,
  };
};

const startTimer = () => {
  if (state.value.started) return;
  state.value.started = true;

  timerInterval = setInterval(() => {
    state.value.timeLeft--;
    if (state.value.timeLeft <= 0) {
      endGame();
    }
  }, 1000);
};

const handleClick = () => {
  if (!state.value.active) {
    prepare();
    return;
  }

  if (!state.value.started) {
    startTimer();
  }

  state.value.current++;
  emit("interaction", 0.5);

  // Victoire immédiate si objectif atteint
  if (state.value.current >= state.value.target) {
    endGame();
  }
};

const endGame = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  const won = state.value.current >= state.value.target;
  emit("complete", won, state.value.current, 5 - state.value.timeLeft);

  state.value.active = false;
  state.value.started = false;
};

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<template>
  <div
    class="flex flex-col items-center gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
  >
    <h3 class="text-lg font-bricolage text-white">⚡ Défi Clic</h3>

    <!-- Barre de progression -->
    <div class="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
      <div
        class="h-full transition-all duration-100"
        :class="progressColor"
        :style="{
          width: `${Math.min(100, (state.current / state.target) * 100)}%`,
        }"
      />
    </div>

    <!-- Infos -->
    <div class="flex justify-between w-full text-sm font-mono">
      <span class="text-zinc-400">{{ progressText }}</span>
      <span
        v-if="state.started"
        class="text-MyPink"
        :class="{ 'animate-pulse': state.timeLeft <= 2 }"
      >
        {{ state.timeLeft }}s
      </span>
    </div>

    <!-- Bouton de clic -->
    <button
      class="w-full py-4 rounded-xl font-bricolage text-lg transition-all active:scale-95"
      :class="
        state.active
          ? 'bg-MyPink text-white hover:bg-MyPink/80'
          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
      "
      @click="handleClick"
    >
      {{
        state.active
          ? state.started
            ? "👆 CLIQUE !"
            : "▶️ Commencer"
          : "🎮 Jouer"
      }}
    </button>

    <!-- Résultat -->
    <p
      v-if="!state.active && state.current > 0"
      class="text-sm font-bricolage"
      :class="state.current >= state.target ? 'text-MyGreen' : 'text-red-400'"
    >
      {{ state.current >= state.target ? "✅ Bravo !" : "❌ Pas assez rapide" }}
    </p>
  </div>
</template>
