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
  caught: []; // Émis si quelqu'un réussit vraiment à cliquer - déclenche une conséquence catastrophique
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
    const ephemereMessages = MESSAGES.filter((m) =>
      m.toLowerCase().includes("éphémère"),
    );
    if (ephemereMessages.length > 0) {
      const randomEphemere =
        ephemereMessages[Math.floor(Math.random() * ephemereMessages.length)];
      if (randomEphemere) {
        const idx = MESSAGES.indexOf(randomEphemere);
        if (idx >= 0) button.messageIndex = idx;
      }
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
  // Réaction INSTANTANÉE - aucun délai
  if (!urgent && now - button.lastMoveTime < 5) return;
  button.lastMoveTime = now;

  // Prédire où la souris va aller (plus loin dans le futur)
  const predicted = predictMousePosition();
  const predictedFar = {
    x: mouseX + mouseVelocityX * 20,
    y: mouseY + mouseVelocityY * 20,
  };

  // Trouver une position le plus loin possible de TOUT
  let bestX = button.x;
  let bestY = button.y;
  let bestScore = 0;

  // Essayer ÉNORMÉMENT de positions pour trouver la meilleure
  for (let i = 0; i < 40; i++) {
    const testX = 5 + Math.random() * 90;
    const testY = 20 + Math.random() * 70;

    // Score basé sur TOUTES les positions dangereuses
    const distFromMouse = distance(fromX, fromY, testX, testY);
    const distFromPredicted = distance(predicted.x, predicted.y, testX, testY);
    const distFromPredictedFar = distance(
      predictedFar.x,
      predictedFar.y,
      testX,
      testY,
    );
    const distFromCurrent = distance(button.x, button.y, testX, testY);

    // Pondération forte sur les prédictions
    const score =
      distFromMouse * 2 +
      distFromPredicted * 3 +
      distFromPredictedFar * 2.5 +
      distFromCurrent * 0.5;

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
      setTimeout(
        () => {
          button.isGhost = false;
          // Re-téléporter à la réapparition !
          teleportAway(mouseX, mouseY, true);
        },
        100 + Math.random() * 150,
      );
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

  // Zone de détection MASSIVE - augmente très rapidement
  const detectionZone = Math.min(65, 30 + button.attempts * 3);

  if (dist < detectionZone) {
    button.attempts++;
    emit("interaction", 2);
    teleportAway(mouseX, mouseY, true);

    // Triple téléportation TOUJOURS
    setTimeout(() => teleportAway(mouseX, mouseY, true), 8);
    setTimeout(() => teleportAway(mouseX, mouseY, true), 16);

    // Quadruple si très proche
    if (dist < 20) {
      setTimeout(() => teleportAway(mouseX, mouseY, true), 24);
    }
  }
};

// Le bouton bouge tout seul et ANTICIPE de manière PARANOÏAQUE
const startAutonomousMovement = () => {
  // Mouvement principal - ULTRA rapide
  autonomousInterval = setInterval(() => {
    // Bouger de manière erratique dès le début
    if (button.attempts > 1) {
      const jitterX = (Math.random() - 0.5) * 20;
      const jitterY = (Math.random() - 0.5) * 20;
      button.x = Math.max(5, Math.min(95, button.x + jitterX));
      button.y = Math.max(20, Math.min(90, button.y + jitterY));
    }

    // Vérifier si la souris est proche et fuir - zone plus large
    const dist = distance(mouseX, mouseY, button.x, button.y);
    if (dist < 40) {
      teleportAway(mouseX, mouseY, true);
    }
  }, 120); // Mouvement modéré: 120ms

  // Système de prédiction PARANOÏAQUE
  predictionInterval = setInterval(() => {
    if (button.attempts > 2) {
      const predicted = predictMousePosition();
      const distToPredicted = distance(
        predicted.x,
        predicted.y,
        button.x,
        button.y,
      );

      // Fuir si la souris se dirige vers nous - seuil très bas
      if (
        distToPredicted < 50 &&
        (Math.abs(mouseVelocityX) > 0.5 || Math.abs(mouseVelocityY) > 0.5)
      ) {
        teleportAway(predicted.x, predicted.y, true);
      }

      // Fuir aussi si la souris est simplement en mouvement vers nous
      const currentDist = distance(mouseX, mouseY, button.x, button.y);
      if (currentDist < 45) {
        teleportAway(mouseX, mouseY, true);
      }
    }
  }, 80); // Vérification modérée: 80ms
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
  // IMPOSSIBLE ! Si quelqu'un arrive à cliquer, c'est un exploit
  // Déclencher une CONSÉQUENCE CATASTROPHIQUE sur le site !
  button.attempts += 5;
  emit("interaction", 50); // Énorme boost de chaos
  emit("clicked", button.attempts);
  emit("caught"); // Signal pour déclencher la conséquence

  // Déchaîner le chaos visuel
  button.isGhost = true;
  button.opacity = 0;

  // Réapparaître après un moment avec téléportations en rafale
  setTimeout(() => {
    button.isGhost = false;
    button.opacity = 1;
    // Rafale de téléportations
    for (let i = 0; i < 10; i++) {
      setTimeout(() => teleportAway(mouseX, mouseY, true), i * 15);
    }
  }, 500);
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
