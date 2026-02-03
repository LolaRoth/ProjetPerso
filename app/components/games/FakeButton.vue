<script setup lang="ts">
/**
 * FakeButton - Bouton troll VRAIMENT IMPOSSIBLE à attraper
 * Le bouton anticipe les mouvements et fuit à une vitesse surhumaine.
 * Un mini-jeu frustrant qui contribue à la dégradation.
 */
import { reactive, computed, ref, onMounted, onUnmounted } from "vue";

const emit = defineEmits<{
  clicked: [attempts: number];
  interaction: [weight: number];
}>();

// Messages VRAIMENT aléatoires - beaucoup plus variés
const MESSAGES = [
  "GAGNER",
  "Clique ici !",
  "Non, ici →",
  "Raté !",
  "Trop lent...",
  "🎭 éphémère",
  "Encore...",
  "Presque !",
  "Ou pas 😏",
  "Continue...",
  "✨ éphémère",
  "Haha !",
  "Impossible !",
  "Peut-être ?",
  "Nope",
  "éphémère ✨",
  "Abandon ?",
  "Jamais !",
  "🌀 éphémère",
  "Facile ?",
  "Pour toi ?",
  "Non non !",
  "Essaie encore",
  "Par là →",
  "← Non, là !",
  "↑ En haut ?",
  "↓ En bas !",
  "🎯 Rate !",
  "Trop prévisible",
  "Je t'ai vu",
  "Anticipé !",
  "💨 Woosh",
  "Bye bye",
  "À plus !",
  "Reviens !",
  "éphémère 🎭",
  "Catch me",
  "If you can",
  "Nah",
  "Nope nope",
  "🚀 Zoom",
  "Disparu !",
  "Ici... ou pas",
  "Devine !",
  "Mauvais choix",
  "Réessaye",
  "Toujours pas",
  "🎪 éphémère",
  "Perdu !",
  "Game over ?",
  "Never !",
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
  messageIndex: 0, // Index pour les messages aléatoires
});

// Zone du conteneur pour calculer les distances
const containerRef = ref<HTMLElement | null>(null);

// Intervalle pour le mouvement autonome
let autonomousInterval: ReturnType<typeof setInterval> | null = null;
let predictionInterval: ReturnType<typeof setInterval> | null = null;
let mouseX = 50;
let mouseY = 50;
let lastMouseX = 50;
let lastMouseY = 50;
let mouseVelocityX = 0;
let mouseVelocityY = 0;

// Message VRAIMENT aléatoire
const currentMessage = computed(() => {
  if (button.attempts === 0) return "GAGNER";
  // Utiliser l'index stocké pour avoir un message aléatoire
  return MESSAGES[button.messageIndex] || "éphémère";
});

// Génère un nouvel index de message aléatoire
const randomizeMessage = () => {
  // Toujours un message différent du précédent
  let newIndex = Math.floor(Math.random() * MESSAGES.length);
  while (newIndex === button.messageIndex && MESSAGES.length > 1) {
    newIndex = Math.floor(Math.random() * MESSAGES.length);
  }
  button.messageIndex = newIndex;
  
  // 25% de chance d'afficher "éphémère"
  if (Math.random() < 0.25) {
    const ephemereMessages = MESSAGES.filter(m => m.toLowerCase().includes("éphémère"));
    if (ephemereMessages.length > 0) {
      button.messageIndex = MESSAGES.indexOf(ephemereMessages[Math.floor(Math.random() * ephemereMessages.length)]);
    }
  }
};

// Calcule la distance entre deux points
const distance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

// Prédit où la souris va aller
const predictMousePosition = () => {
  // Prédire 200ms dans le futur
  const predictedX = mouseX + mouseVelocityX * 10;
  const predictedY = mouseY + mouseVelocityY * 10;
  return { x: predictedX, y: predictedY };
};

