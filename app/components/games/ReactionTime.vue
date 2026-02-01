<script setup lang="ts">
/**
 * ReactionTime - Test de temps de réaction
 * Le joueur doit cliquer dès que l'écran devient vert.
 * Mesure le temps de réaction en millisecondes.
 */
import { ref, onUnmounted } from "vue";

const emit = defineEmits<{
  complete: [reactionTime: number, isBest: boolean];
  interaction: [weight: number];
}>();

type GameState = "waiting" | "ready" | "go" | "result" | "tooEarly";

const state = ref<GameState>("waiting");
const startTime = ref(0);
const reactionTime = ref(0);
const bestTime = ref(999999);

let reactionTimeout: ReturnType<typeof setTimeout> | null = null;

const startGame = () => {
  if (state.value === "ready" || state.value === "go") return;

  state.value = "ready";

  // Délai aléatoire entre 1 et 4 secondes
  const delay = 1000 + Math.random() * 3000;

  reactionTimeout = setTimeout(() => {
    state.value = "go";
    startTime.value = Date.now();
  }, delay);
};

const handleClick = () => {
  if (state.value === "ready") {
    // Cliqué trop tôt !
    if (reactionTimeout) clearTimeout(reactionTimeout);
    state.value = "tooEarly";
    emit("interaction", 1);

    setTimeout(() => {
      state.value = "waiting";
    }, 2000);
  } else if (state.value === "go") {
    const time = Date.now() - startTime.value;
    reactionTime.value = time;
    state.value = "result";

    const isBest = time < bestTime.value;
    if (isBest) {
      bestTime.value = time;
    }

    emit("interaction", Math.max(1, 20 - time / 50));
    emit("complete", time, isBest);

    setTimeout(() => {
      state.value = "waiting";
    }, 3000);
  }
};

const getMessage = () => {
  switch (state.value) {
    case "waiting":
      return "Clique pour commencer";
    case "ready":
      return "Attends le vert...";
    case "go":
      return "CLIQUE !";
    case "result":
      return `${reactionTime.value} ms`;
    case "tooEarly":
      return "Trop tôt ! 😅";
  }
};

const getBackgroundClass = () => {
  switch (state.value) {
    case "waiting":
      return "bg-zinc-800";
    case "ready":
      return "bg-red-600";
    case "go":
      return "bg-MyGreen";
    case "result":
      return "bg-MyCyan";
    case "tooEarly":
      return "bg-MyYellow";
  }
};

const getScoreClass = () => {
  if (reactionTime.value < 200) return "text-MyGreen";
  if (reactionTime.value < 300) return "text-MyCyan";
  if (reactionTime.value < 400) return "text-MyYellow";
  return "text-MyPink";
};

onUnmounted(() => {
  if (reactionTimeout) clearTimeout(reactionTimeout);
});
</script>

<template>
  <div
    class="flex flex-col gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
  >
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-bricolage text-white">⚡ Temps de Réaction</h3>
      <span v-if="bestTime < 999999" class="text-sm text-MyGreen font-mono">
        Record: {{ bestTime }}ms
      </span>
    </div>

    <!-- Zone de jeu cliquable -->
    <button
      class="h-40 rounded-xl flex flex-col items-center justify-center transition-colors duration-200 border-2 border-white/10"
      :class="getBackgroundClass()"
      @click="state === 'waiting' ? startGame() : handleClick()"
    >
      <span
        class="text-2xl font-bricolage font-bold"
        :class="state === 'result' ? getScoreClass() : 'text-white'"
      >
        {{ getMessage() }}
      </span>

      <span v-if="state === 'result'" class="text-sm text-white/70 mt-2">
        {{
          reactionTime < 200
            ? "🔥 Excellent !"
            : reactionTime < 300
              ? "👍 Bien !"
              : reactionTime < 400
                ? "😊 Pas mal"
                : "🐢 Tu peux mieux faire"
        }}
      </span>
    </button>

    <!-- Échelle de référence -->
    <div class="flex justify-between text-xs text-zinc-500 font-mono px-2">
      <span class="text-MyGreen">&lt;200ms 🔥</span>
      <span class="text-MyCyan">200-300ms 👍</span>
      <span class="text-MyYellow">300-400ms 😊</span>
      <span class="text-MyPink">&gt;400ms 🐢</span>
    </div>
  </div>
</template>
