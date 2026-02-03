<script setup lang="ts">
/**
 * FakeButton - Bouton troll qui s'échappe au survol
 * Plus l'utilisateur essaie de cliquer, plus le chaos augmente.
 * Un mini-jeu frustrant mais amusant qui contribue à la dégradation.
 * IMPOSSIBLE À ATTRAPER - Le bouton se téléporte avant tout contact.
 */
import { reactive, computed, ref, onMounted, onUnmounted } from "vue";

const emit = defineEmits<{
  clicked: [attempts: number];
  interaction: [weight: number];
}>();

const MESSAGES = [
  "GAGNER",
  "Clique ici",
  "Non, ici",
  "Raté !",
  "Trop lent...",
  "éphémère",
  "Encore...",
  "Tu y es presque",
  "Ou pas 😏",
  "Continue...",
  "éphémère",
  "Haha",
  "Impossible !",
  "Peut-être...",
  "Non",
  "éphémère",
  "Abandon ?",
  "Jamais !",
  "🎭 éphémère",
  "Trop facile",
  "Pour toi ?",
  "Non non",
];

const button = reactive({
  x: 50,
  y: 50,
  attempts: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
  isGhost: false,
  lastMoveTime: 0,
});

// Zone du conteneur pour calculer les distances
const containerRef = ref<HTMLElement | null>(null);
const buttonRef = ref<HTMLElement | null>(null);

// Intervalle pour le mouvement autonome
let autonomousInterval: ReturnType<typeof setInterval> | null = null;
let mouseX = 50;
let mouseY = 50;

const currentMessage = computed(() => {
  if (button.attempts === 0) return "GAGNER";
  // Afficher "éphémère" plus souvent
  if (button.attempts % 4 === 0) return "éphémère";
  return MESSAGES[Math.min(button.attempts, MESSAGES.length - 1)] || "éphémère";
});

// Calcule la distance entre deux points
const distance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

// Téléporte le bouton loin de la souris
const teleportAway = (fromX: number, fromY: number, urgent = false) => {
  const now = Date.now();
  // Limiter la fréquence des mouvements (sauf urgence)
  if (!urgent && now - button.lastMoveTime < 50) return;
  button.lastMoveTime = now;

  // Trouver une position le plus loin possible de la souris
  let bestX = button.x;
  let bestY = button.y;
  let bestDistance = 0;

  // Essayer plusieurs positions aléatoires et garder la plus éloignée
  for (let i = 0; i < 8; i++) {
    const testX = 10 + Math.random() * 80;
    const testY = 25 + Math.random() * 65;
    const dist = distance(fromX, fromY, testX, testY);

    if (dist > bestDistance) {
      bestDistance = dist;
      bestX = testX;
      bestY = testY;
    }
  }

  // Ajouter des effets visuels selon le nombre de tentatives
  if (button.attempts > 5) {
    button.rotation = (Math.random() - 0.5) * 30;
    button.scale = 0.7 + Math.random() * 0.6;
  }

  if (button.attempts > 10) {
    // Parfois devenir semi-transparent
    button.opacity = 0.4 + Math.random() * 0.6;
  }

  if (button.attempts > 15) {
    // Mode fantôme - disparaît brièvement
    if (Math.random() < 0.3) {
      button.isGhost = true;
      setTimeout(() => {
        button.isGhost = false;
      }, 200);
    }
  }

  button.x = bestX;
  button.y = bestY;
};