// Téléporte le bouton loin de la souris ET de sa trajectoire prédite
const teleportAway = (fromX: number, fromY: number, urgent = false) => {
  const now = Date.now();
  // Réaction ULTRA rapide - seulement 10ms de délai
  if (!urgent && now - button.lastMoveTime < 10) return;
  button.lastMoveTime = now;

  // Prédire où la souris va aller
  const predicted = predictMousePosition();
  
  // Trouver une position le plus loin possible de la souris ET de sa prédiction
  let bestX = button.x;
  let bestY = button.y;
  let bestScore = 0;

  // Essayer BEAUCOUP plus de positions pour trouver la meilleure
  for (let i = 0; i < 20; i++) {
    const testX = 8 + Math.random() * 84;
    const testY = 22 + Math.random() * 68;
    
    // Score basé sur la distance à la souris actuelle ET prédite
    const distFromMouse = distance(fromX, fromY, testX, testY);
    const distFromPredicted = distance(predicted.x, predicted.y, testX, testY);
    const distFromCurrent = distance(button.x, button.y, testX, testY);
    
    // Favoriser les positions éloignées de tout
    const score = distFromMouse * 1.5 + distFromPredicted * 2 + distFromCurrent * 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestX = testX;
      bestY = testY;
    }
  }

  // Effets visuels chaotiques
  if (button.attempts > 3) {
    button.rotation = (Math.random() - 0.5) * 45;
    button.scale = 0.6 + Math.random() * 0.8;
  }

  if (button.attempts > 8) {
    button.opacity = 0.3 + Math.random() * 0.7;
  }

  if (button.attempts > 12) {
    // Mode fantôme plus fréquent
    if (Math.random() < 0.4) {
      button.isGhost = true;
      setTimeout(() => {
        button.isGhost = false;
        // Re-téléporter à la réapparition !
        teleportAway(mouseX, mouseY, true);
      }, 100 + Math.random() * 150);
    }
  }

  button.x = bestX;
  button.y = bestY;
  
  // Changer le message à chaque téléportation
  randomizeMessage();
};

// Suivre la souris dans le conteneur avec calcul de vélocité
const handleMouseMove = (e: MouseEvent) => {
  if (!containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  const newMouseX = ((e.clientX - rect.left) / rect.width) * 100;
  const newMouseY = ((e.clientY - rect.top) / rect.height) * 100;
  
  // Calculer la vélocité de la souris
  mouseVelocityX = newMouseX - mouseX;
  mouseVelocityY = newMouseY - mouseY;
  
  lastMouseX = mouseX;
  lastMouseY = mouseY;
  mouseX = newMouseX;
  mouseY = newMouseY;

  // Distance entre la souris et le bouton
  const dist = distance(mouseX, mouseY, button.x, button.y);

  // Zone de détection ÉNORME - augmente rapidement avec les tentatives
  const detectionZone = Math.min(50, 25 + button.attempts * 2);

  if (dist < detectionZone) {
    button.attempts++;
    emit("interaction", 2);
    teleportAway(mouseX, mouseY, true);
    
    // Double téléportation si la souris est très proche
    if (dist < 15) {
      setTimeout(() => teleportAway(mouseX, mouseY, true), 20);
    }
  }
};

// Le bouton bouge tout seul et ANTICIPE
const startAutonomousMovement = () => {
  // Mouvement principal - plus rapide
  autonomousInterval = setInterval(() => {
    // Bouger de manière erratique
    if (button.attempts > 2) {
      const jitterX = (Math.random() - 0.5) * 15;
      const jitterY = (Math.random() - 0.5) * 15;
      button.x = Math.max(8, Math.min(92, button.x + jitterX));
      button.y = Math.max(22, Math.min(88, button.y + jitterY));
    }

    // Vérifier si la souris est proche et fuir
    const dist = distance(mouseX, mouseY, button.x, button.y);
    if (dist < 30) {
      teleportAway(mouseX, mouseY, true);
    }
  }, 80); // Plus rapide: 80ms au lieu de 150ms
  
  // Système de prédiction - anticipe les mouvements
  predictionInterval = setInterval(() => {
    if (button.attempts > 5) {
      const predicted = predictMousePosition();
      const distToPredicted = distance(predicted.x, predicted.y, button.x, button.y);
      
      // Si la souris SE DIRIGE vers nous, fuir avant qu'elle arrive !
      if (distToPredicted < 40 && (Math.abs(mouseVelocityX) > 1 || Math.abs(mouseVelocityY) > 1)) {
        teleportAway(predicted.x, predicted.y, true);
      }
    }
  }, 50); // Vérification très fréquente
};

const handleHover = () => {
  // Triple téléportation ultra-rapide
  button.attempts++;
  emit("interaction", 3);
  teleportAway(mouseX, mouseY, true);

  // Téléportations de sécurité en rafale
  setTimeout(() => teleportAway(mouseX, mouseY, true), 15);
  setTimeout(() => teleportAway(mouseX, mouseY, true), 30);
};

const handleClick = () => {
  // Si par miracle quelqu'un clique, c'est probablement un lag/bug
  // Punition maximale !
  button.attempts += 3;
  emit("interaction", 20);
  emit("clicked", button.attempts);

  // Quintuple téléportation de punition
  teleportAway(mouseX, mouseY, true);
  setTimeout(() => teleportAway(mouseX, mouseY, true), 10);
  setTimeout(() => teleportAway(mouseX, mouseY, true), 25);
  setTimeout(() => teleportAway(mouseX, mouseY, true), 40);
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
  if (predictionInterval) {
    clearInterval(predictionInterval);
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
