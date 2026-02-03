<script setup lang="ts">
/**
 * ClickChallenge - Mini-jeu de clics rapides
 * L'utilisateur doit atteindre un nombre cible de clics avant la fin du temps.
 * Le timer ne démarre qu'au premier clic pour une expérience plus équitable.
 * La difficulté augmente à chaque victoire !
 */
import { ref, computed, onUnmounted } from "vue";

const props = defineProps<{
  degradationLevel: number;
}>();

const emit = defineEmits<{
  complete: [won: boolean, score: number, timeSpent: number];
  interaction: [weight: number];
}>();

// Compteur de victoires pour augmenter la difficulté
const wins = ref(0);
const baseTarget = 12; // Objectif de départ

// État du jeu
const state = ref({
  target: baseTarget,
  current: 0,
  active: false,
  started: false,
  timeLeft: 5,
});

// INDICE SECRET: Affiche "⏳" quand il reste 2 secondes
const showHourglassHint = ref(false);

// Position du bouton qui bouge avec la dégradation
const buttonOffset = ref({ x: 0, y: 0 });
let moveInterval: ReturnType<typeof setInterval> | null = null;

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
  // Calcul de l'objectif basé sur les victoires + dégradation
  // Chaque victoire ajoute 3 clics, la dégradation ajoute jusqu'à 10 clics
  const targetFromWins = baseTarget + wins.value * 3;
  const targetFromDegradation = Math.floor(props.degradationLevel * 10);

  state.value = {
    target: targetFromWins + targetFromDegradation,
    current: 0,
    active: true,
    started: false,
    timeLeft: 5,
  };

  // Réinitialiser la position du bouton
  buttonOffset.value = { x: 0, y: 0 };

  // Démarrer le mouvement du bouton si dégradation > 0.5
  if (props.degradationLevel > 0.5 && !moveInterval) {
    startButtonMovement();
  }
};

// Fait bouger le bouton de manière erratique quand le site est dégradé
const startButtonMovement = () => {
  if (moveInterval) clearInterval(moveInterval);

  moveInterval = setInterval(() => {
    if (!state.value.active || !state.value.started) {
      buttonOffset.value = { x: 0, y: 0 };
      return;
    }

    // Amplitude du mouvement basée sur la dégradation (max 30px à 100% dégradation)
    const amplitude = (props.degradationLevel - 0.5) * 60;
    const speed = 0.5 + props.degradationLevel * 2;

    buttonOffset.value = {
      x:
        Math.sin(Date.now() * 0.005 * speed) * amplitude +
        Math.random() * amplitude * 0.3,
      y:
        Math.cos(Date.now() * 0.007 * speed) * amplitude * 0.6 +
        Math.random() * amplitude * 0.2,
    };
  }, 50);
};

const stopButtonMovement = () => {
  if (moveInterval) {
    clearInterval(moveInterval);
    moveInterval = null;
  }
  buttonOffset.value = { x: 0, y: 0 };
};

const startTimer = () => {
  if (state.value.started) return;
  state.value.started = true;

  timerInterval = setInterval(() => {
    state.value.timeLeft--;

    // INDICE SECRET: Affiche sablier à 2 secondes
    if (state.value.timeLeft === 2) {
      showHourglassHint.value = true;
      setTimeout(() => {
        showHourglassHint.value = false;
      }, 500);
    }

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

  stopButtonMovement();

  const won = state.value.current >= state.value.target;

  // Incrémenter le compteur de victoires si gagné
  if (won) {
    wins.value++;
  }

  emit("complete", won, state.value.current, 5 - state.value.timeLeft);

  state.value.active = false;
  state.value.started = false;
};

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  stopButtonMovement();
});
</script>

<template>
  <div
    class="flex flex-col items-center gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
  >
    <div class="flex items-center justify-between w-full">
      <h3 class="text-lg font-bricolage text-white">⚡ Défi Clic</h3>
      <!-- Niveau de difficulté -->
      <span v-if="wins > 0" class="text-xs font-mono text-MyYellow">
        🏆 Niveau {{ wins + 1 }}
      </span>
    </div>

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
        class="text-MyPink relative"
        :class="{ 'animate-pulse': state.timeLeft <= 2 }"
      >
        {{ state.timeLeft }}s
        <!-- Indice sablier furtif -->
        <span
          v-if="showHourglassHint"
          class="absolute -right-6 top-0 text-MyCyan/60 animate-bounce"
          >⏳</span
        >
      </span>
    </div>

    <!-- Conteneur du bouton avec mouvement -->
    <div class="w-full relative" style="min-height: 60px">
      <!-- Bouton de clic qui bouge quand le site est dégradé -->
      <button
        class="w-full py-4 rounded-xl font-bricolage text-lg transition-colors active:scale-95"
        :class="[
          state.active
            ? 'bg-MyPink text-white hover:bg-MyPink/80'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
          {
            'shadow-lg shadow-MyPink/30':
              state.started && degradationLevel > 0.5,
          },
        ]"
        :style="{
          transform:
            state.started && degradationLevel > 0.5
              ? `translate(${buttonOffset.x}px, ${buttonOffset.y}px)`
              : 'none',
          transition: 'background-color 0.2s, box-shadow 0.2s',
        }"
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
    </div>

    <!-- Avertissement si le bouton bouge -->
    <p
      v-if="state.started && degradationLevel > 0.5"
      class="text-xs text-orange-400/70 font-bricolage animate-pulse"
    >
      ⚠️ Le bouton devient instable...
    </p>

    <!-- Résultat -->
    <p
      v-if="!state.active && state.current > 0"
      class="text-sm font-bricolage"
      :class="state.current >= state.target ? 'text-MyGreen' : 'text-red-400'"
    >
      {{
        state.current >= state.target
          ? `✅ Bravo ! Niveau ${wins} atteint`
          : "❌ Pas assez rapide"
      }}
    </p>

    <!-- Record -->
    <p v-if="wins > 0 && !state.active" class="text-xs text-zinc-500 font-mono">
      Record: Niveau {{ wins }}
    </p>
  </div>
</template>
