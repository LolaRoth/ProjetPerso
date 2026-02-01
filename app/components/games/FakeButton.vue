<script setup lang="ts">
/**
 * FakeButton - Bouton troll qui s'échappe au survol
 * Plus l'utilisateur essaie de cliquer, plus le chaos augmente.
 * Un mini-jeu frustrant mais amusant qui contribue à la dégradation.
 */
import { reactive, computed } from "vue";

const emit = defineEmits<{
  clicked: [attempts: number];
  interaction: [weight: number];
}>();

const MESSAGES = [
  "GAGNER",
  "Clique ici",
  "Non, ici",
  "Raté",
  "Trop lent",
  "Encore essaye...",
  "Tu y es presque",
  "Ou pas",
  "Continue...",
  "Abandonne pas",
  "Haha",
  "Impossible",
  "Peut-être...",
  "Non",
];

const button = reactive({
  x: 50,
  y: 50,
  attempts: 0,
});

const currentMessage = computed(() => {
  if (button.attempts === 0) return "GAGNER";
  return MESSAGES[Math.min(button.attempts, MESSAGES.length - 1)] || "Non";
});

const handleHover = () => {
  button.attempts++;
  emit("interaction", 2);

  // Nouvelle position aléatoire (reste dans les limites)
  button.x = 10 + Math.random() * 80;
  button.y = 10 + Math.random() * 80;
};

const handleClick = () => {
  button.attempts++;
  emit("interaction", 10);
  emit("clicked", button.attempts);

  // Légèrement bouger après le clic
  button.x = 10 + Math.random() * 80;
  button.y = 10 + Math.random() * 80;
};

const getButtonColor = computed(() => {
  if (button.attempts < 3) return "bg-MyGreen hover:bg-MyGreen/80";
  if (button.attempts < 7) return "bg-MyYellow hover:bg-MyYellow/80";
  if (button.attempts < 12) return "bg-MyPink hover:bg-MyPink/80";
  return "bg-red-500 hover:bg-red-400";
});
</script>

<template>
  <div
    class="relative h-48 rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden"
  >
    <div class="absolute top-4 left-4">
      <h3 class="text-lg font-bricolage text-white">
        🎯 Le Bouton Insaisissable
      </h3>
      <p class="text-xs text-zinc-500 mt-1">Essaie de cliquer dessus...</p>
    </div>

    <!-- Compteur de tentatives -->
    <div
      v-if="button.attempts > 0"
      class="absolute top-4 right-4 text-sm font-mono text-zinc-400"
    >
      Tentatives: {{ button.attempts }}
    </div>

    <!-- Le bouton qui s'échappe -->
    <button
      class="absolute px-4 py-2 rounded-lg font-bricolage font-bold text-black transition-all duration-150 ease-out transform hover:scale-110"
      :class="getButtonColor"
      :style="{
        left: `${button.x}%`,
        top: `${button.y}%`,
        transform: 'translate(-50%, -50%)',
      }"
      @mouseenter="handleHover"
      @touchstart.prevent="handleHover"
      @click="handleClick"
    >
      {{ currentMessage }}
    </button>

    <!-- Message d'encouragement basé sur les tentatives -->
    <div
      v-if="button.attempts >= 10"
      class="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-MyPink animate-pulse"
    >
      {{ button.attempts >= 15 ? "🔥 Le chaos augmente !" : "😏 Continue..." }}
    </div>
  </div>
</template>