// Suivre la souris dans le conteneur
const handleMouseMove = (e: MouseEvent) => {
  if (!containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  mouseX = ((e.clientX - rect.left) / rect.width) * 100;
  mouseY = ((e.clientY - rect.top) / rect.height) * 100;

  // Distance entre la souris et le bouton
  const dist = distance(mouseX, mouseY, button.x, button.y);

  // Si la souris est proche, FUIR IMMÉDIATEMENT
  // Zone de détection augmente avec les tentatives
  const detectionZone = Math.min(35, 20 + button.attempts * 1.5);

  if (dist < detectionZone) {
    button.attempts++;
    emit("interaction", 2);
    teleportAway(mouseX, mouseY, true);
  }
};

// Le bouton bouge tout seul périodiquement
const startAutonomousMovement = () => {
  autonomousInterval = setInterval(() => {
    if (button.attempts > 3) {
      // Bouger légèrement même sans interaction
      const jitterX = (Math.random() - 0.5) * 10;
      const jitterY = (Math.random() - 0.5) * 10;
      button.x = Math.max(10, Math.min(90, button.x + jitterX));
      button.y = Math.max(25, Math.min(90, button.y + jitterY));
    }

    // Vérifier si la souris est proche et fuir
    const dist = distance(mouseX, mouseY, button.x, button.y);
    if (dist < 25) {
      teleportAway(mouseX, mouseY, false);
    }
  }, 150);
};

const handleHover = () => {
  // Double téléportation pour être sûr d'échapper
  button.attempts++;
  emit("interaction", 3);
  teleportAway(mouseX, mouseY, true);

  // Téléportation de sécurité après 50ms
  setTimeout(() => {
    teleportAway(mouseX, mouseY, true);
  }, 50);
};

const handleClick = () => {
  // Si par miracle quelqu'un clique, c'est probablement un lag
  // On téléporte quand même et on ne compte pas comme victoire
  button.attempts += 2;
  emit("interaction", 15);
  emit("clicked", button.attempts);

  // Triple téléportation de punition
  teleportAway(mouseX, mouseY, true);
  setTimeout(() => teleportAway(mouseX, mouseY, true), 30);
  setTimeout(() => teleportAway(mouseX, mouseY, true), 60);
};

const getButtonColor = computed(() => {
  if (button.attempts < 3) return "bg-MyGreen";
  if (button.attempts < 7) return "bg-MyYellow";
  if (button.attempts < 12) return "bg-MyPink";
  if (button.attempts < 20) return "bg-red-500";
  return "bg-purple-600"; // Mode chaos
});

onMounted(() => {
  startAutonomousMovement();
});

onUnmounted(() => {
  if (autonomousInterval) {
    clearInterval(autonomousInterval);
  }
});
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-48 rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden select-none"
    @mousemove="handleMouseMove"
  >
    <div class="absolute top-4 left-4 pointer-events-none">
      <h3 class="text-lg font-bricolage text-white">
        🎯 Le Bouton Insaisissable
      </h3>
      <p class="text-xs text-zinc-500 mt-1">Essaie de cliquer dessus...</p>
    </div>

    <!-- Compteur de tentatives -->
    <div
      v-if="button.attempts > 0"
      class="absolute top-4 right-4 text-sm font-mono text-zinc-400 pointer-events-none"
    >
      Tentatives: {{ button.attempts }}
    </div>

    <!-- Le bouton qui s'échappe - IMPOSSIBLE À ATTRAPER -->
    <button
      ref="buttonRef"
      class="absolute px-4 py-2 rounded-lg font-bricolage font-bold text-black transition-all duration-75 ease-out select-none"
      :class="[getButtonColor, { 'animate-pulse': button.attempts > 10 }]"
      :style="{
        left: `${button.x}%`,
        top: `${button.y}%`,
        transform: `translate(-50%, -50%) rotate(${button.rotation}deg) scale(${button.scale})`,
        opacity: button.isGhost ? 0 : button.opacity,
        pointerEvents: button.isGhost ? 'none' : 'auto',
      }"
      @mouseenter="handleHover"
      @touchstart.prevent="handleHover"
      @click.prevent="handleClick"
    >
      {{ currentMessage }}
    </button>

    <!-- Message d'encouragement basé sur les tentatives -->
    <div
      v-if="button.attempts >= 5"
      class="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-center pointer-events-none"
      :class="button.attempts >= 15 ? 'text-purple-400' : 'text-MyPink'"
    >
      <span v-if="button.attempts >= 20" class="animate-pulse">
        🌀 Le bouton est... éphémère 🌀
      </span>
      <span v-else-if="button.attempts >= 15" class="animate-pulse">
        🔥 C'est vraiment impossible !
      </span>
      <span v-else-if="button.attempts >= 10">
        😏 Tu n'y arriveras jamais...
      </span>
      <span v-else> 🎭 Continue d'essayer... </span>
    </div>

    <!-- Indices visuels de chaos -->
    <div
      v-if="button.attempts >= 15"
      class="absolute inset-0 pointer-events-none bg-gradient-to-br from-purple-500/5 to-pink-500/5 animate-pulse"
    />
  </div>
</template>
