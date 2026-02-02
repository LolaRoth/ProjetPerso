<script setup lang="ts">
/**
 * Experience visuelle interactive - Trouve le bouton caché
 * Dégradation progressive jusqu'au chaos total
 */
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import type { GameId } from "../../types/supabase";

// Protection de la route - authentification obligatoire
definePageMeta({
  middleware: ["auth"],
});

const nuxtApp = useNuxtApp();
const router = useRouter();
const gsap = nuxtApp.$gsap as any;
const ScrollTrigger = nuxtApp.$ScrollTrigger as any;
const Draggable = nuxtApp.$Draggable as any;

// ===== SYSTÈME DE DESTRUCTION PROGRESSIVE (comme fin.vue) =====
const scrollOffset = ref(0);
let scrollAnimationFrame: number;
let isAnimating = true;

const animateScroll = () => {
  if (!isAnimating) return;
  scrollOffset.value += 0.5;
  scrollAnimationFrame = requestAnimationFrame(animateScroll);
};

// Génère des offsets aléatoires basés sur le niveau de destruction
const getDestructionOffset = (seed: number, maxOffset: number = 50) => {
  const chaos = degradationLevel.value;
  const randomX =
    Math.sin(seed * 12.9898 + scrollOffset.value * 0.01) * maxOffset * chaos;
  const randomY =
    Math.cos(seed * 78.233 + scrollOffset.value * 0.01) * maxOffset * chaos;
  const randomRotation =
    Math.sin(seed * 43.758 + scrollOffset.value * 0.02) * 30 * chaos;
  const randomScale = 1 + (Math.cos(seed * 93.989) - 0.5) * 0.3 * chaos;

  return {
    x: randomX,
    y: randomY,
    rotation: randomRotation,
    scale: Math.max(0.5, Math.min(1.5, randomScale)),
    opacity: Math.max(0.3, 1 - chaos * 0.2),
  };
};

// Style destructeur pour les éléments
const getDestructionStyle = (seed: number, maxOffset: number = 50) => {
  const offset = getDestructionOffset(seed, maxOffset);
  return {
    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotation}deg) scale(${offset.scale})`,
    opacity: offset.opacity,
    transition: "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
  };
};

// Style de destruction pour les jeux (plus intense)
const getGameDestructionStyle = (seed: number, intensity: number = 1) => {
  const level = degradationLevel.value;
  const maxOffset = 30 * intensity * level;
  const offset = getDestructionOffset(seed, maxOffset);

  return {
    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotation * 0.5}deg) scale(${offset.scale})`,
    filter:
      level > 0.5
        ? `hue-rotate(${Math.sin(scrollOffset.value * 0.05 + seed) * 20 * level}deg)`
        : "none",
    transition: "transform 0.3s ease, filter 0.5s ease",
  };
};

// ===== AUTH & GAME STATS =====
const { isAuthenticated } = useAuth();
const { recordSession } = useGameStats();

// Helper pour enregistrer une session si connecté
const saveGameSession = async (
  gameId: GameId,
  score: number,
  resultType: "win" | "lose" | "draw" | "abort",
  timeSpent?: number,
  extra?: Record<string, any>,
) => {
  if (!isAuthenticated.value) return;
  try {
    await recordSession({
      gameId,
      score,
      resultType,
      degradationLevel: Math.round(degradation.level * 100),
      loops: degradation.cycles,
      timeSpent: timeSpent ?? degradation.timeSpent,
      extra,
    });
  } catch (e) {
    console.error("Erreur sauvegarde session:", e);
  }
};

// ===== GAME STATE =====
const gameWon = ref(false);
const secretButtonVisible = ref(false);
const secretButtonPosition = ref({ x: 50, y: 50 });
const showHint = ref(false);
const hintsUsed = ref(0);

// ===== PAPILLON QUI VOLE PENDANT LE SCROLL =====
const butterflyProgress = ref(0);
const butterflyVisible = ref(false);

// ===== CURSOR REVEAL EFFECT (Background reveal through mask) =====
interface RevealCircle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
}

const revealCircles = ref<RevealCircle[]>([]);
let revealIdCounter = 0;
let lastRevealTime = 0;

// ===== MOUSE COLOR BLOBS (small colored glows under cursor) =====
const mouseBlobs = ref<
  {
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    opacity: number;
  }[]
>([]);
let mouseBlobId = 0;

const addMouseBlob = (x: number, y: number) => {
  // Désactivé - plus de cercle coloré sous la souris
  return;
};

// ===== PARTICLES (used for target hits and puzzle confetti) =====
const particles = ref<
  { id: number; x: number; y: number; color: string; size: number }[]
>([]);
let particleId = 0;

const spawnParticles = (x: number, y: number, color: string, count = 8) => {
  for (let i = 0; i < count; i++) {
    const id = particleId++;
    const size = 6 + Math.random() * 8;
    particles.value.push({
      id,
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      color,
      size,
    });

    // remove after short time
    setTimeout(
      () => {
        particles.value = particles.value.filter((p) => p.id !== id);
      },
      700 + Math.random() * 400,
    );
  }
};
const cursorColors: string[] = [
  "#FF66C8",
  "#6BFFFF",
  "#FFF746",
  "#BBFF42",
  "#FF8855",
  "#AA66FF",
];

// Index used to change revealed gradient based on cursor position
const cursorColorIndex = ref(0);
const gradientStops = computed(() => {
  const len = cursorColors.length;
  const idx = cursorColorIndex.value % len;
  return [
    cursorColors[idx % len],
    cursorColors[(idx + 1) % len],
    cursorColors[(idx + 2) % len],
    cursorColors[(idx + 3) % len],
    cursorColors[(idx + 4) % len],
  ];
});

// Smooth cursor color interpolation state (for fluid transitions)
const cursorSmooth = reactive({
  r: 255,
  g: 102,
  b: 200,
  tr: 255,
  tg: 102,
  tb: 200,
  str: "#FF66C8",
});

const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const bigint = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};

const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Cartoon cursor state
const cartoon = reactive({ x: 0, y: 0, tx: 0, ty: 0, scale: 1, visible: true });
let cursorRAF: number | null = null;
let cursorLoopRunning = false;

const startCursorLoop = () => {
  if (cursorLoopRunning) return;
  cursorLoopRunning = true;

  const loop = () => {
    // Smoothly follow target
    cartoon.x = lerp(cartoon.x, cartoon.tx, 0.18);
    cartoon.y = lerp(cartoon.y, cartoon.ty, 0.18);

    // gentle scale based on movement speed
    const dx = cartoon.tx - cartoon.x;
    const dy = cartoon.ty - cartoon.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    cartoon.scale = 1 + Math.min(0.18, dist / 120);

    // Smooth color interpolation
    cursorSmooth.r = lerp(cursorSmooth.r, cursorSmooth.tr, 0.08);
    cursorSmooth.g = lerp(cursorSmooth.g, cursorSmooth.tg, 0.08);
    cursorSmooth.b = lerp(cursorSmooth.b, cursorSmooth.tb, 0.08);
    cursorSmooth.str = rgbToHex(cursorSmooth.r, cursorSmooth.g, cursorSmooth.b);

    cursorRAF = requestAnimationFrame(loop);
  };

  loop();
};

const stopCursorLoop = () => {
  if (cursorRAF) {
    cancelAnimationFrame(cursorRAF);
    cursorRAF = null;
  }
  cursorLoopRunning = false;
};

// Couleurs fixes pour le jeu de séquence (les 4 premières)
const sequenceGameColors = ["#FF66C8", "#6BFFFF", "#FFF746", "#BBFF42"];

// Génère le chemin SVG pour le masque de révélation
const revealMaskPath = computed(() => {
  if (revealCircles.value.length === 0) return "";

  return revealCircles.value
    .map((circle) => {
      const r = circle.size / 2;
      return `M ${circle.x - r} ${circle.y}
              a ${r} ${r} 0 1 0 ${r * 2} 0
              a ${r} ${r} 0 1 0 -${r * 2} 0`;
    })
    .join(" ");
});

const addRevealCircle = (x: number, y: number) => {
  const now = Date.now();
  if (now - lastRevealTime < 30) return; // Plus lent pour garder le noir plus longtemps
  lastRevealTime = now;

  // Taille plus petite pour révéler moins de couleur
  const baseSize = 15 + degradation.level * 25;

  // Keep only a single reveal circle that follows the cursor
  const id = revealIdCounter++;
  revealCircles.value = [{ id, x, y, size: baseSize, opacity: 0.7 }];
};

// ===== DEGRADATION SYSTEM (utilise le composable global) =====
const {
  level: degradationLevel,
  phase: degradationPhase,
  scrollLoops,
  factors: degradationFactors,
  thresholds: degradationThresholds,
  isTransitioning: degradationTransitioning,
  updateScroll,
  addInteraction,
  startTimeTracking,
  stopTimeTracking,
  completeCycle,
  timeSpent: degradationTimeSpent,
} = useDegradation();

// Objet de compatibilité pour le code existant
const degradation = reactive({
  get level() {
    return degradationLevel.value;
  },
  set level(_v) {
    /* read-only */
  },
  cycles: 0,
  get scrollProgress() {
    return 0;
  },
  get timeSpent() {
    return degradationTimeSpent.value;
  },
  interactions: 0,
  clicks: 0,
  puzzlesSolved: 0,
  get phase() {
    return degradationPhase.value;
  },
});

// calculateLevel est maintenant géré par le composable
const calculateLevel = () => {
  // Le niveau est calculé automatiquement par useDegradation
  // Révéler le bouton secret quand on atteint 30% de dégradation
  if (degradationLevel.value > 0.3 && !secretButtonVisible.value) {
    secretButtonVisible.value = true;
    // Position en pixels par rapport au site (pas à l'écran)
    // Le site fait environ 10000px de haut, on place le bouton quelque part dedans
    secretButtonPosition.value = {
      x: 20 + Math.random() * 60, // % horizontal
      y: 2000 + Math.random() * 6000, // pixels depuis le haut du site
    };
  }
};

// Observer les changements de niveau pour déclencher les effets
watch(degradationLevel, () => {
  calculateLevel();
});

const addClick = () => {
  degradation.clicks++;
  addInteraction(1);
};

// Scroll to a game section by id (smooth)
const scrollToSection = (id: string) => {
  if (!document) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  addInteraction(1);
};

// ===== DYNAMIC ELEMENTS (appear/change with degradation) =====
interface GlitchText {
  id: number;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

interface FloatingShape {
  id: number;
  type: "circle" | "square" | "triangle" | "star";
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  speed: number;
}

interface WarningMessage {
  id: number;
  text: string;
  visible: boolean;
}

const glitchTexts = ref<GlitchText[]>([]);
const floatingShapes = ref<FloatingShape[]>([]);
// Decorative sprites that cover the whole viewport (rects, stars, circles, etc.)
interface DecorativeSprite {
  id: number;
  type: "rect" | "circle" | "star" | "diamond" | "plus" | "triangle";
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  vx: number; // horizontal velocity in % per tick
  vy: number; // vertical velocity in % per tick
}

const decorativeSprites = ref<DecorativeSprite[]>([]);

const initDecorativeSprites = (count = 36) => {
  const types: DecorativeSprite["type"][] = [
    "rect",
    "circle",
    "star",
    "diamond",
    "plus",
    "triangle",
  ];
  decorativeSprites.value = Array.from({ length: count }, (_, i) => {
    const size = 8 + Math.random() * 48;
    const vx = (Math.random() * 0.2 - 0.1) * (1 + size / 40); // small horizontal drift
    const vy = (Math.random() * 0.2 - 0.05) * (1 + size / 60); // small vertical drift
    const typeIndex = Math.floor(Math.random() * types.length);
    return {
      id: Date.now() + i,
      type: types[typeIndex] ?? "circle",
      x: Math.random() * 100,
      y: Math.random() * 100,
      size,
      color:
        cursorColors[Math.floor(Math.random() * cursorColors.length)] ||
        "#FF66C8",
      rotation: Math.random() * 360,
      vx,
      vy,
    };
  });
};

let decorativeInterval: ReturnType<typeof setInterval> | null = null;

const animateDecorativeSprites = () => {
  decorativeSprites.value.forEach((s) => {
    // movement affected by degradation level
    const factor = 1 + degradationLevel.value * 1.5;
    s.x += s.vx * factor;
    s.y += s.vy * factor;
    s.rotation += 0.2 * (s.vx + s.vy) * factor;

    // Wrap around the viewport bounds (0..100)
    if (s.x < -10) s.x = 110;
    if (s.x > 110) s.x = -10;
    if (s.y < -10) s.y = 110;
    if (s.y > 110) s.y = -10;
  });
};
const warningMessages = ref<WarningMessage[]>([
  { id: 1, text: "⚠️ SYSTÈME INSTABLE", visible: false },
  { id: 2, text: "🔥 SURCHAUFFE DÉTECTÉE", visible: false },
  { id: 3, text: "💀 ERREUR CRITIQUE", visible: false },
  { id: 4, text: "🌀 RÉALITÉ FRAGMENTÉE", visible: false },
  { id: 5, text: "👁️ ON T'OBSERVE...", visible: false },
]);
const screenCracks = ref<{ id: number; x: number; y: number; angle: number }[]>(
  [],
);
const corruptedPixels = ref<
  { id: number; x: number; y: number; color: string }[]
>([]);

// Générer des éléments dynamiques basés sur le niveau de dégradation
const generateDynamicElements = () => {
  const level = degradation.level;

  // Glitch texts apparaissent à partir de 25%
  if (level > 0.25 && glitchTexts.value.length < Math.floor(level * 8)) {
    const texts = [
      "ERROR",
      "NULL",
      "0x00FF",
      "VOID",
      "CHAOS",
      "???",
      "HELP",
      "RUN",
    ];
    glitchTexts.value.push({
      id: Date.now() + Math.random(),
      text: texts[Math.floor(Math.random() * texts.length)] || "ERROR",
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 12 + Math.random() * 24,
      color:
        cursorColors[Math.floor(Math.random() * cursorColors.length)] ||
        "#FF66C8",
    });
  }

  // Floating shapes apparaissent à partir de 35%
  if (level > 0.35 && floatingShapes.value.length < Math.floor(level * 15)) {
    const types: ("circle" | "square" | "triangle" | "star")[] = [
      "circle",
      "square",
      "triangle",
      "star",
    ];
    floatingShapes.value.push({
      id: Date.now() + Math.random(),
      type: types[Math.floor(Math.random() * types.length)] || "circle",
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 20 + Math.random() * 40,
      color:
        cursorColors[Math.floor(Math.random() * cursorColors.length)] ||
        "#FF66C8",
      rotation: Math.random() * 360,
      speed: 0.5 + Math.random() * 2,
    });
  }

  // Warning messages apparaissent aléatoirement à partir de 45%
  if (level > 0.45) {
    warningMessages.value.forEach((msg) => {
      if (!msg.visible && Math.random() < 0.01) {
        msg.visible = true;
        setTimeout(
          () => {
            msg.visible = false;
          },
          2000 + Math.random() * 3000,
        );
      }
    });
  }

  // Screen cracks à partir de 60%
  if (
    level > 0.6 &&
    screenCracks.value.length < Math.floor((level - 0.6) * 20)
  ) {
    screenCracks.value.push({
      id: Date.now() + Math.random(),
      x: Math.random() * 100,
      y: Math.random() * 100,
      angle: Math.random() * 360,
    });
  }

  // Corrupted pixels à partir de 75%
  if (
    level > 0.75 &&
    corruptedPixels.value.length < Math.floor((level - 0.75) * 100)
  ) {
    corruptedPixels.value.push({
      id: Date.now() + Math.random(),
      x: Math.random() * 100,
      y: Math.random() * 100,
      color:
        cursorColors[Math.floor(Math.random() * cursorColors.length)] ||
        "#FF66C8",
    });
  }
};

// Animation des formes flottantes
const animateFloatingShapes = () => {
  floatingShapes.value.forEach((shape) => {
    shape.y -= shape.speed * 0.1;
    shape.rotation += shape.speed;
    if (shape.y < -10) {
      shape.y = 110;
      shape.x = Math.random() * 100;
    }
  });
};

// ===== FALLING ELEMENTS (when broken) =====
interface FallingElement {
  id: number;
  x: number;
  y: number;
  rotation: number;
  type: string;
  color: string;
  fallen: boolean;
}

const fallingElements = ref<FallingElement[]>([]);

const initFallingElements = () => {
  const types = ["square", "circle", "triangle", "text"];
  fallingElements.value = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    rotation: Math.random() * 360,
    type: types[i % types.length] || "square",
    color: cursorColors[i % cursorColors.length] || "#FF66C8",
    fallen: false,
  }));
};

// Faire tomber les éléments progressivement
const triggerFall = () => {
  if (degradation.phase !== "broken") return;

  const notFallen = fallingElements.value.filter((el) => !el.fallen);
  if (notFallen.length === 0) return;

  const toFall = notFallen[Math.floor(Math.random() * notFallen.length)];
  if (toFall && gsap) {
    toFall.fallen = true;
    const el = document.querySelector(`[data-falling-id="${toFall.id}"]`);
    if (el) {
      gsap.to(el, {
        y: window.innerHeight + 200,
        rotation: toFall.rotation + Math.random() * 720 - 360,
        opacity: 0,
        duration: 1.5 + Math.random(),
        ease: "power2.in",
      });
    }
  }
};

// ===== INTERACTIVE PUZZLE: Color Sequence (FIXED) =====
const colorSequence = ref<string[]>([]);
const playerSequence = ref<string[]>([]);
const sequenceLevel = ref(1);
const showingSequence = ref(false);
const sequenceMessage = ref("Clique sur JOUER pour commencer");
const activeSequenceIndex = ref(-1); // Index de la couleur actuellement affichée
const sequenceButtonRefs = ref<HTMLElement[]>([]);

const generateSequence = () => {
  colorSequence.value = [];
  for (let i = 0; i < sequenceLevel.value + 2; i++) {
    colorSequence.value.push(
      sequenceGameColors[
        Math.floor(Math.random() * sequenceGameColors.length)
      ] || "#FF66C8",
    );
  }
};

const startSequenceGame = async () => {
  if (showingSequence.value) return;

  playerSequence.value = [];
  generateSequence();
  showingSequence.value = true;
  sequenceMessage.value = "👀 Mémorise la séquence...";

  // Show sequence with visual feedback
  for (let i = 0; i < colorSequence.value.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    activeSequenceIndex.value = sequenceGameColors.indexOf(
      colorSequence.value[i] || "",
    );

    // Animation du bouton actif
    const colorIndex = sequenceGameColors.indexOf(colorSequence.value[i] || "");
    const btn = document.getElementById(`seq-btn-${colorIndex}`);
    if (btn && gsap) {
      gsap.fromTo(
        btn,
        { scale: 1, boxShadow: "0 0 0 rgba(255,255,255,0)" },
        {
          scale: 1.3,
          boxShadow: `0 0 30px ${colorSequence.value[i]}`,
          duration: 0.25,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut",
        },
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    activeSequenceIndex.value = -1;
  }

  showingSequence.value = false;
  sequenceMessage.value = "🎮 À toi de reproduire !";
};

const handleSequenceClick = (color: string, index: number) => {
  if (showingSequence.value) return;
  if (colorSequence.value.length === 0) {
    sequenceMessage.value = "Clique sur JOUER d'abord !";
    return;
  }

  // Animation de clic
  const btn = document.getElementById(`seq-btn-${index}`);
  if (btn && gsap) {
    gsap.fromTo(
      btn,
      { scale: 1 },
      { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 },
    );
  }

  playerSequence.value.push(color);
  addInteraction(2);

  const idx = playerSequence.value.length - 1;
  if (playerSequence.value[idx] !== colorSequence.value[idx]) {
    sequenceMessage.value = "❌ Raté ! Clique JOUER pour réessayer";
    // Enregistrer la défaite
    saveGameSession(
      "color-sequence",
      sequenceLevel.value * 10,
      "lose",
      undefined,
      {
        level: sequenceLevel.value,
        sequenceLength: colorSequence.value.length,
      },
    );
    playerSequence.value = [];
    colorSequence.value = [];
    sequenceLevel.value = Math.max(1, sequenceLevel.value - 1);
    return;
  }

  if (playerSequence.value.length === colorSequence.value.length) {
    sequenceMessage.value = `✅ Bravo ! Niveau ${sequenceLevel.value} réussi !`;
    // Enregistrer la victoire
    const score = sequenceLevel.value * 20 + colorSequence.value.length * 5;
    saveGameSession("color-sequence", score, "win", undefined, {
      level: sequenceLevel.value,
      sequenceLength: colorSequence.value.length,
    });
    sequenceLevel.value++;
    degradation.puzzlesSolved++;
    calculateLevel();
    playerSequence.value = [];
    colorSequence.value = [];
  } else {
    sequenceMessage.value = `🎮 Continue... (${playerSequence.value.length}/${colorSequence.value.length})`;
  }
};

// ===== INTERACTIVE: Click Counter Challenge =====
const clickChallenge = ref({
  target: 20,
  current: 0,
  active: false,
  started: false, // Timer démarre uniquement au premier clic
  timeLeft: 5,
});
let clickChallengeInterval: ReturnType<typeof setInterval> | null = null;

const prepareClickChallenge = () => {
  // Prépare le jeu mais ne démarre pas le timer
  clickChallenge.value = {
    target: 15 + Math.floor(degradation.level * 20),
    current: 0,
    active: true,
    started: false,
    timeLeft: 5,
  };
};

const startClickChallengeTimer = () => {
  if (clickChallenge.value.started) return;
  clickChallenge.value.started = true;

  clickChallengeInterval = setInterval(() => {
    clickChallenge.value.timeLeft--;
    if (clickChallenge.value.timeLeft <= 0) {
      if (clickChallengeInterval) clearInterval(clickChallengeInterval);
      const won = clickChallenge.value.current >= clickChallenge.value.target;
      saveGameSession(
        "click-challenge",
        clickChallenge.value.current,
        won ? "win" : "lose",
        5,
        {
          target: clickChallenge.value.target,
          current: clickChallenge.value.current,
        },
      );
      if (won) {
        degradation.puzzlesSolved++;
        calculateLevel();
      }
      clickChallenge.value.active = false;
      clickChallenge.value.started = false;
    }
  }, 1000);
};

const handleChallengeClick = () => {
  if (!clickChallenge.value.active) return;
  // Démarre le timer au premier clic
  if (!clickChallenge.value.started) {
    startClickChallengeTimer();
  }
  clickChallenge.value.current++;
  addInteraction(0.5);
};

// ===== INTERACTIVE: Draggable Blocks (PUZZLE AVANCÉ - 9 PIÈCES) =====
interface PuzzlePiece {
  id: number;
  color: string;
  emoji: string;
  shape: "square" | "circle" | "hexagon";
  rotation: number; // used for hexagon
  targetRotation: number;
  sizeVariant?: "small" | "medium" | "large"; // used for circles
  placed: boolean;
}

interface PuzzleZone {
  id: number;
  color: string;
  shape: "square" | "circle" | "hexagon";
  targetRotation: number;
  expectedSize?: "small" | "medium" | "large"; // for circles
  filled: boolean;
  filledBy: number | null;
}

const puzzlePieces = ref<PuzzlePiece[]>([
  {
    id: 1,
    color: "#FF66C8",
    emoji: "🎀",
    shape: "square",
    rotation: 0,
    targetRotation: 0,
    placed: false,
  },
  {
    id: 2,
    color: "#6BFFFF",
    emoji: "💎",
    shape: "circle",
    rotation: 0,
    targetRotation: 0,
    sizeVariant: "medium",
    placed: false,
  },
  {
    id: 3,
    color: "#FFF746",
    emoji: "⭐",
    shape: "hexagon",
    rotation: 180,
    targetRotation: 0,
    placed: false,
  },
  {
    id: 4,
    color: "#BBFF42",
    emoji: "🍀",
    shape: "square",
    rotation: 0,
    targetRotation: 0,
    placed: false,
  },
  {
    id: 5,
    color: "#FF8855",
    emoji: "🔥",
    shape: "circle",
    rotation: 0,
    targetRotation: 0,
    sizeVariant: "small",
    placed: false,
  },
  {
    id: 6,
    color: "#AA66FF",
    emoji: "🌙",
    shape: "hexagon",
    rotation: 90,
    targetRotation: 0,
    placed: false,
  },
  {
    id: 7,
    color: "#FF66C8",
    emoji: "💖",
    shape: "circle",
    rotation: 0,
    targetRotation: 0,
    sizeVariant: "large",
    placed: false,
  },
  {
    id: 8,
    color: "#6BFFFF",
    emoji: "❄️",
    shape: "hexagon",
    rotation: 270,
    targetRotation: 0,
    placed: false,
  },
  {
    id: 9,
    color: "#FFF746",
    emoji: "🌟",
    shape: "square",
    rotation: 0,
    targetRotation: 0,
    placed: false,
  },
]);

const puzzleZones = ref<PuzzleZone[]>([
  {
    id: 1,
    color: "#FF66C8",
    shape: "square",
    targetRotation: 0,
    filled: false,
    filledBy: null,
  },
  {
    id: 2,
    color: "#6BFFFF",
    shape: "circle",
    targetRotation: 0,
    expectedSize: "medium",
    filled: false,
    filledBy: null,
  },
  {
    id: 3,
    color: "#FFF746",
    shape: "hexagon",
    targetRotation: 0,
    filled: false,
    filledBy: null,
  },
  {
    id: 4,
    color: "#BBFF42",
    shape: "square",
    targetRotation: 0,
    filled: false,
    filledBy: null,
  },
  {
    id: 5,
    color: "#FF8855",
    shape: "circle",
    targetRotation: 0,
    expectedSize: "small",
    filled: false,
    filledBy: null,
  },
  {
    id: 6,
    color: "#AA66FF",
    shape: "hexagon",
    targetRotation: 0,
    filled: false,
    filledBy: null,
  },
  {
    id: 7,
    color: "#FF66C8",
    shape: "circle",
    targetRotation: 0,
    expectedSize: "large",
    filled: false,
    filledBy: null,
  },
  {
    id: 8,
    color: "#6BFFFF",
    shape: "hexagon",
    targetRotation: 0,
    filled: false,
    filledBy: null,
  },
  {
    id: 9,
    color: "#FFF746",
    shape: "square",
    targetRotation: 0,
    filled: false,
    filledBy: null,
  },
]);

const puzzleMessage = ref(
  "Glisse chaque pièce vers sa zone correspondante (même couleur + même forme). Clique droit pour tourner !",
);
const currentDraggedPiece = ref<number | null>(null);
const dragOverZone = ref<number | null>(null);
const puzzleCompleted = ref(0); // Nombre de puzzles complétés

// Rotate only hexagon pieces (right-click)
const rotatePiece = (pieceId: number, e: Event) => {
  e.preventDefault();
  const piece = puzzlePieces.value.find((p) => p.id === pieceId);
  if (piece && !piece.placed && piece.shape === "hexagon") {
    piece.rotation = (piece.rotation + 90) % 360;
    addInteraction(1);
  }
};

// Cycle size variant for circle pieces on double-click
const cycleCircleSize = (pieceId: number, e?: Event) => {
  if (e) e.stopPropagation();
  const piece = puzzlePieces.value.find((p) => p.id === pieceId);
  if (!piece || piece.placed || piece.shape !== "circle") return;
  const order: ("small" | "medium" | "large")[] = ["small", "medium", "large"];
  const current = piece.sizeVariant || "medium";
  const next = order[(order.indexOf(current) + 1) % order.length];
  piece.sizeVariant = next;
  addInteraction(1);
};

const handleDragStart = (pieceId: number) => {
  currentDraggedPiece.value = pieceId;
};

const handleDragEnd = () => {
  currentDraggedPiece.value = null;
  dragOverZone.value = null;
};

const handleDragOver = (e: DragEvent, zoneId: number) => {
  e.preventDefault();
  dragOverZone.value = zoneId;
};

const handleDragLeave = () => {
  dragOverZone.value = null;
};

const handleDrop = (e: DragEvent, zone: PuzzleZone) => {
  e.preventDefault();
  dragOverZone.value = null;

  if (currentDraggedPiece.value === null || zone.filled) return;

  const piece = puzzlePieces.value.find(
    (p) => p.id === currentDraggedPiece.value,
  );
  if (!piece) return;

  // Vérifier couleur, forme ET rotation
  const colorMatch = piece.color === zone.color;
  const shapeMatch = piece.shape === zone.shape;
  // size match for circles
  const sizeMatch =
    piece.shape === "circle"
      ? (piece.sizeVariant || "medium") === (zone.expectedSize || "medium")
      : true;
  // rotation only matters for hexagon
  const rotationMatch =
    piece.shape === "hexagon" ? piece.rotation === zone.targetRotation : true;

  if (colorMatch && shapeMatch && rotationMatch && sizeMatch) {
    piece.placed = true;
    zone.filled = true;
    zone.filledBy = piece.id;
    addInteraction(20);

    // Spawn confetti-like particles at zone center
    const zoneEl = document.querySelector(`[data-zone-id=\"zone-${zone.id}\"]`);
    const rect = zoneEl
      ? (zoneEl as HTMLElement).getBoundingClientRect()
      : null;
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    spawnParticles(cx, cy, piece.color || "#FF66C8", 12);

    const allPlaced = puzzlePieces.value.every((p) => p.placed);
    if (allPlaced) {
      puzzleMessage.value = "🎉 Parfait ! Puzzle complété !";
      puzzleCompleted.value++;
      degradation.puzzlesSolved += 3;
      calculateLevel();

      // Enregistrer la victoire du puzzle
      const score = 100 + puzzleCompleted.value * 20;
      saveGameSession("puzzle-blocks", score, "win", undefined, {
        puzzleNumber: puzzleCompleted.value,
        piecesCount: puzzlePieces.value.length,
      });

      // Reset puzzle après 2 secondes pour rejouer
      setTimeout(() => {
        resetPuzzle();
      }, 2500);
    } else {
      const remaining = puzzlePieces.value.filter((p) => !p.placed).length;
      puzzleMessage.value = `✅ Bien joué ! Encore ${remaining} pièce(s)`;
    }
  } else if (colorMatch && shapeMatch && !sizeMatch) {
    puzzleMessage.value =
      "🔄 Bonne pièce mais mauvaise taille ! Double-clic pour changer";
  } else if (colorMatch && shapeMatch && !rotationMatch) {
    puzzleMessage.value =
      "🔄 Bonne pièce mais mauvaise rotation ! Clique droit pour tourner";
  } else if (colorMatch && !shapeMatch) {
    puzzleMessage.value = "❌ Bonne couleur mais mauvaise forme !";
  } else if (!colorMatch && shapeMatch) {
    puzzleMessage.value = "❌ Bonne forme mais mauvaise couleur !";
  } else {
    puzzleMessage.value = "❌ Mauvaise pièce ! Vérifie la couleur et la forme";
  }

  setTimeout(() => {
    if (!puzzlePieces.value.every((p) => p.placed)) {
      puzzleMessage.value =
        "Glisse chaque pièce vers sa zone correspondante. Clique droit pour tourner !";
    }
  }, 2000);

  currentDraggedPiece.value = null;
};

const resetPuzzle = () => {
  // Réinitialiser les pièces avec des rotations/tailles aléatoires
  puzzlePieces.value.forEach((piece) => {
    piece.placed = false;
    if (piece.shape === "hexagon") {
      piece.rotation = [0, 90, 180, 270][
        Math.floor(Math.random() * 4)
      ] as number;
    } else if (piece.shape === "circle") {
      const sizes: ("small" | "medium" | "large")[] = [
        "small",
        "medium",
        "large",
      ];
      piece.sizeVariant = sizes[Math.floor(Math.random() * sizes.length)];
      piece.rotation = 0;
    } else {
      piece.rotation = 0;
    }
  });

  // Réinitialiser les zones
  puzzleZones.value.forEach((zone) => {
    zone.filled = false;
    zone.filledBy = null;
  });

  // Mélanger les pièces
  for (let i = puzzlePieces.value.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [puzzlePieces.value[i], puzzlePieces.value[j]] = [
      puzzlePieces.value[j] as PuzzlePiece,
      puzzlePieces.value[i] as PuzzlePiece,
    ];
  }

  puzzleMessage.value =
    "Nouveau puzzle ! Glisse chaque pièce vers sa zone correspondante.";
};

// ===== SLIDING PUZZLE (3x3) - AMÉLIORÉ avec stats =====
const gridSize = 3;
const slidingTiles = ref<number[]>([]); // 0 represents the empty slot
const slidingMessage = ref(
  "Choisis une image et clique sur Mélanger pour commencer !",
);

const slidingGame = ref({
  active: false,
  moves: 0,
  timer: 0,
  bestTime: 0,
  bestMoves: 0,
  puzzlesSolved: 0,
});

let slidingTimerInterval: ReturnType<typeof setInterval> | null = null;

// SVG-based image reconstruction: list of SVGs in public/svg
const svgFiles = ["/svg/flower-cart.svg", "/svg/tel-cart.svg"];
const selectedSvg = ref<string>(svgFiles[0] || "");

const selectSvg = (svg: string) => {
  selectedSvg.value = svg;
};

const tileBgStyle = (tileNumber: number) => {
  if (!tileNumber) return {};
  const originalIdx = tileNumber - 1;
  const row = Math.floor(originalIdx / gridSize);
  const col = originalIdx % gridSize;
  const posX = (col / (gridSize - 1)) * 100;
  const posY = (row / (gridSize - 1)) * 100;

  return {
    backgroundImage: `url(${selectedSvg.value})`,
    backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
    backgroundPosition: `${posX}% ${posY}%`,
    backgroundRepeat: "no-repeat",
  } as Record<string, string>;
};

const isSolved = (tiles: number[]) => {
  for (let i = 0; i < tiles.length - 1; i++) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[tiles.length - 1] === 0;
};

const countInversions = (arr: number[]) => {
  const flat = arr.filter((n) => n !== 0);
  let inv = 0;
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if ((flat[i] ?? 0) > (flat[j] ?? 0)) inv++;
    }
  }
  return inv;
};

const isSolvable = (tiles: number[]) => {
  const inv = countInversions(tiles);
  // For odd grid (3x3), puzzle is solvable if inversions even
  return inv % 2 === 0;
};

const initSliding = () => {
  slidingTiles.value = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  slidingGame.value.active = false;
  slidingGame.value.moves = 0;
  slidingGame.value.timer = 0;
  if (slidingTimerInterval) clearInterval(slidingTimerInterval);
  slidingMessage.value =
    "Choisis une image et clique sur Mélanger pour commencer !";
};

const shuffleSliding = () => {
  // Fisher-Yates shuffle until solvable and not solved
  let arr: number[] = [];
  do {
    arr = [...slidingTiles.value];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[j] as number;
      arr[j] = arr[i] as number;
      arr[i] = tmp;
    }
  } while (!isSolvable(arr) || isSolved(arr));

  slidingTiles.value = arr;

  // Reset and start the game
  slidingGame.value.active = true;
  slidingGame.value.moves = 0;
  slidingGame.value.timer = 0;
  slidingMessage.value = "🎮 C'est parti ! Remets les pièces dans l'ordre";

  // Start timer
  if (slidingTimerInterval) clearInterval(slidingTimerInterval);
  slidingTimerInterval = setInterval(() => {
    if (slidingGame.value.active) {
      slidingGame.value.timer++;
    }
  }, 1000);
};

const findEmpty = () => slidingTiles.value.findIndex((n) => n === 0);

const handleTileClick = async (idx: number) => {
  if (!slidingGame.value.active) return;

  const eIdx = findEmpty();
  const rowA = Math.floor(idx / gridSize);
  const colA = idx % gridSize;
  const rowB = Math.floor(eIdx / gridSize);
  const colB = eIdx % gridSize;

  const dist = Math.abs(rowA - rowB) + Math.abs(colA - colB);
  if (dist === 1) {
    // swap
    const a = slidingTiles.value[idx] as number;
    const b = slidingTiles.value[eIdx] as number;
    slidingTiles.value[idx] = b;
    slidingTiles.value[eIdx] = a;

    slidingGame.value.moves++;
    addInteraction(1);

    // check win
    if (isSolved(slidingTiles.value)) {
      slidingGame.value.active = false;
      if (slidingTimerInterval) clearInterval(slidingTimerInterval);

      slidingGame.value.puzzlesSolved++;

      // Check for new best records
      const isNewBestTime =
        slidingGame.value.bestTime === 0 ||
        slidingGame.value.timer < slidingGame.value.bestTime;
      const isNewBestMoves =
        slidingGame.value.bestMoves === 0 ||
        slidingGame.value.moves < slidingGame.value.bestMoves;

      if (isNewBestTime) {
        slidingGame.value.bestTime = slidingGame.value.timer;
      }
      if (isNewBestMoves) {
        slidingGame.value.bestMoves = slidingGame.value.moves;
      }

      // Calculate score based on time and moves
      const timeBonus = Math.max(0, 300 - slidingGame.value.timer * 2);
      const movesBonus = Math.max(0, 200 - slidingGame.value.moves * 3);
      const score = 100 + timeBonus + movesBonus;

      slidingMessage.value = `🎉 Bravo ! Résolu en ${slidingGame.value.timer}s et ${slidingGame.value.moves} coups ! Score: ${score}`;

      degradation.puzzlesSolved++;
      calculateLevel();

      spawnParticles(
        100 + Math.random() * 600,
        100 + Math.random() * 300,
        "#BBFF42",
        25,
      );

      // Save game session
      await saveGameSession(
        "puzzle-blocks",
        score,
        "win",
        slidingGame.value.timer,
        {
          moves: slidingGame.value.moves,
          puzzleType: "sliding-3x3",
          image: selectedSvg.value,
          isNewBestTime,
          isNewBestMoves,
          puzzleNumber: slidingGame.value.puzzlesSolved,
        },
      );
    }
  }
};

// initialize on load
initSliding();

const getShapeClipPath = (shape: string) => {
  switch (shape) {
    case "circle":
      return "circle(50% at 50% 50%)";
    case "hexagon":
      return "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
    default:
      return "none";
  }
};

const getShapeBorderRadius = (shape: string) => {
  switch (shape) {
    case "circle":
      return "50%";
    case "hexagon":
      return "0";
    default:
      return "12px";
  }
};

// ===== MEMORY GAME AVANCÉ (16 cartes, niveaux, timer) =====
interface MemoryCard {
  id: number;
  emoji: string;
  pairId: number;
  flipped: boolean;
  matched: boolean;
}

const memoryCards = ref<MemoryCard[]>([]);
const flippedCards = ref<number[]>([]);
const memoryMoves = ref(0);
const memoryGameActive = ref(false);
const memoryMessage = ref("Clique sur JOUER pour commencer");
const canFlipCard = ref(true);
const memoryLevel = ref(1);
const memoryTimer = ref(0);
const memoryBestTime = ref<Record<number, number>>({ 1: 999, 2: 999, 3: 999 });
const memoryCombo = ref(0);
const memoryMaxCombo = ref(0);
let memoryTimerInterval: ReturnType<typeof setInterval> | null = null;

const memoryEmojisPerLevel: Record<number, string[]> = {
  1: ["🎮", "🎯", "🎪", "🎨", "🎭", "🎸"], // 6 paires = 12 cartes
  2: ["🌟", "🌙", "☀️", "⭐", "🌈", "❄️", "🔥", "💧"], // 8 paires = 16 cartes
  3: ["🍎", "🍊", "🍋", "🍇", "🍓", "🍒", "🥝", "🍑", "🍌", "🫐"], // 10 paires = 20 cartes
};

const initMemoryGame = (level: number = memoryLevel.value) => {
  const emojis = memoryEmojisPerLevel[level] || memoryEmojisPerLevel[1];
  const pairs: { emoji: string; pairId: number }[] = [];

  emojis?.forEach((emoji, idx) => {
    pairs.push({ emoji, pairId: idx });
    pairs.push({ emoji, pairId: idx });
  });

  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [
      pairs[j] as { emoji: string; pairId: number },
      pairs[i] as { emoji: string; pairId: number },
    ];
  }

  memoryCards.value = pairs.map((pair, i) => ({
    id: i,
    emoji: pair.emoji,
    pairId: pair.pairId,
    flipped: false,
    matched: false,
  }));

  flippedCards.value = [];
  memoryMoves.value = 0;
  memoryTimer.value = 0;
  memoryCombo.value = 0;
  memoryMaxCombo.value = 0;
  memoryGameActive.value = true;
  memoryMessage.value = `Niveau ${level} - Trouve toutes les paires ! (${emojis ? emojis.length : 6} paires)`;
  canFlipCard.value = true;

  // Start timer
  if (memoryTimerInterval) clearInterval(memoryTimerInterval);
  memoryTimerInterval = setInterval(() => {
    memoryTimer.value++;
  }, 1000);
};

const selectMemoryLevel = (level: number) => {
  memoryLevel.value = level;
  initMemoryGame(level);
};

const getMemoryGridCols = computed(() => {
  const cardCount = memoryCards.value.length;
  if (cardCount <= 12) return 4;
  if (cardCount <= 16) return 4;
  return 5;
});

const flipCard = (card: MemoryCard) => {
  if (!memoryGameActive.value || !canFlipCard.value) return;
  if (card.flipped || card.matched) return;
  if (flippedCards.value.length >= 2) return;

  card.flipped = true;
  flippedCards.value.push(card.id);
  addInteraction(1);

  if (flippedCards.value.length === 2) {
    memoryMoves.value++;
    canFlipCard.value = false;

    const [first, second] = flippedCards.value;
    const firstCard = memoryCards.value.find((c) => c.id === first);
    const secondCard = memoryCards.value.find((c) => c.id === second);

    if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
      // Match!
      firstCard.matched = true;
      secondCard.matched = true;
      flippedCards.value = [];
      canFlipCard.value = true;
      memoryCombo.value++;
      if (memoryCombo.value > memoryMaxCombo.value) {
        memoryMaxCombo.value = memoryCombo.value;
      }
      addInteraction(10 + memoryCombo.value * 5);

      // Check if game is won
      if (memoryCards.value.every((c) => c.matched)) {
        if (memoryTimerInterval) clearInterval(memoryTimerInterval);

        // Update best time
        if (
          memoryTimer.value < (memoryBestTime.value[memoryLevel.value] || 999)
        ) {
          memoryBestTime.value[memoryLevel.value] = memoryTimer.value;
        }

        const bonusPoints = memoryLevel.value * 2;
        memoryMessage.value = `🎉 Niveau ${memoryLevel.value} gagné en ${memoryMoves.value} coups (${memoryTimer.value}s) ! Combo max: ${memoryMaxCombo.value}`;
        degradation.puzzlesSolved += bonusPoints;
        calculateLevel();
        memoryGameActive.value = false;
      }
    } else {
      // No match - reset combo
      memoryCombo.value = 0;
      setTimeout(() => {
        if (firstCard) firstCard.flipped = false;
        if (secondCard) secondCard.flipped = false;
        flippedCards.value = [];
        canFlipCard.value = true;
      }, 800);
    }
  }
};

// ===== NEW GAME: Reaction Time =====
const reactionGame = ref({
  state: "waiting" as "waiting" | "ready" | "go" | "result" | "tooEarly",
  startTime: 0,
  reactionTime: 0,
  bestTime: 999999,
});

let reactionTimeout: ReturnType<typeof setTimeout> | null = null;

const startReactionGame = () => {
  if (reactionGame.value.state === "ready" || reactionGame.value.state === "go")
    return;

  reactionGame.value.state = "ready";

  // Random delay between 1 and 4 seconds
  const delay = 1000 + Math.random() * 3000;

  reactionTimeout = setTimeout(() => {
    reactionGame.value.state = "go";
    reactionGame.value.startTime = Date.now();
  }, delay);
};

const handleReactionClick = () => {
  if (reactionGame.value.state === "ready") {
    // Clicked too early!
    if (reactionTimeout) clearTimeout(reactionTimeout);
    reactionGame.value.state = "tooEarly";
    setTimeout(() => {
      reactionGame.value.state = "waiting";
    }, 2000);
  } else if (reactionGame.value.state === "go") {
    const time = Date.now() - reactionGame.value.startTime;
    reactionGame.value.reactionTime = time;
    reactionGame.value.state = "result";

    if (time < reactionGame.value.bestTime) {
      reactionGame.value.bestTime = time;
    }

    addInteraction(Math.max(1, 20 - time / 50));

    if (time < 300) {
      degradation.puzzlesSolved++;
      calculateLevel();
    }

    setTimeout(() => {
      reactionGame.value.state = "waiting";
    }, 3000);
  }
};

// ===== NEW GAME: Typing Challenge =====
const typingGame = ref({
  active: false,
  started: false, // Timer démarre uniquement à la première frappe
  targetWord: "chaos",
  userInput: "",
  wordsCompleted: 0,
  timeLeft: 30,
  score: 0,
});

const typingWords = [
  "chaos",
  "pixel",
  "glitch",
  "neon",
  "cyber",
  "matrix",
  "bug",
  "code",
  "hack",
  "error",
  "crash",
  "debug",
  "loop",
  "data",
  "void",
];

let typingInterval: ReturnType<typeof setInterval> | null = null;

const prepareTypingGame = () => {
  if (typingGame.value.active) return;

  typingGame.value = {
    active: true,
    started: false,
    targetWord:
      typingWords[Math.floor(Math.random() * typingWords.length)] || "chaos",
    userInput: "",
    wordsCompleted: 0,
    timeLeft: 30,
    score: 0,
  };
};

const startTypingGameTimer = () => {
  if (typingGame.value.started) return;
  typingGame.value.started = true;

  typingInterval = setInterval(() => {
    typingGame.value.timeLeft--;
    if (typingGame.value.timeLeft <= 0) {
      endTypingGame();
    }
  }, 1000);
};

const handleTypingInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  typingGame.value.userInput = target.value;

  // Démarre le timer à la première frappe
  if (!typingGame.value.started && typingGame.value.userInput.length > 0) {
    startTypingGameTimer();
  }

  if (
    typingGame.value.userInput.toLowerCase() ===
    typingGame.value.targetWord.toLowerCase()
  ) {
    // Correct word!
    typingGame.value.wordsCompleted++;
    typingGame.value.score += typingGame.value.targetWord.length * 10;
    typingGame.value.userInput = "";
    typingGame.value.targetWord =
      typingWords[Math.floor(Math.random() * typingWords.length)] || "chaos";
    addInteraction(5);
  }
};

const endTypingGame = () => {
  if (typingInterval) clearInterval(typingInterval);

  const won = typingGame.value.wordsCompleted >= 5;
  // Enregistrer la session
  saveGameSession(
    "typing-game",
    typingGame.value.score,
    won ? "win" : "lose",
    30 - typingGame.value.timeLeft,
    {
      wordsCompleted: typingGame.value.wordsCompleted,
      timeLeft: typingGame.value.timeLeft,
    },
  );

  typingGame.value.active = false;
  typingGame.value.started = false;

  if (won) {
    degradation.puzzlesSolved++;
    calculateLevel();
  }
};

// ===== NEW GAME: Fake Victory Button (Troll Game) =====
const fakeButton = reactive({
  x: 50,
  y: 50,
  attempts: 0,
  escaped: false,
});

const fakeButtonMessages = [
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

const currentFakeMessage = computed(() => {
  if (fakeButton.attempts === 0) return "GAGNER";
  return (
    fakeButtonMessages[
      Math.min(fakeButton.attempts, fakeButtonMessages.length - 1)
    ] || ""
  );
});

const handleFakeButtonHover = () => {
  // Move button to a random position when user tries to hover/click
  fakeButton.attempts++;
  addInteraction(2);

  // Calculate new random position (keeping button within bounds)
  const newX = 10 + Math.random() * 80;
  const newY = 20 + Math.random() * 60;

  fakeButton.x = newX;
  fakeButton.y = newY;

  // After many attempts, add bonus degradation
  if (fakeButton.attempts >= 10 && fakeButton.attempts % 5 === 0) {
    degradation.puzzlesSolved += 0.5;
    calculateLevel();
  }
};

// When user actually clicks the button: increase chaos irreversibly
const handleFakeButtonClick = () => {
  // Track the click as an attempt too
  fakeButton.attempts++;

  // Add strong interaction weight so chaos increases and can't be undone
  addInteraction(10);

  // Increase persistent counters used by calculateLevel
  degradation.cycles += 3; // gives a visible cycle bonus
  degradation.interactions += 20;
  degradation.clicks += 10;
  degradation.puzzlesSolved += 1;

  // Slightly move the button to avoid immediate re-click
  fakeButton.x = 10 + Math.random() * 80;
  fakeButton.y = 20 + Math.random() * 60;

  // Visual feedback: spawn some particles near center
  try {
    spawnParticles(
      window.innerWidth / 2,
      window.innerHeight / 2,
      "#BBFF42",
      18,
    );
  } catch (e) {}

  // Recalculate level (will reflect the increases above)
  calculateLevel();
};

// ===== INTERACTIVE: Target Shooting (AMÉLIIORÉ) =====
interface Target {
  id: number;
  x: number;
  y: number;
  hit: boolean;
  size: number;
  lifetime: number;
  spawnTime: number;
}

const targets = ref<Target[]>([]);
const targetGame = ref({
  active: false,
  started: false, // Timer démarre au premier clic sur une cible
  score: 0,
  missed: 0,
  combo: 0,
  maxCombo: 0,
  timeLeft: 30,
  bestScore: 0,
  totalTargetsSpawned: 0,
  difficulty: "normal" as "easy" | "normal" | "hard",
});

let targetGameInterval: ReturnType<typeof setInterval> | null = null;
let targetGameSpawnInterval: ReturnType<typeof setInterval> | null = null;

const getDifficultySettings = () => {
  const settings = {
    easy: {
      spawnRate: 1500,
      lifetime: 3000,
      maxTargets: 4,
      pointsMultiplier: 1,
    },
    normal: {
      spawnRate: 1000,
      lifetime: 2000,
      maxTargets: 6,
      pointsMultiplier: 1.5,
    },
    hard: {
      spawnRate: 700,
      lifetime: 1200,
      maxTargets: 8,
      pointsMultiplier: 2,
    },
  };
  return settings[targetGame.value.difficulty];
};

const prepareTargetGame = (
  difficulty: "easy" | "normal" | "hard" = "normal",
) => {
  if (targetGame.value.active) return;

  targetGame.value = {
    active: true,
    started: false,
    score: 0,
    missed: 0,
    combo: 0,
    maxCombo: 0,
    timeLeft: 30,
    bestScore: targetGame.value.bestScore,
    totalTargetsSpawned: 0,
    difficulty,
  };
  targets.value = [];

  // Spawn quelques cibles pour montrer le jeu
  for (let i = 0; i < 3; i++) {
    spawnGameTarget();
  }
};

const startTargetGameTimer = () => {
  if (targetGame.value.started) return;
  targetGame.value.started = true;

  const settings = getDifficultySettings();

  // Timer countdown
  targetGameInterval = setInterval(() => {
    targetGame.value.timeLeft--;
    if (targetGame.value.timeLeft <= 0) {
      endTargetGame();
    }
  }, 1000);

  // Spawn targets
  targetGameSpawnInterval = setInterval(() => {
    spawnGameTarget();
  }, settings.spawnRate);
};

const spawnGameTarget = () => {
  if (!targetGame.value.active) return;

  const settings = getDifficultySettings();
  if (targets.value.filter((t) => !t.hit).length >= settings.maxTargets) return;

  const id = Date.now() + Math.floor(Math.random() * 1000);
  const size = 35 + Math.random() * 25;
  const lifetime = settings.lifetime + Math.random() * 500;

  const target: Target = {
    id,
    x: 8 + Math.random() * 84,
    y: 8 + Math.random() * 84,
    hit: false,
    size,
    lifetime,
    spawnTime: Date.now(),
  };

  targets.value.push(target);
  targetGame.value.totalTargetsSpawned++;

  // Auto-miss after lifetime
  setTimeout(() => {
    const t = targets.value.find((t) => t.id === id);
    if (t && !t.hit && targetGame.value.active) {
      targetGame.value.missed++;
      targetGame.value.combo = 0;
      targets.value = targets.value.filter((t) => t.id !== id);
    }
  }, lifetime);
};

const hitTarget = (id: number) => {
  const target = targets.value.find((t) => t.id === id);
  if (!target || target.hit) return;

  // Démarre le timer au premier clic sur une cible
  if (!targetGame.value.started) {
    startTargetGameTimer();
  }

  target.hit = true;

  const settings = getDifficultySettings();

  // Calculate points with combo and difficulty bonus
  const basePoints = 10;
  const comboBonus = Math.min(targetGame.value.combo * 2, 20);
  const timeBonus = Math.max(
    0,
    Math.floor((target.lifetime - (Date.now() - target.spawnTime)) / 100),
  );
  const points = Math.round(
    (basePoints + comboBonus + timeBonus) * settings.pointsMultiplier,
  );

  targetGame.value.score += points;
  targetGame.value.combo++;
  if (targetGame.value.combo > targetGame.value.maxCombo) {
    targetGame.value.maxCombo = targetGame.value.combo;
  }

  addInteraction(12 + points / 2);

  // Spawn colorful particles at target position
  spawnParticles(
    (target.x / 100) * window.innerWidth,
    (target.y / 100) * window.innerHeight,
    cursorColors[Math.floor(Math.random() * cursorColors.length)] || "#FF66C8",
    10 + Math.floor(Math.random() * 8),
  );

  // Animate hit element and remove
  const el = document.querySelector(`[data-target-id="${id}"]`);
  if (el && gsap) {
    gsap.fromTo(
      el,
      { scale: 1, opacity: 1 },
      {
        scale: 2.2,
        opacity: 0,
        duration: 0.35,
        ease: "power2.out",
        onComplete: () => {
          targets.value = targets.value.filter((t) => t.id !== id);
        },
      },
    );
  } else {
    targets.value = targets.value.filter((t) => t.id !== id);
  }
};

const endTargetGame = async () => {
  if (targetGameInterval) clearInterval(targetGameInterval);
  if (targetGameSpawnInterval) clearInterval(targetGameSpawnInterval);

  targetGame.value.active = false;

  // Update best score
  const isNewBest = targetGame.value.score > targetGame.value.bestScore;
  if (isNewBest) {
    targetGame.value.bestScore = targetGame.value.score;
  }

  // Add to degradation
  if (targetGame.value.score > 50) {
    degradation.puzzlesSolved++;
    calculateLevel();
  }

  // Calculate accuracy
  const accuracy =
    targetGame.value.totalTargetsSpawned > 0
      ? Math.round(
          ((targetGame.value.totalTargetsSpawned - targetGame.value.missed) /
            targetGame.value.totalTargetsSpawned) *
            100,
        )
      : 0;

  // Save game session
  await saveGameSession(
    "target-shooting",
    targetGame.value.score,
    targetGame.value.score >= 50 ? "win" : "lose",
    30,
    {
      targetsHit:
        targetGame.value.totalTargetsSpawned - targetGame.value.missed,
      targetsMissed: targetGame.value.missed,
      maxCombo: targetGame.value.maxCombo,
      accuracy,
      difficulty: targetGame.value.difficulty,
      isNewBest,
    },
  );

  // Clear remaining targets
  targets.value = [];
};

// ===== SECRET BUTTON =====
const handleSecretClick = async () => {
  if (!gameWon.value) {
    gameWon.value = true;

    // Save time spent to localStorage for the fin page
    try {
      localStorage.setItem("chaosTimeSpent", String(degradation.timeSpent));
    } catch (e) {}

    // Save the win session
    await saveGameSession(
      "secret-button",
      1000 + Math.round((1 - degradation.level) * 500), // Bonus for finding earlier
      "win",
      degradation.timeSpent,
      {
        hintsUsed: hintsUsed.value,
        degradationAtWin: Math.round(degradation.level * 100),
        interactions: degradation.interactions,
        clicks: degradation.clicks,
      },
    );

    // Brief flash animation then redirect to fin page
    if (gsap) {
      gsap.to("body", {
        backgroundColor: "#fff",
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          router.push("/fin");
        },
      });
    } else {
      // Fallback without gsap
      router.push("/fin");
    }
  }
};

const showHintFn = () => {
  // debug log to confirm invocation
  try {
    // eslint-disable-next-line no-console
    console.log("showHintFn invoked");
  } catch (e) {}
  showHint.value = true;
  hintsUsed.value++;
  setTimeout(() => {
    showHint.value = false;
  }, 3000);
};

const reloadPage = () => {
  if (typeof window !== "undefined") {
    window.location.reload();
  }
};

// Global shortcut for hint (press 'h' or 'H') to help debugging and accessibility
onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    // ignore when typing in inputs or textareas
    if (
      tag === "input" ||
      tag === "textarea" ||
      (e.target as HTMLElement)?.isContentEditable
    )
      return;
    if (e.key === "i" || e.key === "I") {
      showHintFn();
    }
  };
  window.addEventListener("keydown", onKey);
  onUnmounted(() => window.removeEventListener("keydown", onKey));
});

// ===== HIDDEN CATCH GAME (in horizontal scroll) =====
interface FallingStar {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
  caught: boolean;
}

const catchGame = reactive({
  active: false,
  score: 0,
  missed: 0,
  timeLeft: 20,
  bestScore: 0,
  combo: 0,
  maxCombo: 0,
});

const fallingStars = ref<FallingStar[]>([]);
let catchGameInterval: ReturnType<typeof setInterval> | null = null;
let catchGameSpawnInterval: ReturnType<typeof setInterval> | null = null;
let catchStarId = 0;

const startCatchGame = () => {
  if (catchGame.active) return;

  catchGame.active = true;
  catchGame.score = 0;
  catchGame.missed = 0;
  catchGame.timeLeft = 20;
  catchGame.combo = 0;
  catchGame.maxCombo = 0;
  fallingStars.value = [];

  // Timer countdown
  catchGameInterval = setInterval(() => {
    catchGame.timeLeft--;
    if (catchGame.timeLeft <= 0) {
      endCatchGame();
    }
  }, 1000);

  // Spawn stars
  catchGameSpawnInterval = setInterval(() => {
    spawnFallingStar();
  }, 600);

  // Animation loop for falling
  const animateStars = () => {
    if (!catchGame.active) return;

    fallingStars.value = fallingStars.value
      .map((star) => {
        if (star.caught) return star;
        return { ...star, y: star.y + star.speed };
      })
      .filter((star) => {
        if (star.y > 100 && !star.caught) {
          catchGame.missed++;
          catchGame.combo = 0;
          return false;
        }
        return star.y <= 110 || star.caught;
      });

    if (catchGame.active) {
      requestAnimationFrame(animateStars);
    }
  };

  requestAnimationFrame(animateStars);
};

const spawnFallingStar = () => {
  if (!catchGame.active) return;

  const colors = ["#FF66C8", "#6BFFFF", "#FFF746", "#BBFF42", "#FF8855"];
  const star: FallingStar = {
    id: catchStarId++,
    x: 10 + Math.random() * 80,
    y: -5,
    speed: 0.8 + Math.random() * 1.2 + (20 - catchGame.timeLeft) * 0.05,
    size: 30 + Math.random() * 20,
    color: colors[Math.floor(Math.random() * colors.length)] || "#FFF746",
    caught: false,
  };

  fallingStars.value.push(star);
};

const catchStar = (id: number) => {
  const star = fallingStars.value.find((s) => s.id === id);
  if (!star || star.caught) return;

  star.caught = true;
  catchGame.combo++;
  if (catchGame.combo > catchGame.maxCombo) {
    catchGame.maxCombo = catchGame.combo;
  }

  // Score with combo bonus
  const comboBonus = Math.floor(catchGame.combo / 3);
  catchGame.score += 10 + comboBonus * 5;

  // Spawn particles
  const rect = document
    .querySelector(`[data-star-id="${id}"]`)
    ?.getBoundingClientRect();
  if (rect) {
    spawnParticles(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      star.color,
      6,
    );
  }

  addInteraction(3);

  // Remove after animation
  setTimeout(() => {
    fallingStars.value = fallingStars.value.filter((s) => s.id !== id);
  }, 200);
};

const endCatchGame = () => {
  catchGame.active = false;

  if (catchGameInterval) {
    clearInterval(catchGameInterval);
    catchGameInterval = null;
  }
  if (catchGameSpawnInterval) {
    clearInterval(catchGameSpawnInterval);
    catchGameSpawnInterval = null;
  }

  if (catchGame.score > catchGame.bestScore) {
    catchGame.bestScore = catchGame.score;
  }

  // Boost degradation for playing hidden game
  degradation.puzzlesSolved++;
  calculateLevel();

  fallingStars.value = [];
};

// ===== REFS =====
const mainContainer = ref<HTMLElement | null>(null);
const heroTitle = ref<HTMLElement | null>(null);
const horizontalSection = ref<HTMLElement | null>(null);
const currentHorizontalPanel = ref(1);
const isClient = ref(false);
let timeInterval: ReturnType<typeof setInterval> | null = null;
let fallInterval: ReturnType<typeof setInterval> | null = null;
let dynamicElementsInterval: ReturnType<typeof setInterval> | null = null;
let floatingAnimationInterval: ReturnType<typeof setInterval> | null = null;

// ===== SYSTÈME DE COULEURS DYNAMIQUES =====
// Couleurs qui évoluent smoothement avec le niveau de dégradation

// Helper pour interpoler entre deux valeurs avec easing
const smoothLerp = (
  start: number,
  end: number,
  t: number,
  easing: "linear" | "easeIn" | "easeOut" | "easeInOut" = "easeOut",
) => {
  let easedT = t;
  switch (easing) {
    case "easeIn":
      easedT = t * t;
      break;
    case "easeOut":
      easedT = 1 - (1 - t) * (1 - t);
      break;
    case "easeInOut":
      easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      break;
  }
  return start + (end - start) * easedT;
};

// Palette de couleurs par phase avec transitions fluides
const phaseColors = computed(() => {
  const deg = degradation.level;

  // Seuils des phases
  const phases = {
    pristine: { min: 0, max: 0.12 },
    glitching: { min: 0.12, max: 0.3 },
    unstable: { min: 0.3, max: 0.5 },
    chaotic: { min: 0.5, max: 0.75 },
    broken: { min: 0.75, max: 1.0 },
  };

  // Couleurs de base pour chaque phase (HSL)
  // Format: [hue, saturation, lightness]
  type HSLTuple = [number, number, number];
  type ColorScheme = {
    primary: HSLTuple;
    secondary: HSLTuple;
    accent: HSLTuple;
  };

  const colorSchemes: Record<string, ColorScheme> = {
    pristine: {
      primary: [0, 0, 10], // Gris foncé
      secondary: [0, 0, 15],
      accent: [0, 0, 20],
    },
    glitching: {
      primary: [320, 70, 55], // Rose magenta doux
      secondary: [180, 60, 50], // Cyan doux
      accent: [55, 65, 55], // Jaune doux
    },
    unstable: {
      primary: [320, 80, 60], // Rose magenta
      secondary: [180, 75, 55], // Cyan
      accent: [55, 80, 58], // Jaune
    },
    chaotic: {
      primary: [320, 90, 65], // Rose magenta vif
      secondary: [180, 85, 60], // Cyan vif
      accent: [55, 90, 62], // Jaune vif
    },
    broken: {
      primary: [0, 95, 55], // Rouge intense
      secondary: [280, 90, 60], // Violet intense
      accent: [55, 95, 65], // Jaune intense
    },
  };

  // Déterminer la phase actuelle et calculer le progrès dans cette phase
  let currentPhase = "pristine";
  let nextPhase = "glitching";
  let phaseProgress = 0;

  if (deg < phases.pristine.max) {
    currentPhase = "pristine";
    nextPhase = "glitching";
    phaseProgress = deg / phases.pristine.max;
  } else if (deg < phases.glitching.max) {
    currentPhase = "glitching";
    nextPhase = "unstable";
    phaseProgress =
      (deg - phases.glitching.min) /
      (phases.glitching.max - phases.glitching.min);
  } else if (deg < phases.unstable.max) {
    currentPhase = "unstable";
    nextPhase = "chaotic";
    phaseProgress =
      (deg - phases.unstable.min) / (phases.unstable.max - phases.unstable.min);
  } else if (deg < phases.chaotic.max) {
    currentPhase = "chaotic";
    nextPhase = "broken";
    phaseProgress =
      (deg - phases.chaotic.min) / (phases.chaotic.max - phases.chaotic.min);
  } else {
    currentPhase = "broken";
    nextPhase = "broken";
    phaseProgress = Math.min(
      1,
      (deg - phases.broken.min) / (phases.broken.max - phases.broken.min),
    );
  }

  // Interpoler les couleurs entre phases
  const current = colorSchemes[currentPhase]!;
  const next = colorSchemes[nextPhase]!;

  // Utiliser un easing pour des transitions plus naturelles
  const t = Math.pow(phaseProgress, 0.7); // Easing légèrement accéléré

  return {
    primary: {
      h: smoothLerp(current.primary[0], next.primary[0], t),
      s: smoothLerp(current.primary[1], next.primary[1], t),
      l: smoothLerp(current.primary[2], next.primary[2], t),
    },
    secondary: {
      h: smoothLerp(current.secondary[0], next.secondary[0], t),
      s: smoothLerp(current.secondary[1], next.secondary[1], t),
      l: smoothLerp(current.secondary[2], next.secondary[2], t),
    },
    accent: {
      h: smoothLerp(current.accent[0], next.accent[0], t),
      s: smoothLerp(current.accent[1], next.accent[1], t),
      l: smoothLerp(current.accent[2], next.accent[2], t),
    },
    intensity: deg < 0.12 ? (deg / 0.12) * 0.1 : 0.1 + (deg - 0.12) * 1.03, // 0 -> 1
    phaseProgress: t,
  };
});

// Générer une couleur HSLA dynamique avec variations
const getDynamicColor = (
  baseHue: number,
  hueOffset: number = 0,
  satMod: number = 1,
  lightMod: number = 1,
  alpha: number = 1,
) => {
  const colors = phaseColors.value;
  const deg = degradation.level;

  // Rotation de teinte basée sur le niveau de dégradation
  const hueShift = deg * 60 + baseHue + hueOffset;
  const h = (colors.primary.h + hueShift) % 360;
  const s = Math.min(100, colors.primary.s * satMod);
  const l = Math.min(100, colors.primary.l * lightMod);

  return `hsla(${h}, ${s}%, ${l}%, ${alpha * colors.intensity})`;
};

// Couleurs computed pour les éléments décoratifs avec transitions fluides
const decorativeColors = computed(() => {
  const colors = phaseColors.value;
  const deg = degradation.level;
  const intensity = colors.intensity;

  // Fonction helper pour créer une couleur avec threshold et transition smooth
  const createColor = (
    baseHue: number,
    threshold: number,
    maxAlpha: number,
    satMod: number = 1,
    lightMod: number = 1,
  ) => {
    // Calcul progressif de l'opacité - commence très faible dès 0%
    // et augmente progressivement après le threshold
    const baseProgress = Math.min(0.15, deg * 0.5); // Très subtil dès le début
    const thresholdProgress =
      deg < threshold
        ? 0
        : Math.min(1, ((deg - threshold) / (1 - threshold)) * 2);
    const progress = baseProgress + thresholdProgress * 0.85;
    const alpha = progress * maxAlpha * Math.min(1, intensity * 1.5);

    // Interpolation de teinte basée sur la phase
    const phaseHueShift = colors.primary.h * 0.3;
    const h = (baseHue + phaseHueShift + deg * 30) % 360;
    const s = Math.min(100, colors.primary.s * satMod * (0.5 + progress * 0.5));
    const l = Math.min(100, colors.primary.l * lightMod);

    return {
      bg: `hsla(${h}, ${s}%, ${l}%, ${alpha})`,
      glow: `hsla(${h}, ${s}%, ${l}%, ${alpha * 0.6})`,
      alpha,
      progress,
    };
  };

  return {
    // Rose magenta - première couleur à apparaître (très subtile dès le début)
    pink: createColor(320, 0.08, 0.55),
    // Cyan - deuxième couleur
    cyan: createColor(180, 0.1, 0.5),
    // Jaune - troisième
    yellow: createColor(55, 0.12, 0.45),
    // Vert lime
    lime: createColor(90, 0.15, 0.5),
    // Violet
    purple: createColor(280, 0.18, 0.48),
    // Orange
    orange: createColor(30, 0.2, 0.52),
  };
});

// ===== STYLES =====
const backgroundStyle = computed(() => {
  const deg = degradation.level;
  const colors = phaseColors.value;

  // Utiliser le système de couleurs dynamiques pour des transitions fluides
  const intensity = colors.intensity;

  // Couleurs primaires et secondaires interpolées smoothement
  const primaryHue = colors.primary.h;
  const secondaryHue = colors.secondary.h;

  // Saturation et luminosité basées sur l'intensité de phase
  const saturation = colors.primary.s * Math.min(1, intensity * 1.5);
  const lightness = colors.primary.l * Math.min(1, intensity * 1.2);
  const alpha = Math.min(0.15, intensity * 0.18);

  // Position du gradient qui bouge légèrement avec la dégradation
  const posX = 50 + (deg > 0.12 ? Math.sin(deg * 6) * 20 * intensity : 0);
  const posY = 50 + (deg > 0.12 ? Math.cos(deg * 5) * 20 * intensity : 0);

  return {
    background: `
      radial-gradient(
        ellipse at ${posX}% ${posY}%,
        hsla(${primaryHue}, ${saturation}%, ${lightness}%, ${alpha}) 0%,
        hsla(${secondaryHue}, ${saturation * 0.8}%, ${lightness * 0.8}%, ${alpha * 0.6}) 40%,
        rgba(18, 18, 18, 1) 100%
      )
    `,
    transition: "background 2s cubic-bezier(0.4, 0, 0.2, 1)",
  };
});

const indicatorStyle = computed(() => {
  const colors = phaseColors.value;
  // Utiliser la couleur dynamique basée sur la phase actuelle
  const h = colors.primary.h;
  const s = colors.primary.s;
  const l = colors.primary.l;

  return {
    width: `${degradation.level * 100}%`,
    backgroundColor: `hsl(${h}, ${s}%, ${l}%)`,
    boxShadow: `0 0 15px hsla(${h}, ${s}%, ${l}%, 0.6)`,
    transition: "all 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
  };
});

// Transformation sans blur excessif
const getElementTransform = (index: number) => {
  const deg = degradation.level;
  const isBroken = degradation.phase === "broken";

  return {
    transform: `
      rotate(${deg * (index % 2 === 0 ? 8 : -8)}deg)
      translateX(${Math.sin(deg * 4 + index) * deg * 30}px)
      translateY(${isBroken ? deg * 100 : Math.cos(deg * 3 + index) * deg * 20}px)
      scale(${1 - deg * 0.1})
    `,
    opacity: Math.max(0.4, 1 - deg * 0.3),
  };
};

// ===== MOUSE HANDLER =====
const handleMouseMove = (e: MouseEvent) => {
  // update color index based on horizontal position to change revealed gradient
  if (window && window.innerWidth) {
    cursorColorIndex.value =
      Math.floor((e.clientX / window.innerWidth) * cursorColors.length) %
      cursorColors.length;
  }

  // set target color for smooth interpolation
  const idx = cursorColorIndex.value % cursorColors.length;
  const targetHex = cursorColors[idx] || "#FF66C8";
  const rgb = hexToRgb(targetHex);
  cursorSmooth.tr = rgb.r;
  cursorSmooth.tg = rgb.g;
  cursorSmooth.tb = rgb.b;
  cursorSmooth.str = targetHex;

  // update reveal and blobs
  addRevealCircle(e.clientX, e.clientY);
  addMouseBlob(e.clientX, e.clientY);
  addInteraction(0.05);

  // update follower target (kept for smooth color interpolation)
  cartoon.tx = e.clientX;
  cartoon.ty = e.clientY;
};

// Pas besoin de fadeOutDots, les cercles restent permanents pour l'effet de révélation

// ===== LIFECYCLE =====
onMounted(async () => {
  isClient.value = true;
  await nextTick();

  initFallingElements();
  initDecorativeSprites();

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("click", addClick);

  // Démarrer le tracking du temps via le composable
  startTimeTracking();

  // Démarrer l'animation de scroll pour les effets de destruction
  animateScroll();

  fallInterval = setInterval(triggerFall, 800);

  // Dynamic elements generation based on degradation
  dynamicElementsInterval = setInterval(generateDynamicElements, 500);

  // Animate floating shapes
  floatingAnimationInterval = setInterval(animateFloatingShapes, 50);
  decorativeInterval = setInterval(animateDecorativeSprites, 60);

  if (ScrollTrigger) {
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.3,
      onUpdate: (self: any) => updateScroll(self.progress),
    });

    // Animation du papillon qui traverse l'écran pendant le scroll
    ScrollTrigger.create({
      trigger: document.body,
      start: "15% top",
      end: "45% top",
      scrub: 1,
      onUpdate: (self: any) => {
        butterflyProgress.value = self.progress;
        butterflyVisible.value = self.progress > 0.01 && self.progress < 0.99;
      },
      onLeave: () => {
        butterflyVisible.value = false;
      },
      onEnterBack: () => {
        butterflyVisible.value = true;
      },
    });
  }

  // Horizontal scroll setup
  if (gsap && ScrollTrigger && horizontalSection.value) {
    const panels = gsap.utils.toArray(".horizontal-panel");
    const totalWidth = (panels.length - 1) * window.innerWidth;

    // Keep horizontal scroll behavior but make it less intrusive.
    gsap.to(".horizontal-scroll-container", {
      x: -totalWidth,
      ease: "power1.out",
      scrollTrigger: {
        trigger: horizontalSection.value,
        pin: true,
        scrub: 0.8,
        snap: 1 / Math.max(1, panels.length - 1),
        end: () => "+=" + totalWidth,
        onUpdate: (self: any) => {
          currentHorizontalPanel.value =
            Math.round(self.progress * (panels.length - 1)) + 1;
        },
      },
    });
  }

  // Hero animation
  if (gsap && heroTitle.value) {
    gsap.fromTo(
      heroTitle.value,
      { opacity: 0, y: 80, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.5,
        ease: "power3.out",
        delay: 0.2,
      },
    );
  }

  // Reveal animations
  if (gsap) {
    gsap.utils.toArray(".reveal-section").forEach((section: any) => {
      gsap.fromTo(
        section,
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        },
      );
    });
  }
  // start cursor smoothing loop (keeps color interpolation running)
  startCursorLoop();
});

onUnmounted(() => {
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("click", addClick);
  if (timeInterval) clearInterval(timeInterval);
  if (fallInterval) clearInterval(fallInterval);
  if (clickChallengeInterval) clearInterval(clickChallengeInterval);
  if (dynamicElementsInterval) clearInterval(dynamicElementsInterval);
  if (floatingAnimationInterval) clearInterval(floatingAnimationInterval);
  if (decorativeInterval) clearInterval(decorativeInterval);
  if (typingInterval) clearInterval(typingInterval);
  if (reactionTimeout) clearTimeout(reactionTimeout);
  if (memoryTimerInterval) clearInterval(memoryTimerInterval);
  if (targetGameInterval) clearInterval(targetGameInterval);
  if (targetGameSpawnInterval) clearInterval(targetGameSpawnInterval);
  if (slidingTimerInterval) clearInterval(slidingTimerInterval);
  if (catchGameInterval) clearInterval(catchGameInterval);
  if (catchGameSpawnInterval) clearInterval(catchGameSpawnInterval);
  if (ScrollTrigger) ScrollTrigger.getAll().forEach((t: any) => t.kill());
  // cleanup cursor loop and native cursor class
  stopCursorLoop();
  document.body.classList.remove("hide-native-cursor");

  // Arrêter le tracking de la dégradation
  stopTimeTracking();

  // Arrêter l'animation de destruction
  isAnimating = false;
  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
  }
});
</script>

<template>
  <main
    ref="mainContainer"
    class="relative min-h-screen overflow-hidden bg-MyBlack text-white"
    :style="backgroundStyle"
  >
    <!-- FLOATING GEOMETRIC SHAPES (plus de formes décoratives) -->
    <div class="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      <!-- ===== FORMES SUBTILES DÈS LE DÉBUT (avant le chaos) ===== -->
      <!-- Ces formes sont visibles dès 0% et deviennent plus intenses avec la dégradation -->

      <!-- Cercle flottant très subtil - toujours visible -->
      <div
        class="absolute w-40 h-40 rounded-full border border-white/[0.03] animate-float-slow"
        :style="{
          left: '10%',
          top: '15%',
          opacity: 0.3 + degradationLevel * 0.5,
          transform: `scale(${1 + degradationLevel * 0.3})`,
        }"
      />
      <!-- Deuxième cercle -->
      <div
        class="absolute w-24 h-24 rounded-full border border-MyPink/[0.05] animate-float-slow-reverse"
        :style="{
          right: '15%',
          top: '25%',
          opacity: 0.25 + degradationLevel * 0.45,
          transform: `scale(${1 + degradationLevel * 0.25})`,
        }"
      />
      <!-- Carré incliné subtil -->
      <div
        class="absolute w-20 h-20 border border-MyBlue/[0.04] animate-breathe"
        :style="{
          left: '75%',
          top: '60%',
          opacity: 0.2 + degradationLevel * 0.5,
          transform: `rotate(${45 + degradationLevel * 30}deg) scale(${1 + degradationLevel * 0.2})`,
        }"
      />
      <!-- Petit cercle en bas -->
      <div
        class="absolute w-16 h-16 rounded-full border border-MyYellow/[0.04] animate-parallax-float"
        :style="{
          left: '20%',
          bottom: '20%',
          opacity: 0.2 + degradationLevel * 0.4,
          transform: `scale(${1 + degradationLevel * 0.35})`,
        }"
      />

      <!-- Dynamic decorative sprites covering the whole viewport -->
      <!-- Apparaissent progressivement dès 5% de dégradation -->
      <div
        v-for="s in decorativeSprites"
        :key="`decor-${s.id}`"
        class="absolute transition-opacity duration-1000"
        :style="{
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: `${s.size}px`,
          height: `${s.size}px`,
          transform: `translate(-50%, -50%) rotate(${s.rotation}deg) scale(${1 + Math.max(0, degradationLevel - 0.05) * 0.8})`,
          opacity:
            degradationLevel < 0.05
              ? degradationLevel * 4
              : Math.min(0.75, 0.2 + (degradationLevel - 0.05) * 1.1),
          color: s.color,
          filter: `drop-shadow(0 0 ${Math.max(0, degradationLevel - 0.1) * 18}px ${s.color}) hue-rotate(${degradationLevel * 140}deg)`,
        }"
      >
        <template v-if="s.type === 'rect'">
          <div
            :style="{
              backgroundColor: s.color,
              width: '100%',
              height: '100%',
              borderRadius: '6px',
            }"
          />
        </template>
        <template v-else-if="s.type === 'circle'">
          <div
            :style="{
              backgroundColor: s.color,
              width: '100%',
              height: '100%',
              borderRadius: '50%',
            }"
          />
        </template>
        <template v-else-if="s.type === 'star'">
          <div
            class="text-center"
            :style="{ fontSize: `${s.size}px`, lineHeight: 1 }"
          >
            ★
          </div>
        </template>
        <template v-else-if="s.type === 'diamond'">
          <div
            :style="{
              width: '100%',
              height: '100%',
              backgroundColor: s.color,
              transform: 'rotate(45deg)',
            }"
          />
        </template>
        <template v-else-if="s.type === 'plus'">
          <div
            class="text-center"
            :style="{ fontSize: `${s.size}px`, lineHeight: 1 }"
          >
            +
          </div>
        </template>
        <template v-else-if="s.type === 'triangle'">
          <div
            :style="{
              width: 0,
              height: 0,
              borderLeft: `${s.size / 2}px solid transparent`,
              borderRight: `${s.size / 2}px solid transparent`,
              borderBottom: `${s.size}px solid ${s.color}`,
            }"
          />
        </template>
      </div>
      <!-- Étoiles - apparaissent progressivement dès 5% de dégradation -->
      <div
        class="absolute text-4xl animate-float-slow transition-opacity duration-1000"
        :style="{
          left: '5%',
          top: '15%',
          opacity:
            degradationLevel < 0.05
              ? degradationLevel * 3
              : Math.min(0.75, 0.15 + (degradationLevel - 0.05) * 0.9),
          filter: `hue-rotate(${degradationLevel * 90}deg)`,
        }"
      >
        ⭐
      </div>
      <div
        class="absolute text-3xl animate-float-slow-reverse transition-opacity duration-1000"
        :style="{
          right: '8%',
          top: '25%',
          opacity:
            degradationLevel < 0.08
              ? degradationLevel * 2.5
              : Math.min(0.8, 0.2 + (degradationLevel - 0.08) * 1.0),
          filter: `hue-rotate(${degradationLevel * 120}deg)`,
          animationDelay: '1s',
        }"
      >
        ✨
      </div>
      <div
        class="absolute text-5xl animate-breathe transition-opacity duration-1000"
        :style="{
          left: '3%',
          top: '45%',
          opacity:
            degradationLevel < 0.1
              ? degradationLevel * 2
              : Math.min(0.7, 0.2 + (degradationLevel - 0.1) * 0.8),
          filter: `hue-rotate(${degradationLevel * 60}deg)`,
        }"
      >
        🌟
      </div>
      <div
        class="absolute text-2xl animate-float-slow transition-opacity duration-1000"
        :style="{
          right: '4%',
          top: '55%',
          opacity:
            degradationLevel < 0.12
              ? degradationLevel * 1.5
              : Math.min(0.7, 0.18 + (degradationLevel - 0.12) * 0.85),
          filter: `hue-rotate(${degradationLevel * 150}deg)`,
          animationDelay: '2s',
        }"
      >
        💫
      </div>
      <div
        class="absolute text-4xl animate-parallax-float transition-opacity duration-1000"
        :style="{
          left: '6%',
          top: '80%',
          opacity:
            degradationLevel < 0.15
              ? degradationLevel * 1.2
              : Math.min(0.75, 0.18 + (degradationLevel - 0.15) * 0.95),
          filter: `hue-rotate(${degradationLevel * 180}deg)`,
        }"
      >
        ⭐
      </div>

      <!-- Rectangles colorés - transitions fluides entre phases -->
      <div
        class="absolute w-8 h-16 rounded-sm animate-float-slow transition-all duration-1000"
        :style="{
          left: '2%',
          top: '30%',
          backgroundColor: decorativeColors.pink.bg,
          transform: `rotate(${15 + degradationLevel * 45}deg) scale(${1 + decorativeColors.pink.progress * 0.5})`,
          boxShadow: `0 0 ${decorativeColors.pink.progress * 25}px ${decorativeColors.pink.glow}`,
        }"
      />
      <div
        class="absolute w-6 h-20 rounded-sm animate-float-slow-reverse transition-all duration-1000"
        :style="{
          right: '3%',
          top: '40%',
          backgroundColor: decorativeColors.cyan.bg,
          transform: `rotate(${-20 + degradationLevel * 60}deg) scale(${1 + decorativeColors.cyan.progress * 0.4})`,
          animationDelay: '1.5s',
          boxShadow: `0 0 ${decorativeColors.cyan.progress * 20}px ${decorativeColors.cyan.glow}`,
        }"
      />
      <div
        class="absolute w-10 h-24 rounded-sm animate-breathe transition-all duration-1000"
        :style="{
          left: '4%',
          top: '70%',
          backgroundColor: decorativeColors.yellow.bg,
          transform: `rotate(${30 + degradationLevel * 30}deg) scale(${1 + decorativeColors.yellow.progress * 0.6})`,
          boxShadow: `0 0 ${decorativeColors.yellow.progress * 30}px ${decorativeColors.yellow.glow}`,
        }"
      />
      <div
        class="absolute w-5 h-14 rounded-sm animate-parallax-float transition-all duration-1000"
        :style="{
          right: '5%',
          top: '65%',
          backgroundColor: decorativeColors.lime.bg,
          transform: `rotate(${-10 + degradationLevel * 50}deg) scale(${1 + decorativeColors.lime.progress * 0.3})`,
          animationDelay: '0.5s',
          boxShadow: `0 0 ${decorativeColors.lime.progress * 22}px ${decorativeColors.lime.glow}`,
        }"
      />

      <!-- Cercles / Bulles - transitions fluides entre phases -->
      <div
        class="absolute w-12 h-12 rounded-full animate-float-slow transition-all duration-1000"
        :style="{
          left: '7%',
          top: '10%',
          backgroundColor: decorativeColors.purple.bg,
          transform: `scale(${1 + decorativeColors.purple.progress * 0.9})`,
          boxShadow: `0 0 ${decorativeColors.purple.progress * 35}px ${decorativeColors.purple.glow}`,
        }"
      />
      <div
        class="absolute w-8 h-8 rounded-full animate-breathe transition-all duration-1000"
        :style="{
          right: '6%',
          top: '18%',
          backgroundColor: decorativeColors.orange.bg,
          transform: `scale(${1 + decorativeColors.orange.progress * 0.7})`,
          animationDelay: '0.8s',
          boxShadow: `0 0 ${decorativeColors.orange.progress * 25}px ${decorativeColors.orange.glow}`,
        }"
      />
      <div
        class="absolute w-16 h-16 rounded-full animate-float-slow-reverse transition-all duration-1000"
        :style="{
          left: '1%',
          top: '50%',
          backgroundColor: decorativeColors.pink.bg,
          transform: `scale(${1 + decorativeColors.pink.progress * 1.1})`,
          boxShadow: `0 0 ${decorativeColors.pink.progress * 40}px ${decorativeColors.pink.glow}`,
        }"
      />
      <div
        class="absolute w-10 h-10 rounded-full animate-parallax-float transition-all duration-1000"
        :style="{
          right: '2%',
          top: '85%',
          backgroundColor: decorativeColors.cyan.bg,
          transform: `scale(${1 + decorativeColors.cyan.progress * 0.8})`,
          animationDelay: '1.2s',
          boxShadow: `0 0 ${decorativeColors.cyan.progress * 30}px ${decorativeColors.cyan.glow}`,
        }"
      />

      <!-- Triangles (CSS borders) - transitions fluides entre phases -->
      <div
        class="absolute animate-float-slow transition-all duration-1000"
        :style="{
          left: '8%',
          top: '35%',
          width: 0,
          height: 0,
          borderLeft: '15px solid transparent',
          borderRight: '15px solid transparent',
          borderBottom: `30px solid ${decorativeColors.yellow.bg}`,
          transform: `rotate(${degradationLevel * 180}deg) scale(${1 + decorativeColors.yellow.progress * 0.6})`,
          filter: `drop-shadow(0 0 ${decorativeColors.yellow.progress * 12}px ${decorativeColors.yellow.glow})`,
        }"
      />
      <div
        class="absolute animate-breathe transition-all duration-1000"
        :style="{
          right: '7%',
          top: '50%',
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderBottom: `24px solid ${decorativeColors.lime.bg}`,
          transform: `rotate(${90 + degradationLevel * 120}deg) scale(${1 + decorativeColors.lime.progress * 0.7})`,
          animationDelay: '0.7s',
          filter: `drop-shadow(0 0 ${decorativeColors.lime.progress * 15}px ${decorativeColors.lime.glow})`,
        }"
      />
      <div
        class="absolute animate-float-slow-reverse transition-all duration-1000"
        :style="{
          left: '5%',
          top: '90%',
          width: 0,
          height: 0,
          borderLeft: '18px solid transparent',
          borderRight: '18px solid transparent',
          borderBottom: `36px solid ${decorativeColors.purple.bg}`,
          transform: `rotate(${-45 + degradationLevel * 90}deg) scale(${1 + decorativeColors.purple.progress * 0.5})`,
          filter: `drop-shadow(0 0 ${decorativeColors.purple.progress * 18}px ${decorativeColors.purple.glow})`,
        }"
      />

      <!-- Losanges (carrés tournés) - transitions fluides entre phases -->
      <div
        class="absolute w-8 h-8 animate-parallax-float transition-all duration-1000"
        :style="{
          right: '9%',
          top: '12%',
          backgroundColor: decorativeColors.pink.bg,
          transform: `rotate(${45 + degradationLevel * 90}deg) scale(${1 + decorativeColors.pink.progress * 0.6})`,
          boxShadow: `0 0 ${decorativeColors.pink.progress * 22}px ${decorativeColors.pink.glow}`,
        }"
      />
      <div
        class="absolute w-6 h-6 animate-float-slow transition-all duration-1000"
        :style="{
          left: '9%',
          top: '58%',
          backgroundColor: decorativeColors.cyan.bg,
          transform: `rotate(${45 + degradationLevel * 120}deg) scale(${1 + decorativeColors.cyan.progress * 0.7})`,
          animationDelay: '1.8s',
          boxShadow: `0 0 ${decorativeColors.cyan.progress * 25}px ${decorativeColors.cyan.glow}`,
        }"
      />
      <div
        class="absolute w-10 h-10 animate-breathe transition-all duration-1000"
        :style="{
          right: '4%',
          top: '78%',
          backgroundColor: decorativeColors.orange.bg,
          transform: `rotate(${45 + degradationLevel * 60}deg) scale(${1 + decorativeColors.orange.progress * 0.5})`,
          boxShadow: `0 0 ${decorativeColors.orange.progress * 27}px ${decorativeColors.orange.glow}`,
        }"
      />

      <!-- Croix / Plus - transitions fluides entre phases -->
      <div
        class="absolute text-3xl font-bold animate-float-slow-reverse transition-all duration-1000"
        :style="{
          left: '3%',
          top: '22%',
          color: decorativeColors.yellow.bg,
          transform: `rotate(${degradationLevel * 180}deg) scale(${1 + decorativeColors.yellow.progress * 0.5})`,
          textShadow: `0 0 ${decorativeColors.yellow.progress * 18}px ${decorativeColors.yellow.glow}`,
        }"
      >
        +
      </div>
      <div
        class="absolute text-4xl font-bold animate-breathe transition-all duration-1000"
        :style="{
          right: '6%',
          top: '68%',
          color: decorativeColors.lime.bg,
          transform: `rotate(${45 + degradationLevel * 90}deg) scale(${1 + decorativeColors.lime.progress * 0.6})`,
          animationDelay: '0.9s',
          textShadow: `0 0 ${decorativeColors.lime.progress * 22}px ${decorativeColors.lime.glow}`,
        }"
      >
        +
      </div>

      <!-- Hexagones (emojis) - transitions fluides entre phases -->
      <div
        class="absolute text-3xl animate-parallax-float transition-all duration-1000"
        :style="{
          left: '2%',
          top: '40%',
          opacity: decorativeColors.pink.alpha,
          filter: `hue-rotate(${phaseColors.primary.h}deg)`,
        }"
      >
        ⬡
      </div>
      <div
        class="absolute text-2xl animate-float-slow transition-all duration-1000"
        :style="{
          right: '3%',
          top: '32%',
          opacity: decorativeColors.cyan.alpha,
          filter: `hue-rotate(${phaseColors.secondary.h}deg)`,
          animationDelay: '1.3s',
        }"
      >
        ⬢
      </div>

      <!-- Formes diverses - transitions fluides entre phases -->
      <div
        class="absolute text-2xl animate-float-slow-reverse transition-all duration-1000"
        :style="{
          left: '6%',
          top: '85%',
          opacity: decorativeColors.purple.alpha,
          filter: `hue-rotate(${phaseColors.primary.h * 0.8}deg)`,
        }"
      >
        ◆
      </div>
      <div
        class="absolute text-3xl animate-breathe transition-all duration-1000"
        :style="{
          right: '8%',
          top: '92%',
          opacity: decorativeColors.orange.alpha,
          filter: `hue-rotate(${phaseColors.secondary.h * 0.9}deg)`,
          animationDelay: '0.6s',
        }"
      >
        ○
      </div>
      <div
        class="absolute text-2xl animate-parallax-float transition-all duration-1000"
        :style="{
          left: '1%',
          top: '95%',
          opacity: decorativeColors.lime.alpha,
          filter: `hue-rotate(${phaseColors.accent.h}deg)`,
        }"
      >
        ▲
      </div>
    </div>

    <!-- WIN OVERLAY -->
    <div
      v-if="gameWon"
      class="win-overlay fixed inset-0 z-[200] flex items-center justify-center bg-MyBlack/95 opacity-0"
    >
      <div class="win-text text-center">
        <h1 class="font-candy text-6xl text-MyGreen md:text-9xl">
          🎉 VICTOIRE !
        </h1>
        <p class="mt-8 font-bricolage text-2xl text-white">
          Tu as trouvé le bouton secret !
        </p>
        <div class="mt-6 space-y-2 font-bricolage text-zinc-400">
          <p>
            Temps: {{ Math.floor(degradation.timeSpent / 60) }}:{{
              (degradation.timeSpent % 60).toString().padStart(2, "0")
            }}
          </p>
          <p>Interactions: {{ Math.round(degradation.interactions) }}</p>
          <p>Puzzles résolus: {{ degradation.puzzlesSolved }}</p>
          <p>Indices utilisés: {{ hintsUsed }}</p>
        </div>
        <button
          class="mt-10 rounded-full bg-MyGreen px-12 py-4 font-bricolage text-xl font-bold text-MyBlack hover:scale-105 transition-transform"
          @click="reloadPage"
        >
          Rejouer
        </button>
      </div>
    </div>

    <!-- Custom cursor removed per user request: native cursor restored. -->

    <!-- CURSOR REVEAL BACKGROUND LAYER (hidden colorful layer revealed by mouse) -->
    <div class="pointer-events-none fixed inset-0 z-[-1]">
      <!-- Fond coloré caché (gradient animé) -->
      <div
        class="absolute inset-0"
        :style="{
          background: `
            linear-gradient(135deg, 
              #FF66C8 0%, 
              #6BFFFF 25%, 
              #FFF746 50%, 
              #BBFF42 75%, 
              #AA66FF 100%
            )
          `,
          backgroundSize: '400% 400%',
          animation: 'gradientShift 8s ease infinite',
        }"
      />

      <!-- SVG Mask qui révèle le fond coloré -->
      <svg
        class="absolute inset-0 w-full h-full"
        style="mix-blend-mode: normal"
      >
        <defs>
          <mask id="revealMask">
            <!-- Fond noir (cache tout) -->
            <rect width="100%" height="100%" fill="black" />
            <!-- Cercles blancs (révèlent le fond coloré) -->
            <g>
              <circle
                v-for="circle in revealCircles"
                :key="circle.id"
                :cx="circle.x"
                :cy="circle.y"
                :r="circle.size / 2"
                fill="white"
                :opacity="circle.opacity"
              />
            </g>
          </mask>
        </defs>

        <!-- Rectangle coloré masqué -->
        <rect
          width="100%"
          height="100%"
          fill="url(#revealGradient)"
          mask="url(#revealMask)"
        />

        <defs>
          <linearGradient
            id="revealGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" :stop-color="gradientStops[0]" />
            <stop offset="25%" :stop-color="gradientStops[1]" />
            <stop offset="50%" :stop-color="gradientStops[2]" />
            <stop offset="75%" :stop-color="gradientStops[3]" />
            <stop offset="100%" :stop-color="gradientStops[4]" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    <!-- PARTICLES (hit/confetti) -->
    <div class="pointer-events-none fixed inset-0 z-58">
      <div
        v-for="p in particles"
        :key="`part-${p.id}`"
        class="absolute rounded-full"
        :style="{
          left: `${p.x}px`,
          top: `${p.y}px`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          transform: 'translate(-50%, -50%)',
          background: p.color,
          opacity: 0.95,
          filter: 'blur(0.5px)',
        }"
      />
    </div>

    <!-- FALLING ELEMENTS (visible in broken phase) -->
    <div
      v-if="degradation.phase === 'broken'"
      class="pointer-events-none fixed inset-0 z-30"
    >
      <div
        v-for="el in fallingElements"
        :key="el.id"
        :data-falling-id="el.id"
        class="absolute"
        :style="{
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: el.type === 'text' ? 'auto' : '40px',
          height: el.type === 'text' ? 'auto' : '40px',
        }"
      >
        <div
          v-if="el.type === 'square'"
          class="h-full w-full"
          :style="{
            backgroundColor: el.color,
            transform: `rotate(${el.rotation}deg)`,
          }"
        />
        <div
          v-else-if="el.type === 'circle'"
          class="h-full w-full rounded-full"
          :style="{ backgroundColor: el.color }"
        />
        <div
          v-else-if="el.type === 'triangle'"
          :style="{
            width: 0,
            height: 0,
            borderLeft: '20px solid transparent',
            borderRight: '20px solid transparent',
            borderBottom: `35px solid ${el.color}`,
            transform: `rotate(${el.rotation}deg)`,
          }"
        />
        <span v-else class="font-candy text-2xl" :style="{ color: el.color }"
          >ERR</span
        >
      </div>
    </div>

    <!-- DYNAMIC GLITCH TEXTS (appear at 25%+) -->
    <div class="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      <span
        v-for="text in glitchTexts"
        :key="`glitch-${text.id}`"
        class="absolute font-mono opacity-60 animate-pulse"
        :style="{
          left: `${text.x}%`,
          top: `${text.y}%`,
          fontSize: `${text.size}px`,
          color: text.color,
          textShadow: `0 0 10px ${text.color}`,
          transform: `rotate(${Math.random() * 20 - 10}deg)`,
        }"
      >
        {{ text.text }}
      </span>
    </div>

    <!-- FLOATING SHAPES (appear at 35%+) -->
    <div class="pointer-events-none fixed inset-0 z-15 overflow-hidden">
      <div
        v-for="shape in floatingShapes"
        :key="`shape-${shape.id}`"
        class="absolute opacity-40"
        :style="{
          left: `${shape.x}%`,
          top: `${shape.y}%`,
          width: `${shape.size}px`,
          height: `${shape.size}px`,
          transform: `rotate(${shape.rotation}deg)`,
        }"
      >
        <!-- Circle -->
        <div
          v-if="shape.type === 'circle'"
          class="h-full w-full rounded-full"
          :style="{ backgroundColor: shape.color }"
        />
        <!-- Square -->
        <div
          v-else-if="shape.type === 'square'"
          class="h-full w-full"
          :style="{ backgroundColor: shape.color }"
        />
        <!-- Triangle -->
        <div
          v-else-if="shape.type === 'triangle'"
          :style="{
            width: 0,
            height: 0,
            borderLeft: `${shape.size / 2}px solid transparent`,
            borderRight: `${shape.size / 2}px solid transparent`,
            borderBottom: `${shape.size}px solid ${shape.color}`,
          }"
        />
        <!-- Star -->
        <span v-else class="text-4xl" :style="{ color: shape.color }">★</span>
      </div>
    </div>

    <!-- WARNING MESSAGES (appear at 45%+) -->
    <div class="fixed inset-0 z-40 pointer-events-none">
      <div
        v-for="msg in warningMessages.filter((m) => m.visible)"
        :key="`warn-${msg.id}`"
        class="absolute px-4 py-2 rounded-lg font-mono text-sm animate-pulse backdrop-blur-sm"
        :style="{
          left: `${10 + Math.random() * 80}%`,
          top: `${10 + Math.random() * 80}%`,
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
          color: '#FF3333',
          border: '1px solid #FF3333',
          transform: `rotate(${Math.random() * 10 - 5}deg)`,
        }"
      >
        {{ msg.text }}
      </div>
    </div>

    <!-- PAPILLON QUI TRAVERSE L'ÉCRAN PENDANT LE SCROLL (Indice discret) -->
    <Transition name="butterfly">
      <div
        v-if="butterflyVisible"
        class="fixed z-50 pointer-events-none select-none discrete-hint flex flex-col items-center"
        :style="{
          left: `${-10 + butterflyProgress * 120}%`,
          top: `${30 + Math.sin(butterflyProgress * Math.PI * 3) * 25}%`,
          transform: `rotate(${Math.sin(butterflyProgress * Math.PI * 4) * 15}deg) scale(${1 + Math.sin(butterflyProgress * Math.PI) * 0.3})`,
          transition: 'opacity 0.5s ease',
          filter: 'drop-shadow(0 0 20px rgba(255, 102, 200, 0.6))',
        }"
      >
        <span
          class="text-6xl md:text-7xl animate-float-slow"
          style="display: block"
          >🦋</span
        >
        <span class="text-MyPink font-bricolage text-sm mt-1 opacity-80"
          >papillon</span
        >
      </div>
    </Transition>

    <!-- SCREEN CRACKS (appear at 60%+) -->
    <div class="pointer-events-none fixed inset-0 z-25 overflow-hidden">
      <svg
        v-for="crack in screenCracks"
        :key="`crack-${crack.id}`"
        class="absolute opacity-30"
        :style="{
          left: `${crack.x}%`,
          top: `${crack.y}%`,
          transform: `rotate(${crack.angle}deg)`,
        }"
        width="100"
        height="100"
        viewBox="0 0 100 100"
      >
        <path
          d="M50,0 L55,30 L70,35 L60,50 L80,60 L50,100 L45,70 L30,65 L40,50 L20,40 Z"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          stroke-width="2"
        />
      </svg>
    </div>

    <!-- CORRUPTED PIXELS (appear at 75%+) -->
    <div class="pointer-events-none fixed inset-0 z-35 overflow-hidden">
      <div
        v-for="pixel in corruptedPixels"
        :key="`pixel-${pixel.id}`"
        class="absolute animate-pulse"
        :style="{
          left: `${pixel.x}%`,
          top: `${pixel.y}%`,
          width: `${4 + Math.random() * 8}px`,
          height: `${4 + Math.random() * 8}px`,
          backgroundColor: pixel.color,
          opacity: 0.7,
        }"
      />
    </div>

    <!-- DEGRADATION PHASE INDICATOR (new visual) -->
    <div
      v-if="degradationLevel > 0.15"
      class="fixed bottom-4 left-4 z-50 pointer-events-none"
    >
      <div
        class="px-3 py-1.5 rounded font-mono text-xs backdrop-blur-sm border"
        :class="{
          'bg-MyYellow/20 text-MyYellow border-MyYellow/30':
            degradationPhase === 'glitching',
          'bg-MyPink/20 text-MyPink border-MyPink/30':
            degradationPhase === 'unstable',
          'bg-MyBlue/20 text-MyBlue border-MyBlue/30 animate-pulse':
            degradationPhase === 'chaotic',
          'bg-red-500/20 text-red-500 border-red-500/30 animate-bounce':
            degradationPhase === 'broken',
        }"
      >
        <span v-if="degradationPhase === 'glitching'">⚡ GLITCH</span>
        <span v-else-if="degradationPhase === 'unstable'">⚠️ INSTABLE</span>
        <span v-else-if="degradationPhase === 'chaotic'">🌀 CHAOTIQUE</span>
        <span v-else-if="degradationPhase === 'broken'">💀 CRITIQUE</span>
        <!-- loop count removed -->
      </div>
    </div>

    <!-- SECRET BUTTON - Positionné dans le contenu du site -->
    <button
      v-if="secretButtonVisible && !gameWon"
      class="absolute z-[100] rounded-full cursor-pointer"
      :class="{
        'h-4 w-4': degradation.level < 0.7,
        'h-5 w-5': degradation.level >= 0.7 && degradation.level < 0.85,
        'h-6 w-6 animate-pulse': degradation.level >= 0.85,
      }"
      :style="{
        left: `${secretButtonPosition.x}%`,
        top: `${secretButtonPosition.y}px`,
        opacity:
          degradation.level > 0.85 ? 0.7 : degradation.level > 0.7 ? 0.4 : 0.2,
        background:
          'radial-gradient(circle, rgba(187, 255, 66, 0.9) 0%, rgba(187, 255, 66, 0.4) 60%, transparent 100%)',
        boxShadow:
          degradation.level > 0.8 ? '0 0 15px rgba(187, 255, 66, 0.6)' : 'none',
        transform: 'translate(-50%, -50%)',
      }"
      @click="handleSecretClick"
    />

    <!-- HINT -->
    <Transition name="hint-fade">
      <div
        v-if="showHint"
        class="fixed left-1/2 bottom-20 z-[9999] -translate-x-1/2 rounded-xl bg-MyGreen/90 px-6 py-4 text-white font-bricolage backdrop-blur-md border border-MyGreen shadow-lg shadow-MyGreen/30"
      >
        <template v-if="secretButtonVisible">
          🔍 Le bouton secret est à environ
          <strong>{{ Math.round(secretButtonPosition.x) }}%</strong> depuis la
          gauche, <br />à
          <strong>{{ Math.round(secretButtonPosition.y) }}px</strong> depuis le
          haut du site <br /><span class="text-sm opacity-80"
            >(scrolle pour le trouver !)</span
          >
        </template>
        <template v-else>
          💡 Continue à interagir avec le site !
          <br /><span class="text-sm opacity-80"
            >Le bouton apparaîtra à {{ Math.round(degradation.level * 100) }}% /
            30% de dégradation</span
          >
        </template>
      </div>
    </Transition>

    <!-- DEGRADATION INDICATOR -->
    <div class="fixed left-0 top-0 z-50 h-1.5 w-full bg-zinc-900/80">
      <div class="h-full transition-all duration-500" :style="indicatorStyle" />
    </div>

    <!-- INFO PANEL removed per user request -->

    <!-- HINT BUTTON -->
    <button
      v-show="!gameWon"
      title="Afficher l'indice (touche H)"
      class="fixed left-4 top-4 z-50 rounded-lg bg-zinc-900/80 px-3 py-2 font-bricolage text-xs text-zinc-400 hover:text-MyYellow transition-colors border border-zinc-800"
      @click="showHintFn"
    >
      💡 Indice
    </button>

    <!-- SECTION 1: HERO -->
    <section
      class="relative flex min-h-screen flex-col items-center justify-center px-6 overflow-hidden"
    >
      <!-- Animated background orbs for hero with enhanced parallax -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          class="absolute top-1/4 left-1/4 w-96 h-96 bg-MyPink/10 rounded-full blur-3xl animate-parallax-float"
        />
        <div
          class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-MyBlue/10 rounded-full blur-3xl animate-float-slow-reverse"
        />
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-MyYellow/5 rounded-full blur-3xl animate-breathe"
        />
        <!-- Additional subtle decorative elements -->
        <div
          class="absolute top-1/3 right-1/3 w-2 h-2 bg-MyPink/40 rounded-full animate-pulse"
        />
        <div
          class="absolute bottom-1/3 left-1/3 w-1 h-1 bg-MyBlue/50 rounded-full animate-pulse"
          style="animation-delay: 0.5s"
        />
        <div
          class="absolute top-2/3 right-1/4 w-1.5 h-1.5 bg-MyYellow/30 rounded-full animate-pulse"
          style="animation-delay: 1s"
        />
      </div>

      <div class="relative z-10 text-center" :style="getElementTransform(1)">
        <p
          class="font-bricolage text-sm text-MyPink mb-4 tracking-widest uppercase animate-fade-in degradable degradable-text"
        >
          🎯 OBJECTIF
        </p>
        <h1
          ref="heroTitle"
          class="font-candy text-6xl text-white md:text-8xl lg:text-[10rem] hero-title-glow degradable"
          :class="{ 'corrupted-text': degradationLevel > 0.5 }"
          :data-text="'Trouve le secret.'"
        >
          <span class="inline-block animate-title-reveal p-4 degradable"
            >Trouve</span
          >
          <span
            class="inline-block animate-title-reveal degradable"
            style="animation-delay: 0.1s"
          >
            le</span
          >
          <span
            class="inline-block animate-title-reveal text-transparent bg-clip-text bg-gradient-to-r from-MyPink via-MyBlue to-MyGreen p-4 degradable"
            style="animation-delay: 0.2s"
          >
            secret.</span
          >
        </h1>
        <p
          class="mt-8 max-w-lg mx-auto text-center font-bricolage text-xl text-zinc-400 animate-fade-in-up degradable"
          style="animation-delay: 0.5s"
        >
          Un bouton est caché quelque part. Plus le chaos augmente, plus il
          devient visible.
        </p>
        <p
          class="mt-4 font-bricolage text-sm text-zinc-600 animate-fade-in-up degradable degradable-text"
          style="animation-delay: 0.7s"
        >
          Interagis • Joue aux mini-jeux • Dégrade le système
        </p>

        <!-- Progress hint avec compteur de boucles -->
        <div
          class="mt-12 flex flex-col items-center justify-center gap-4 animate-fade-in-up"
          style="animation-delay: 0.9s"
        >
          <div
            class="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700 degradable"
            :class="{ 'shaky-border': degradationLevel > 0.4 }"
          >
            <span
              class="w-2 h-2 rounded-full"
              :class="
                degradationLevel >= 0.7
                  ? 'bg-MyGreen animate-pulse'
                  : 'bg-zinc-600'
              "
            />
            <span class="font-bricolage text-xs">
              <template v-if="showHint">
                <span class="text-MyGreen font-semibold">🔍 Indice :</span>
                <span class="ml-2 text-white/90">
                  <template v-if="secretButtonVisible">
                    Position ~ {{ Math.round(secretButtonPosition.x) }}% gauche,
                    {{ Math.round(secretButtonPosition.y) }}px haut
                  </template>
                  <template v-else>
                    Continue à interagir —
                    {{ Math.round(degradationLevel * 100) }}% / 30%
                  </template>
                </span>
              </template>
              <template v-else>
                <span
                  :class="
                    degradationLevel >= 0.7 ? 'text-MyGreen' : 'text-zinc-500'
                  "
                >
                  {{
                    degradationLevel >= 0.7
                      ? "Bouton débloqué !"
                      : `${Math.round(degradationLevel * 100)}% / 70%`
                  }}
                </span>
              </template>
            </span>
          </div>

          <!-- loop counter removed to reduce UI noise -->
        </div>
      </div>

      <div
        class="absolute bottom-12 animate-bounce font-bricolage text-sm text-zinc-600"
      >
        ↓ Scroll pour commencer
      </div>
    </section>

    <!-- HORIZONTAL SCROLL SECTION -->
    <section ref="horizontalSection" class="horizontal-scroll-wrapper relative">
      <div class="horizontal-scroll-container flex">
        <!-- Panel 1 removed by user request -->

        <!-- Panel 2: Features -->
        <div
          class="horizontal-panel min-w-[100vw] h-screen flex items-center justify-center relative overflow-hidden degradable"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-MyYellow/10 via-transparent to-MyGreen/10 degradable"
          />
          <div
            class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-MyYellow via-MyGreen to-MyBlue"
          />
          <div class="text-center z-10 px-8">
            <span
              class="inline-block px-4 py-2 rounded-full bg-MyYellow/20 border border-MyYellow/50 text-MyYellow text-sm font-bricolage mb-6 degradable"
              >02 / 04</span
            >
            <h2
              class="font-candy text-5xl md:text-7xl text-white mb-12 degradable"
            >
              Mini-Jeux<br /><span class="text-MyYellow degradable"
                >Addictifs</span
              >
            </h2>
            <div
              class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
            >
              <div
                role="button"
                tabindex="0"
                @click.prevent="scrollToSection('game-sequence')"
                @keydown.enter="scrollToSection('game-sequence')"
                class="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-MyPink/50 transition-all hover:scale-105 cursor-pointer degradable"
              >
                <span class="text-4xl">🧠</span>
                <p class="mt-3 font-bricolage text-white text-sm">Séquence</p>
              </div>
              <div
                role="button"
                tabindex="0"
                @click.prevent="scrollToSection('game-target')"
                @keydown.enter="scrollToSection('game-target')"
                class="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-MyBlue/50 transition-all hover:scale-105 cursor-pointer degradable"
              >
                <span class="text-4xl">🎯</span>
                <p class="mt-3 font-bricolage text-white text-sm">Cibles</p>
              </div>
              <div
                role="button"
                tabindex="0"
                @click.prevent="scrollToSection('game-puzzle')"
                @keydown.enter="scrollToSection('game-puzzle')"
                class="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-MyYellow/50 transition-all hover:scale-105 cursor-pointer degradable"
              >
                <span class="text-4xl">🧩</span>
                <p class="mt-3 font-bricolage text-white text-sm">Puzzle</p>
              </div>
              <div
                role="button"
                tabindex="0"
                @click.prevent="scrollToSection('game-click')"
                @keydown.enter="scrollToSection('game-click')"
                class="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-MyGreen/50 transition-all hover:scale-105 cursor-pointer"
              >
                <span class="text-4xl">⚡</span>
                <p class="mt-3 font-bricolage text-white text-sm">Réflexes</p>
              </div>
            </div>
          </div>
          <div
            class="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-MyYellow/5 rounded-full blur-3xl"
          />
        </div>

        <!-- Panel 3: Progress -->
        <div
          class="horizontal-panel min-w-[100vw] h-screen flex items-center justify-center relative overflow-hidden"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-MyBlue/20 via-transparent to-MyPink/20"
          />
          <div
            class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-MyBlue via-MyPink to-MyYellow"
          />
          <div class="text-center z-10 px-8">
            <span
              class="inline-block px-4 py-2 rounded-full bg-MyBlue/20 border border-MyBlue/50 text-MyBlue text-sm font-bricolage mb-6"
              >03 / 04</span
            >
            <h2 class="font-candy text-5xl md:text-7xl text-white mb-8">
              Progression<br /><span class="text-MyBlue">Dynamique</span>
            </h2>
            <div class="max-w-md mx-auto">
              <div class="flex justify-between mb-2">
                <span class="font-bricolage text-zinc-400">Dégradation</span>
                <span class="font-candy text-MyPink"
                  >{{ Math.round(degradation.level * 100) }}%</span
                >
              </div>
              <div class="h-4 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-MyGreen via-MyYellow to-MyPink transition-all duration-500"
                  :style="{ width: `${degradation.level * 100}%` }"
                />
              </div>
              <p class="mt-6 font-bricolage text-zinc-500">
                Atteins 70% pour débloquer le secret...
              </p>
            </div>
          </div>
          <div
            class="absolute -top-40 -right-40 w-96 h-96 bg-MyBlue/10 rounded-full blur-3xl animate-pulse-slow"
          />
        </div>

        <!-- Panel 4: Call to Action -->
        <div
          class="horizontal-panel min-w-[100vw] h-screen flex items-center justify-center relative overflow-hidden"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-MyGreen/10 via-transparent to-MyYellow/10"
          />
          <div
            class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-MyGreen via-MyPink to-MyBlue"
          />
          <div class="text-center z-10 px-8">
            <span
              class="inline-block px-4 py-2 rounded-full bg-MyGreen/20 border border-MyGreen/50 text-MyGreen text-sm font-bricolage mb-6"
              >04 / 04</span
            >
            <h2 class="font-candy text-5xl md:text-7xl text-white mb-6">
              Prêt à<br /><span
                class="text-transparent bg-clip-text bg-gradient-to-r from-MyGreen via-MyYellow to-MyPink animate-gradient-x"
                >Jouer ?</span
              >
            </h2>
            <p
              class="font-bricolage text-xl text-zinc-400 max-w-lg mx-auto mb-8"
            >
              Continue de scroller pour découvrir tous les mini-jeux et trouver
              le bouton secret !
            </p>
            <div class="animate-bounce">
              <span class="font-bricolage text-MyGreen">↓ Continue</span>
            </div>
          </div>
          <div
            class="absolute -bottom-20 -left-20 w-72 h-72 bg-MyGreen/10 rounded-full blur-3xl"
          />
          <div
            class="absolute top-1/2 right-10 w-40 h-40 bg-MyYellow/10 rounded-full blur-2xl animate-float-slow"
          />
        </div>

        <!-- Panel 5: HIDDEN GAME - Catch the Stars - SE CORROMPT -->
        <div
          class="horizontal-panel min-w-[100vw] h-screen flex items-center justify-center relative overflow-hidden"
          :class="{ 'vhs-tracking': degradationLevel > 0.7 }"
        >
          <!-- Scanlines -->
          <div
            v-if="degradationLevel > 0.5"
            class="absolute inset-0 pointer-events-none scanlines"
            :style="{ opacity: degradationLevel * 0.3, zIndex: 30 }"
          />

          <!-- Animated starfield background -->
          <div
            class="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-MyBlack to-MyBlack"
          />
          <div class="absolute inset-0 starfield-bg" />
          <div
            class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-MyPink to-MyYellow"
            :class="{ 'shake-subtle': degradationLevel > 0.6 }"
          />

          <div
            class="text-center z-10 px-8 w-full max-w-4xl mx-auto relative"
            :class="{ 'destruction-zone': degradationLevel > 0.6 }"
          >
            <!-- Message d'erreur -->
            <div
              v-if="degradationLevel > 0.6"
              class="absolute -top-4 right-1/4 font-mono text-[9px] text-purple-500/60 error-popup"
              :style="getDestructionStyle(400, 30)"
            >
              STAR_TRACKING_ERROR
            </div>

            <span
              class="inline-block px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/50 text-purple-400 text-sm font-bricolage mb-4"
              :class="{
                flicker: degradationLevel > 0.6,
                'shake-subtle': degradationLevel > 0.7,
              }"
              :style="
                degradationLevel > 0.5 ? getDestructionStyle(401, 20) : {}
              "
            >
              {{
                degradationLevel > 0.7 ? "⭐ J3U S3CR3T ⭐" : "⭐ JEU SECRET ⭐"
              }}
            </span>

            <h2
              class="font-candy text-4xl md:text-6xl text-white mb-4"
              :class="{ 'glitch-text': degradationLevel > 0.6 }"
              :data-text="'Attrape les Étoiles'"
              :style="
                degradationLevel > 0.5 ? getDestructionStyle(402, 20) : {}
              "
            >
              <span
                class="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-MyPink to-MyYellow"
                :class="{ 'rgb-split': degradationLevel > 0.75 }"
              >
                {{
                  degradationLevel > 0.8
                    ? "4ttr4p3 l3s 3t01l3s"
                    : "Attrape les Étoiles"
                }}
              </span>
            </h2>

            <!-- Game not started -->
            <div v-if="!catchGame.active && catchGame.timeLeft === 20">
              <p
                class="font-bricolage text-zinc-400 mb-4"
                :class="{ 'text-corrupt': degradationLevel > 0.7 }"
                :style="
                  degradationLevel > 0.5 ? getDestructionStyle(403, 15) : {}
                "
              >
                {{
                  degradationLevel > 0.7
                    ? "Tu 4s d3c0uv3rt un j3u c4ch3 !"
                    : "Tu as découvert un jeu caché ! Attrape un maximum d'étoiles en 20 secondes."
                }}
              </p>
              <p
                v-if="catchGame.bestScore > 0"
                class="font-bricolage text-MyGreen mb-6"
                :class="{ flicker: degradationLevel > 0.7 }"
              >
                🏆
                {{ degradationLevel > 0.7 ? "M31ll3ur:" : "Meilleur score:" }}
                {{ catchGame.bestScore }} pts
              </p>
              <button
                @click="startCatchGame"
                class="px-10 py-4 rounded-full bg-gradient-to-r from-purple-500 to-MyPink font-bricolage text-xl font-bold text-white hover:scale-110 transition-transform shadow-lg shadow-purple-500/30 relative overflow-hidden"
                :class="{
                  'button-broken': degradationLevel > 0.7,
                  'game-glitch': degradationLevel > 0.8,
                }"
                :style="
                  degradationLevel > 0.5
                    ? getGameDestructionStyle(404, 1.5)
                    : {}
                "
              >
                ⭐ {{ degradationLevel > 0.7 ? "J0u3r" : "Jouer" }}
                <div
                  v-if="degradationLevel > 0.6"
                  class="absolute inset-0 noise-overlay opacity-20 pointer-events-none"
                />
              </button>
            </div>

            <!-- Game active - SE DESTRUCTURE -->
            <div v-else-if="catchGame.active" class="relative">
              <!-- Stats bar -->
              <div
                class="flex justify-center gap-8 mb-4 font-bricolage"
                :class="{ 'shake-subtle': degradationLevel > 0.6 }"
              >
                <span
                  class="text-white text-xl"
                  :class="{ 'rgb-split': degradationLevel > 0.7 }"
                >
                  {{ catchGame.score }} pts
                </span>
                <span
                  class="font-candy text-3xl text-MyYellow"
                  :class="{ 'glitch-text': degradationLevel > 0.7 }"
                  :data-text="`${catchGame.timeLeft}s`"
                >
                  {{ catchGame.timeLeft }}s
                </span>
                <span
                  v-if="catchGame.combo >= 3"
                  class="text-MyPink animate-pulse"
                  :class="{ 'shake-subtle': degradationLevel > 0.6 }"
                >
                  🔥 x{{ catchGame.combo }}
                </span>
              </div>

              <!-- Game area - CHAOS -->
              <div
                class="relative h-[350px] w-full max-w-2xl mx-auto rounded-2xl bg-zinc-900/80 border border-purple-500/30 overflow-hidden"
                :class="{
                  'shake-subtle': degradationLevel > 0.6,
                  'game-glitch': degradationLevel > 0.75,
                }"
                :style="
                  degradationLevel > 0.5
                    ? {
                        borderColor: `rgba(168, 85, 247, ${0.3 + degradationLevel * 0.5})`,
                        boxShadow: `0 0 ${degradationLevel * 30}px rgba(168, 85, 247, ${degradationLevel * 0.4})`,
                      }
                    : {}
                "
              >
                <!-- Scanlines dans la zone de jeu -->
                <div
                  v-if="degradationLevel > 0.5"
                  class="absolute inset-0 pointer-events-none scanlines"
                  :style="{ opacity: degradationLevel * 0.4 }"
                />

                <!-- Noise overlay -->
                <div
                  v-if="degradationLevel > 0.6"
                  class="absolute inset-0 pointer-events-none noise-overlay"
                  :style="{ opacity: degradationLevel * 0.3 }"
                />

                <!-- Falling stars - GLITCHENT ET BOUGENT -->
                <button
                  v-for="star in fallingStars.filter((s) => !s.caught)"
                  :key="star.id"
                  :data-star-id="star.id"
                  class="absolute transition-transform hover:scale-125 cursor-pointer"
                  :class="{
                    'element-drift': degradationLevel > 0.5,
                    distort: degradationLevel > 0.7 && star.id % 2 === 0,
                  }"
                  :style="{
                    left: `${star.x + (degradationLevel > 0.5 ? Math.sin(scrollOffset / 800 + star.id) * degradationLevel * 8 : 0)}%`,
                    top: `${star.y + (degradationLevel > 0.5 ? Math.cos(scrollOffset / 800 + star.id) * degradationLevel * 5 : 0)}%`,
                    transform: `translate(-50%, -50%) rotate(${degradationLevel > 0.5 ? Math.sin(scrollOffset / 600 + star.id) * degradationLevel * 20 : 0}deg)`,
                  }"
                  @click="catchStar(star.id)"
                >
                  <span
                    class="block animate-spin-slow"
                    :class="{ 'rgb-split': degradationLevel > 0.7 }"
                    :style="{
                      fontSize: `${star.size * (1 + (degradationLevel > 0.5 ? Math.sin(scrollOffset / 500 + star.id) * 0.2 * degradationLevel : 0))}px`,
                      filter: `drop-shadow(0 0 10px ${star.color}) ${degradationLevel > 0.6 ? `hue-rotate(${Math.sin(scrollOffset / 400 + star.id) * degradationLevel * 60}deg)` : ''}`,
                    }"
                    >⭐</span
                  >
                </button>

                <p
                  v-if="fallingStars.length === 0"
                  class="absolute inset-0 flex items-center justify-center font-bricolage text-zinc-600"
                  :class="{ 'text-corrupt': degradationLevel > 0.6 }"
                >
                  {{
                    degradationLevel > 0.7
                      ? "L3s 3t01l3s 4rr1v3nt..."
                      : "Les étoiles arrivent..."
                  }}
                </p>
              </div>
            </div>

            <!-- Game ended - RESULTAT CORROMPU -->
            <div v-else class="text-center">
              <p
                class="font-candy text-5xl text-MyYellow mb-4"
                :class="{
                  'glitch-text': degradationLevel > 0.7,
                  'rgb-split': degradationLevel > 0.8,
                }"
                :data-text="`${catchGame.score} pts`"
                :style="
                  degradationLevel > 0.5 ? getDestructionStyle(410, 25) : {}
                "
              >
                {{ catchGame.score }} pts
              </p>
              <p
                class="font-bricolage text-zinc-400 mb-2"
                :class="{ 'text-corrupt': degradationLevel > 0.7 }"
              >
                {{
                  degradationLevel > 0.7 ? "3t01l3s r4t33s:" : "Étoiles ratées:"
                }}
                {{ catchGame.missed }} | Max Combo: x{{ catchGame.maxCombo }}
              </p>
              <p
                v-if="
                  catchGame.score >= catchGame.bestScore && catchGame.score > 0
                "
                class="text-MyGreen font-bricolage mb-4"
                :class="{ 'shake-subtle flicker': degradationLevel > 0.6 }"
              >
                🎉
                {{
                  degradationLevel > 0.7
                    ? "N0uv34u r3c0rd !"
                    : "Nouveau record !"
                }}
              </p>
              <button
                @click="startCatchGame"
                class="px-8 py-3 rounded-full bg-purple-500/80 font-bricolage text-white hover:bg-purple-500 transition-colors"
              >
                Rejouer
              </button>
            </div>
          </div>

          <!-- Decorative elements -->
          <div
            class="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow"
          />
          <div
            class="absolute -top-20 -left-20 w-60 h-60 bg-MyPink/10 rounded-full blur-3xl"
          />
        </div>
      </div>

      <!-- Horizontal scroll progress indicator -->
      <div
        class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 horizontal-progress-dots flex gap-2"
      >
        <div
          v-for="i in 4"
          :key="`dot-${i}`"
          class="w-2 h-2 rounded-full transition-all duration-300 horizontal-dot"
          :class="{
            'scale-150': currentHorizontalPanel === i,
            'bg-purple-500': i === 4 && currentHorizontalPanel === 4,
            'bg-MyPink': i !== 4 && currentHorizontalPanel === i,
            'bg-white/20': currentHorizontalPanel !== i,
          }"
        />
      </div>
    </section>

    <!-- SECTION 2: STATS LIVE -->
    <section
      class="reveal-section relative min-h-screen px-6 py-24 overflow-hidden"
    >
      <!-- Background decoration with parallax -->
      <div class="absolute inset-0 pointer-events-none">
        <div
          class="absolute top-20 left-10 w-64 h-64 bg-MyPink/5 rounded-full blur-3xl animate-parallax-float"
        />
        <div
          class="absolute bottom-20 right-10 w-80 h-80 bg-MyBlue/5 rounded-full blur-3xl animate-float-slow-reverse"
        />
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-purple-500/3 via-transparent to-transparent rounded-full animate-breathe"
        />
      </div>

      <div
        class="mx-auto max-w-4xl relative z-10"
        :style="getElementTransform(2)"
      >
        <h2 class="text-center font-candy text-4xl text-white md:text-6xl">
          <span
            class="text-transparent bg-clip-text bg-gradient-to-r from-MyPink via-MyBlue to-MyGreen animate-gradient-x"
            >État du système</span
          >
        </h2>
        <!-- Élément discret: Mot (Éphémère) -->
        <p
          class="text-center text-xs text-MyYellow/50 font-bricolage mt-2 tracking-[0.4em] transition-all duration-300 hover:text-MyYellow/80 cursor-default select-none discrete-hint"
        >
          ÉPHÉMÈRE
        </p>

        <div class="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div
            class="rounded-xl bg-zinc-900/60 p-5 border border-MyPink/30 text-center hover:border-MyPink/60 transition-all hover:scale-105 hover:shadow-lg hover:shadow-MyPink/20 group"
          >
            <p
              class="font-candy text-3xl text-MyPink group-hover:neon-pink transition-all"
            >
              {{ Math.round(degradation.level * 100) }}%
            </p>
            <p class="mt-2 font-bricolage text-xs text-zinc-500">Dégradation</p>
          </div>
          <div
            class="rounded-xl bg-zinc-900/60 p-5 border border-MyBlue/30 text-center hover:border-MyBlue/60 transition-all hover:scale-105 hover:shadow-lg hover:shadow-MyBlue/20 group"
          >
            <p
              class="font-candy text-3xl text-MyBlue group-hover:neon-blue transition-all"
            >
              {{ degradation.clicks }}
            </p>
            <p class="mt-2 font-bricolage text-xs text-zinc-500">Clics</p>
          </div>
          <div
            class="rounded-xl bg-zinc-900/60 p-5 border border-MyYellow/30 text-center hover:border-MyYellow/60 transition-all hover:scale-105 hover:shadow-lg hover:shadow-MyYellow/20 group"
          >
            <p
              class="font-candy text-3xl text-MyYellow group-hover:neon-yellow transition-all"
            >
              {{ degradation.timeSpent }}s
            </p>
            <p class="mt-2 font-bricolage text-xs text-zinc-500">Temps</p>
          </div>
          <div
            class="rounded-xl bg-zinc-900/60 p-5 border border-MyGreen/30 text-center hover:border-MyGreen/60 transition-all hover:scale-105 hover:shadow-lg hover:shadow-MyGreen/20 group"
          >
            <p
              class="font-candy text-3xl text-MyGreen group-hover:neon-green transition-all"
            >
              {{ degradation.puzzlesSolved }}
            </p>
            <p class="mt-2 font-bricolage text-xs text-zinc-500">Puzzles</p>
          </div>
        </div>

        <p class="mt-8 text-center font-bricolage text-zinc-600">
          <span v-if="degradation.level < 0.3"
            >Le système est encore stable...</span
          >
          <span v-else-if="degradation.level < 0.6"
            >Des anomalies commencent à apparaître</span
          >
          <span v-else-if="degradation.level < 0.8"
            >Le chaos s'installe progressivement</span
          >
          <span v-else class="text-red-400"
            >⚠️ SYSTÈME CRITIQUE - Le bouton secret est maintenant visible
            !</span
          >
        </p>
      </div>
    </section>

    <!-- SECTION 3: COLOR SEQUENCE GAME (FIXED) -->
    <section
      id="game-sequence"
      class="reveal-section relative min-h-screen px-6 py-24 overflow-hidden"
    >
      <!-- Background decoration -->
      <div class="absolute inset-0 pointer-events-none">
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-MyPink/10 via-transparent to-transparent rounded-full animate-breathe"
        />
        <!-- Decorative floating orbs -->
        <div
          class="absolute top-20 right-20 w-32 h-32 bg-MyBlue/5 rounded-full blur-2xl animate-float-slow"
        />
        <div
          class="absolute bottom-32 left-16 w-24 h-24 bg-MyYellow/5 rounded-full blur-2xl animate-parallax-float"
        />
        <!-- Élément discret: Nombre (42) -->
        <div
          class="absolute bottom-6 right-6 font-mono text-lg text-MyGreen/50 tracking-widest transition-all duration-300 hover:text-MyGreen/80 hover:scale-110 cursor-default select-none discrete-hint"
        >
          42
        </div>
      </div>

      <div
        class="mx-auto max-w-2xl text-center relative z-10"
        :style="getElementTransform(3)"
        :class="{
          'shake-subtle': degradationLevel > 0.5,
          'shake-medium': degradationLevel > 0.8,
        }"
      >
        <!-- Glitch overlay qui apparaît avec la dégradation -->
        <div
          v-if="degradationLevel > 0.4"
          class="absolute inset-0 pointer-events-none game-glitch"
          :style="{ opacity: degradationLevel * 0.5 }"
        />

        <h2
          class="font-candy text-4xl text-white md:text-6xl"
          :class="{
            'glitch-text': degradationLevel > 0.6,
            'rgb-split': degradationLevel > 0.8,
          }"
          :data-text="'🧠 Séquence de couleurs'"
        >
          🧠
          <span
            class="text-transparent bg-clip-text bg-gradient-to-r from-MyPink to-MyBlue"
            >Séquence de couleurs</span
          >
        </h2>
        <p
          class="mt-2 font-bricolage text-sm"
          :class="
            degradationLevel > 0.5 ? 'text-red-500/70 flicker' : 'text-zinc-600'
          "
          :style="degradationLevel > 0.6 ? getDestructionStyle(100, 15) : {}"
        >
          {{
            degradationLevel > 0.7
              ? `N!v3au ${sequenceLevel} - ERR0R`
              : `Niveau ${sequenceLevel}`
          }}
        </p>
        <p
          class="mt-2 font-bricolage text-lg"
          :class="{
            'text-MyYellow': showingSequence,
            'text-MyGreen': sequenceMessage.includes('Bravo'),
            'text-red-400': sequenceMessage.includes('Raté'),
            'text-zinc-400':
              !showingSequence &&
              !sequenceMessage.includes('Bravo') &&
              !sequenceMessage.includes('Raté'),
            'text-corrupt': degradationLevel > 0.7,
          }"
          :style="degradationLevel > 0.5 ? getDestructionStyle(101, 20) : {}"
        >
          {{ sequenceMessage }}
        </p>

        <!-- Messages d'erreur qui apparaissent avec la destruction -->
        <div
          v-if="degradationLevel > 0.6"
          class="absolute -top-8 right-0 font-mono text-[9px] text-red-500/50 error-popup"
          :style="getDestructionStyle(102, 30)"
        >
          MEMORY_CORRUPTION
        </div>

        <!-- Progression de la séquence - s'éparpille -->
        <div
          v-if="colorSequence.length > 0 && !showingSequence"
          class="mt-4 flex justify-center gap-2"
          :style="degradationLevel > 0.4 ? getDestructionStyle(103, 25) : {}"
        >
          <div
            v-for="(_, i) in colorSequence"
            :key="`progress-${i}`"
            class="h-3 w-3 rounded-full transition-all"
            :class="[
              i < playerSequence.length
                ? 'bg-MyGreen scale-125'
                : 'bg-zinc-700',
              degradationLevel > 0.5 ? 'shake-subtle' : '',
            ]"
            :style="
              degradationLevel > 0.5 ? getDestructionStyle(110 + i, 20) : {}
            "
          />
        </div>

        <!-- Boutons du jeu - se déstructurent progressivement -->
        <div
          class="mt-8 grid grid-cols-2 gap-4 max-w-md mx-auto destruction-zone"
          :style="degradationLevel > 0.4 ? getDestructionStyle(104, 30) : {}"
        >
          <button
            v-for="(color, index) in sequenceGameColors"
            :key="`seq-${index}`"
            :id="`seq-btn-${index}`"
            class="aspect-square rounded-2xl transition-all hover:scale-105 active:scale-95 relative overflow-hidden"
            :style="{
              backgroundColor: color,
              ...(degradationLevel > 0.3
                ? getGameDestructionStyle(120 + index, 1.5)
                : {}),
            }"
            :class="{
              'ring-4 ring-white ring-offset-4 ring-offset-MyBlack':
                activeSequenceIndex === index,
              'opacity-50 cursor-not-allowed': showingSequence,
              'button-broken': degradationLevel > 0.7,
              distort: degradationLevel > 0.6 && index % 2 === 0,
            }"
            :disabled="showingSequence"
            @click="handleSequenceClick(color, index)"
          >
            <span
              v-if="activeSequenceIndex === index"
              class="absolute inset-0 bg-white/50 animate-ping"
            />
            <!-- Noise overlay sur les boutons en haute dégradation -->
            <div
              v-if="degradationLevel > 0.6"
              class="absolute inset-0 noise-overlay opacity-30 pointer-events-none"
            />
          </button>
        </div>

        <button
          class="mt-8 rounded-full px-8 py-3 font-bricolage text-white transition-all"
          :class="[
            showingSequence
              ? 'bg-zinc-700 cursor-not-allowed'
              : 'bg-MyPink hover:bg-MyPink/80 hover:scale-105',
            degradationLevel > 0.7 ? 'shake-subtle' : '',
          ]"
          :style="degradationLevel > 0.5 ? getDestructionStyle(105, 25) : {}"
          :disabled="showingSequence"
          @click="startSequenceGame"
        >
          {{
            showingSequence
              ? "👀 Regarde..."
              : degradationLevel > 0.8
                ? "🎮 J0U3R"
                : "🎮 JOUER"
          }}
        </button>
      </div>
    </section>

    <!-- SECTION 4: CLICK CHALLENGE -->
    <section
      id="game-click"
      class="reveal-section relative min-h-screen px-6 py-24"
      :class="{ 'vhs-tracking': degradationLevel > 0.7 }"
    >
      <!-- Élément discret: Sablier -->
      <div
        class="absolute top-8 left-8 text-3xl transition-all duration-300 hover:scale-125 cursor-default select-none discrete-hint"
        :style="{
          opacity: 0.65,
          ...(degradationLevel > 0.5 ? getDestructionStyle(130, 40) : {}),
        }"
        :class="{ 'shake-medium': degradationLevel > 0.6 }"
      >
        ⏳
      </div>
      <div
        class="mx-auto max-w-2xl text-center relative"
        :style="getElementTransform(4)"
        :class="{ 'shake-subtle': degradationLevel > 0.5 }"
      >
        <!-- Corruption overlay -->
        <div
          v-if="degradationLevel > 0.5"
          class="absolute inset-0 pointer-events-none scanlines"
          :style="{ opacity: degradationLevel * 0.4 }"
        />

        <h2
          class="font-candy text-4xl text-white md:text-6xl"
          :class="{ 'glitch-text': degradationLevel > 0.6 }"
          :data-text="'⚡ Défi de clics'"
        >
          ⚡ Défi de clics
        </h2>

        <!-- Message d'erreur flottant -->
        <div
          v-if="degradationLevel > 0.65"
          class="absolute -top-4 right-1/4 font-mono text-[8px] text-yellow-500/60 error-popup"
          :style="getDestructionStyle(140, 30)"
        >
          TIMING_DESYNC
        </div>

        <!-- Contenu toujours visible -->
        <div
          class="mt-10"
          :class="{ 'destruction-zone': degradationLevel > 0.6 }"
        >
          <p
            class="font-bricolage text-zinc-500 mb-4"
            :class="{ 'text-corrupt': degradationLevel > 0.7 }"
            :style="degradationLevel > 0.5 ? getDestructionStyle(141, 15) : {}"
          >
            {{
              degradationLevel > 0.8
                ? "Cl1qu3 l3 plu5 v1t3 p0ss1bl3 en 5 s3c0nd35 !"
                : "Clique le plus vite possible en 5 secondes !"
            }}
          </p>

          <!-- Timer et statut - se déstructure -->
          <div
            class="mb-6 font-candy text-8xl relative"
            :class="[
              clickChallenge.started ? 'text-MyYellow' : 'text-zinc-700',
              degradationLevel > 0.6 ? 'rgb-split' : '',
              degradationLevel > 0.7 ? 'shake-subtle' : '',
            ]"
            :style="degradationLevel > 0.5 ? getDestructionStyle(142, 25) : {}"
          >
            {{ clickChallenge.timeLeft || 5 }}
            <!-- Glitch de chiffres -->
            <span
              v-if="degradationLevel > 0.7 && clickChallenge.started"
              class="absolute inset-0 text-red-500/30 flicker"
              :style="{
                transform: `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`,
              }"
            >
              {{ Math.floor(Math.random() * 10) }}
            </span>
          </div>

          <!-- Bouton principal toujours visible - SE CASSE AVEC LA DÉGRADATION -->
          <button
            v-if="!clickChallenge.active"
            class="h-48 w-48 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 font-candy text-4xl text-zinc-400 hover:from-MyPink hover:to-MyBlue hover:text-white hover:scale-105 active:scale-95 transition-all mx-auto block border-2 border-zinc-600 hover:border-transparent relative overflow-hidden"
            :class="{
              'button-broken': degradationLevel > 0.7,
              distort: degradationLevel > 0.6,
            }"
            :style="
              degradationLevel > 0.4 ? getGameDestructionStyle(143, 1.2) : {}
            "
            @click="prepareClickChallenge"
          >
            {{ degradationLevel > 0.8 ? "G0" : "GO" }}
            <div
              v-if="degradationLevel > 0.6"
              class="absolute inset-0 noise-overlay opacity-20 pointer-events-none"
            />
          </button>
          <button
            v-else
            class="h-48 w-48 rounded-full bg-gradient-to-br from-MyPink to-MyBlue font-candy text-4xl text-white hover:scale-105 active:scale-95 transition-transform mx-auto block relative overflow-hidden"
            :class="{
              'shake-medium': degradationLevel > 0.6 && clickChallenge.started,
              'game-glitch': degradationLevel > 0.7,
            }"
            :style="
              degradationLevel > 0.5 ? getGameDestructionStyle(144, 1.5) : {}
            "
            @click="handleChallengeClick"
          >
            {{ clickChallenge.current }}
            <div
              v-if="degradationLevel > 0.5"
              class="absolute inset-0 noise-overlay opacity-30 pointer-events-none"
            />
          </button>

          <p
            v-if="!clickChallenge.active"
            class="mt-4 font-bricolage text-zinc-600 text-sm"
            :class="{ flicker: degradationLevel > 0.6 }"
            :style="degradationLevel > 0.5 ? getDestructionStyle(145, 20) : {}"
          >
            {{
              degradationLevel > 0.7
                ? "Cl1qu3 sur G0 p0ur pr3par3r..."
                : "Clique sur GO pour préparer, puis clique pour démarrer !"
            }}
          </p>
          <p
            v-else-if="!clickChallenge.started"
            class="mt-4 font-bricolage text-MyPink animate-pulse"
            :style="degradationLevel > 0.5 ? getDestructionStyle(146, 15) : {}"
          >
            👆
            {{
              degradationLevel > 0.7
                ? "CL1QU3 !"
                : "Clique sur le bouton pour démarrer le chrono !"
            }}
          </p>
          <p
            v-else
            class="mt-4 font-bricolage text-zinc-500"
            :class="{ 'text-corrupt': degradationLevel > 0.6 }"
          >
            Objectif: {{ clickChallenge.target }} clics
          </p>

          <!-- Barre de progression - se fragmente -->
          <div
            class="mt-4 h-2 w-full max-w-xs mx-auto rounded-full bg-zinc-800 relative overflow-hidden"
            :style="degradationLevel > 0.5 ? getDestructionStyle(147, 20) : {}"
          >
            <div
              class="h-full rounded-full transition-all"
              :class="degradationLevel > 0.6 ? 'bg-red-500' : 'bg-MyGreen'"
              :style="{
                width: `${Math.min(100, (clickChallenge.current / (clickChallenge.target || 20)) * 100)}%`,
              }"
            />
            <!-- Glitch bars -->
            <div v-if="degradationLevel > 0.7" class="absolute inset-0 flex">
              <div
                v-for="i in 5"
                :key="`glitch-bar-${i}`"
                class="h-full bg-MyPink/50"
                :style="{
                  width: '2px',
                  marginLeft: `${Math.random() * 100}%`,
                  opacity: Math.random(),
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 5: TARGET SHOOTING (AMÉLIORÉ) -->
    <section
      id="game-target"
      class="reveal-section relative min-h-screen px-6 py-24"
      :class="{
        'vhs-tracking': degradationLevel > 0.65,
        'screen-tear': degradationLevel > 0.8,
      }"
    >
      <!-- Scanlines globales -->
      <div
        v-if="degradationLevel > 0.5"
        class="absolute inset-0 pointer-events-none scanlines"
        :style="{ opacity: degradationLevel * 0.3 }"
      />

      <!-- Élément discret: Couleur (violet) -->
      <div
        class="absolute bottom-1/3 left-4 text-xs text-purple-400/60 font-bricolage tracking-wide -rotate-90 origin-left transition-all duration-300 hover:text-purple-400/90 cursor-default select-none discrete-hint"
        :style="degradationLevel > 0.5 ? getDestructionStyle(150, 50) : {}"
        :class="{ flicker: degradationLevel > 0.6 }"
      >
        {{ degradationLevel > 0.7 ? "t31nt3 : v10l3t" : "teinte : violet" }}
      </div>

      <div
        class="mx-auto max-w-4xl relative"
        :style="getElementTransform(5)"
        :class="{ 'destruction-zone': degradationLevel > 0.6 }"
      >
        <!-- Error messages flottants -->
        <div
          v-if="degradationLevel > 0.6"
          class="absolute -top-8 left-1/4 font-mono text-[9px] text-red-500/50 error-popup"
          :style="getDestructionStyle(151, 40)"
        >
          TARGET_TRACKING_FAIL
        </div>

        <h2
          class="text-center font-candy text-4xl text-white md:text-6xl"
          :class="{
            'glitch-text': degradationLevel > 0.6,
            'rgb-split': degradationLevel > 0.75,
          }"
          :data-text="'🎯 Chasse aux cibles'"
          :style="degradationLevel > 0.5 ? getDestructionStyle(152, 20) : {}"
        >
          🎯
          {{
            degradationLevel > 0.8 ? "Ch4ss3 4ux c1bl3s" : "Chasse aux cibles"
          }}
        </h2>

        <p
          v-if="targetGame.bestScore > 0"
          class="font-bricolage text-MyGreen mb-4 text-center mt-4"
          :class="{ 'text-corrupt': degradationLevel > 0.7 }"
          :style="degradationLevel > 0.5 ? getDestructionStyle(153, 25) : {}"
        >
          🏆
          {{ degradationLevel > 0.7 ? "M31ll3ur sc0r3:" : "Meilleur score:" }}
          {{ targetGame.bestScore }} points
        </p>

        <p
          class="font-bricolage text-zinc-500 mb-4 text-center"
          :style="degradationLevel > 0.5 ? getDestructionStyle(154, 15) : {}"
        >
          {{
            degradationLevel > 0.7
              ? "T0uch3 un m4x1mum d3 c1bl3s 3n 30 s3c0nd3s !"
              : "Touche un maximum de cibles en 30 secondes !"
          }}
        </p>

        <!-- Difficulty Selection - Toujours visible quand pas actif - Boutons se déstructurent -->
        <div
          v-if="!targetGame.active"
          class="flex flex-wrap justify-center gap-4 mb-6"
          :class="{ 'shake-subtle': degradationLevel > 0.6 }"
        >
          <button
            @click="prepareTargetGame('easy')"
            class="px-6 py-3 rounded-xl font-bricolage font-bold bg-MyGreen text-MyBlack hover:scale-105 transition-transform relative overflow-hidden"
            :class="{ 'button-broken': degradationLevel > 0.7 }"
            :style="
              degradationLevel > 0.4 ? getGameDestructionStyle(155, 1) : {}
            "
          >
            🌱 {{ degradationLevel > 0.8 ? "F4c1l3" : "Facile" }}
            <div
              v-if="degradationLevel > 0.6"
              class="absolute inset-0 noise-overlay opacity-20 pointer-events-none"
            />
          </button>
          <button
            @click="prepareTargetGame('normal')"
            class="px-6 py-3 rounded-xl font-bricolage font-bold bg-MyYellow text-MyBlack hover:scale-105 transition-transform relative overflow-hidden"
            :class="{
              'button-broken': degradationLevel > 0.7,
              distort: degradationLevel > 0.65,
            }"
            :style="
              degradationLevel > 0.4 ? getGameDestructionStyle(156, 1.2) : {}
            "
          >
            ⚡ Normal
            <div
              v-if="degradationLevel > 0.6"
              class="absolute inset-0 noise-overlay opacity-25 pointer-events-none"
            />
          </button>
          <button
            @click="prepareTargetGame('hard')"
            class="px-6 py-3 rounded-xl font-bricolage font-bold bg-MyPink text-MyBlack hover:scale-105 transition-transform relative overflow-hidden"
            :class="{
              'button-broken': degradationLevel > 0.7,
              'game-glitch': degradationLevel > 0.75,
            }"
            :style="
              degradationLevel > 0.4 ? getGameDestructionStyle(157, 1.5) : {}
            "
          >
            🔥 {{ degradationLevel > 0.8 ? "D1ff1c1l3" : "Difficile" }}
            <div
              v-if="degradationLevel > 0.6"
              class="absolute inset-0 noise-overlay opacity-30 pointer-events-none"
            />
          </button>
        </div>

        <!-- Stats bar - Toujours visible quand actif - Se corrompt -->
        <div
          v-if="targetGame.active"
          class="flex justify-center gap-6 font-bricolage text-sm mb-4"
          :class="{ 'shake-subtle': degradationLevel > 0.6 }"
          :style="degradationLevel > 0.5 ? getDestructionStyle(158, 20) : {}"
        >
          <span
            class="text-white font-bold text-lg"
            :class="{ 'rgb-split': degradationLevel > 0.7 }"
          >
            {{ targetGame.score }} pts
          </span>
          <span
            class="font-candy text-2xl"
            :class="[
              targetGame.started ? 'text-MyYellow' : 'text-zinc-600',
              degradationLevel > 0.7 ? 'glitch-text flicker' : '',
            ]"
            :data-text="`${targetGame.timeLeft}s`"
            >{{ targetGame.timeLeft }}s</span
          >
          <span
            v-if="targetGame.combo >= 3"
            class="text-MyPink animate-pulse"
            :class="{ 'shake-subtle': degradationLevel > 0.6 }"
          >
            🔥 x{{ targetGame.combo }}
          </span>
        </div>

        <p
          v-if="targetGame.active && !targetGame.started"
          class="text-center font-bricolage text-MyPink animate-pulse mb-4"
          :style="degradationLevel > 0.5 ? getDestructionStyle(159, 15) : {}"
        >
          👆
          {{
            degradationLevel > 0.7
              ? "Cl1qu3 sur un3 c1bl3 !"
              : "Clique sur une cible pour démarrer le chrono !"
          }}
        </p>

        <!-- Game area - Toujours visible - SE DÉSTRUCTURE -->
        <div
          class="relative h-[400px] rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden cursor-crosshair"
          :class="{
            'shake-subtle': degradationLevel > 0.6 && targetGame.started,
            'game-glitch': degradationLevel > 0.75,
          }"
          :style="
            degradationLevel > 0.5
              ? {
                  borderColor: `rgba(239, 68, 68, ${degradationLevel * 0.5})`,
                  boxShadow: `0 0 ${degradationLevel * 30}px rgba(239, 68, 68, ${degradationLevel * 0.3})`,
                }
              : {}
          "
        >
          <!-- Scanlines sur la zone de jeu -->
          <div
            v-if="degradationLevel > 0.5"
            class="absolute inset-0 pointer-events-none scanlines"
            :style="{ opacity: degradationLevel * 0.4 }"
          />

          <!-- Noise overlay -->
          <div
            v-if="degradationLevel > 0.6"
            class="absolute inset-0 pointer-events-none noise-overlay"
            :style="{ opacity: degradationLevel * 0.3 }"
          />

          <!-- Glitch blocks aléatoires -->
          <div
            v-for="i in degradationLevel > 0.7 ? 3 : 0"
            :key="`target-glitch-${i}`"
            class="absolute pointer-events-none glitch-block"
            :style="{
              left: `${Math.random() * 80}%`,
              top: `${Math.random() * 80}%`,
              width: `${30 + Math.random() * 60}px`,
              height: `${10 + Math.random() * 30}px`,
              backgroundColor: [
                'rgba(239, 68, 68, 0.3)',
                'rgba(59, 130, 246, 0.3)',
                'rgba(34, 197, 94, 0.3)',
              ][i % 3],
            }"
          />

          <!-- Cibles - ELLES BOUGENT ET GLITCHENT -->
          <button
            v-for="target in targets.filter((t) => !t.hit)"
            :key="target.id"
            :data-target-id="target.id"
            class="absolute rounded-full bg-gradient-to-br from-MyPink to-MyBlue hover:from-MyYellow hover:to-MyGreen transition-all cursor-crosshair flex items-center justify-center shadow-lg shadow-MyPink/30"
            :class="{
              'element-drift': degradationLevel > 0.5,
              distort: degradationLevel > 0.7 && target.id % 2 === 0,
            }"
            :style="{
              left: `${target.x + (degradationLevel > 0.6 ? Math.sin(scrollOffset / 1000 + target.id) * degradationLevel * 5 : 0)}%`,
              top: `${target.y + (degradationLevel > 0.6 ? Math.cos(scrollOffset / 1000 + target.id) * degradationLevel * 5 : 0)}%`,
              width: `${target.size * (1 + (degradationLevel > 0.5 ? Math.sin(scrollOffset / 500 + target.id) * 0.1 * degradationLevel : 0))}px`,
              height: `${target.size * (1 + (degradationLevel > 0.5 ? Math.sin(scrollOffset / 500 + target.id) * 0.1 * degradationLevel : 0))}px`,
              transform: `translate(-50%, -50%) rotate(${degradationLevel > 0.5 ? Math.sin(scrollOffset / 800 + target.id) * degradationLevel * 15 : 0}deg)`,
              filter:
                degradationLevel > 0.6
                  ? `hue-rotate(${Math.sin(scrollOffset / 600 + target.id) * degradationLevel * 60}deg)`
                  : 'none',
            }"
            @click="hitTarget(target.id)"
          >
            <span
              class="text-xl"
              :class="{ 'rgb-split': degradationLevel > 0.7 }"
              >🎯</span
            >
          </button>

          <!-- Message quand pas de cibles -->
          <p
            v-if="targets.filter((t) => !t.hit).length === 0"
            class="absolute inset-0 flex items-center justify-center font-bricolage text-zinc-600"
            :class="{ 'text-corrupt': degradationLevel > 0.6 }"
          >
            {{
              targetGame.active
                ? degradationLevel > 0.7
                  ? "Pr3p4r3-t01..."
                  : "Prépare-toi..."
                : degradationLevel > 0.7
                  ? "Ch01s1s un3 d1ff1cult3"
                  : "Choisis une difficulté pour commencer"
            }}
          </p>
        </div>

        <!-- Stats après partie - Se corrompt -->
        <div
          v-if="
            !targetGame.active &&
            (targetGame.score > 0 || targetGame.missed > 0)
          "
          class="bg-zinc-900/50 rounded-xl p-4 max-w-md mx-auto border border-zinc-800 mt-6 relative overflow-hidden"
          :class="{ 'shake-subtle': degradationLevel > 0.6 }"
          :style="degradationLevel > 0.5 ? getDestructionStyle(160, 20) : {}"
        >
          <div
            v-if="degradationLevel > 0.6"
            class="absolute inset-0 noise-overlay opacity-20 pointer-events-none"
          />
          <p
            class="font-bricolage text-zinc-400 text-sm"
            :class="{ flicker: degradationLevel > 0.7 }"
          >
            {{ degradationLevel > 0.7 ? "D3rn13r3 p4rt13" : "Dernière partie" }}
          </p>
          <p
            class="font-candy text-3xl text-white mt-1"
            :class="{
              'rgb-split': degradationLevel > 0.7,
              'glitch-text': degradationLevel > 0.8,
            }"
            :data-text="`${targetGame.score} pts`"
          >
            {{ targetGame.score }} pts
          </p>
          <div
            class="flex justify-center gap-4 mt-2 text-xs text-zinc-500"
            :class="{ 'text-corrupt': degradationLevel > 0.7 }"
          >
            <span
              >{{ degradationLevel > 0.7 ? "T0uch33s:" : "Touchées:" }}
              {{ targetGame.totalTargetsSpawned - targetGame.missed }}</span
            >
            <span
              >{{ degradationLevel > 0.7 ? "R4t33s:" : "Ratées:" }}
              {{ targetGame.missed }}</span
            >
            <span>Max Combo: {{ targetGame.maxCombo }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 6: PUZZLE (Sliding 3x3 puzzle - SE FRAGMENTE) -->
    <section
      id="game-puzzle"
      class="reveal-section relative min-h-screen px-6 py-24"
      :class="{ 'vhs-tracking': degradationLevel > 0.7 }"
    >
      <!-- Scanlines globales -->
      <div
        v-if="degradationLevel > 0.5"
        class="absolute inset-0 pointer-events-none scanlines"
        :style="{ opacity: degradationLevel * 0.25 }"
      />

      <!-- Élément discret: Symbole infini - devient chaotique -->
      <div
        class="absolute top-12 right-8 text-MyBlue/50 text-7xl font-light transition-all duration-300 hover:text-MyBlue/70 hover:scale-110 cursor-default select-none discrete-hint animate-pulse-slow"
        :style="degradationLevel > 0.5 ? getDestructionStyle(200, 60) : {}"
        :class="{
          'shake-medium': degradationLevel > 0.7,
          'rgb-split': degradationLevel > 0.8,
        }"
      >
        {{ degradationLevel > 0.8 ? "∅" : "∞" }}
      </div>
      <!-- Élément discret: Pays - se corrompt -->
      <div
        class="absolute bottom-6 right-6 font-bricolage text-xs text-zinc-500/60 tracking-widest transition-all duration-300 hover:text-MyPink/80 cursor-default select-none discrete-hint"
        :style="degradationLevel > 0.5 ? getDestructionStyle(201, 40) : {}"
        :class="{ flicker: degradationLevel > 0.6 }"
      >
        {{ degradationLevel > 0.7 ? "d3s1gn · 1sl4nd3" : "design · islande" }}
      </div>
      <div
        class="mx-auto max-w-3xl relative"
        :style="getElementTransform(6)"
        :class="{ 'destruction-zone': degradationLevel > 0.6 }"
      >
        <!-- Messages d'erreur -->
        <div
          v-if="degradationLevel > 0.6"
          class="absolute -top-8 left-1/3 font-mono text-[9px] text-red-500/50 error-popup"
          :style="getDestructionStyle(202, 35)"
        >
          PUZZLE_MATRIX_CORRUPT
        </div>

        <h2
          class="text-center font-candy text-4xl text-white md:text-6xl"
          :class="{
            'glitch-text': degradationLevel > 0.6,
            'rgb-split': degradationLevel > 0.75,
          }"
          :data-text="'🧩 Puzzle Coulissant'"
          :style="degradationLevel > 0.5 ? getDestructionStyle(203, 20) : {}"
        >
          🧩
          {{
            degradationLevel > 0.8 ? "Puzzl3 C0ul1ss4nt" : "Puzzle Coulissant"
          }}
        </h2>
        <p
          class="mt-4 text-center font-bricolage text-zinc-500"
          :class="{ 'text-corrupt': degradationLevel > 0.7 }"
          :style="degradationLevel > 0.5 ? getDestructionStyle(204, 15) : {}"
        >
          {{ slidingMessage }}
        </p>

        <!-- Best records display - se corrompt -->
        <div
          v-if="slidingGame.bestTime > 0"
          class="mt-2 flex justify-center gap-6 text-sm"
          :class="{ 'shake-subtle': degradationLevel > 0.6 }"
          :style="degradationLevel > 0.5 ? getDestructionStyle(205, 25) : {}"
        >
          <span
            class="text-MyGreen font-bricolage"
            :class="{ flicker: degradationLevel > 0.7 }"
          >
            🏆 {{ degradationLevel > 0.7 ? "M31ll3ur:" : "Meilleur temps:" }}
            {{ slidingGame.bestTime }}s
          </span>
          <span
            class="text-MyBlue font-bricolage"
            :class="{ 'rgb-split': degradationLevel > 0.7 }"
          >
            ⭐ Min coups: {{ slidingGame.bestMoves }}
          </span>
        </div>

        <!-- Current game stats - devient chaotique -->
        <div
          v-if="slidingGame.active"
          class="mt-4 flex justify-center gap-6 font-bricolage"
          :class="{ 'shake-subtle': degradationLevel > 0.6 }"
        >
          <span
            class="text-MyYellow font-candy text-2xl"
            :class="{ 'glitch-text': degradationLevel > 0.7 }"
            :data-text="`⏱️ ${slidingGame.timer}s`"
          >
            ⏱️ {{ slidingGame.timer }}s
          </span>
          <span
            class="text-white text-lg"
            :class="{ 'text-corrupt': degradationLevel > 0.7 }"
          >
            👆 {{ slidingGame.moves }}
            {{ degradationLevel > 0.7 ? "c0ups" : "coups" }}
          </span>
        </div>

        <div class="mt-8 mx-auto max-w-sm">
          <div class="flex justify-center gap-4 mb-4">
            <label class="text-sm text-zinc-400 self-center">Image :</label>
            <div class="flex gap-2">
              <button
                v-for="svg in svgFiles"
                :key="svg"
                @click="selectSvg(svg)"
                :class="{ 'ring-2 ring-white': selectedSvg === svg }"
                class="h-10 w-14 rounded overflow-hidden bg-zinc-800 hover:scale-105 transition-transform"
                :style="{
                  backgroundImage: `url(${svg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }"
              ></button>
            </div>
          </div>

          <!-- GRILLE DU PUZZLE - SE FRAGMENTE -->
          <div
            class="grid grid-cols-3 gap-2 relative"
            style="user-select: none"
            :class="{ 'destruction-zone': degradationLevel > 0.7 }"
          >
            <div
              v-if="degradationLevel > 0.6"
              class="absolute inset-0 pointer-events-none scanlines"
              :style="{ opacity: degradationLevel * 0.3, zIndex: 10 }"
            />

            <button
              v-for="(tile, idx) in slidingTiles"
              :key="`tile-${idx}`"
              @click="handleTileClick(idx)"
              class="aspect-square rounded-lg flex items-center justify-center transition-all hover:scale-105 p-0 relative overflow-hidden"
              :class="{
                'element-drift': degradationLevel > 0.5 && tile !== 0,
                'shake-subtle':
                  degradationLevel > 0.7 && tile !== 0 && tile % 2 === 0,
              }"
              :style="
                tile === 0
                  ? {
                      opacity: 0.15,
                      background: 'transparent',
                      cursor: 'default',
                    }
                  : Object.assign(
                      {
                        cursor: 'pointer',
                        ...(degradationLevel > 0.4
                          ? {
                              transform: `translate(${Math.sin(scrollOffset / 1000 + tile) * degradationLevel * 8}px, ${Math.cos(scrollOffset / 1000 + tile) * degradationLevel * 8}px) rotate(${Math.sin(scrollOffset / 800 + tile) * degradationLevel * 10}deg)`,
                              filter: `hue-rotate(${Math.sin(scrollOffset / 500 + tile) * degradationLevel * 40}deg)`,
                            }
                          : {}),
                      },
                      tileBgStyle(tile),
                    )
              "
            >
              <span v-if="tile === 0" class="text-zinc-400">&nbsp;</span>
              <div
                v-if="degradationLevel > 0.6 && tile !== 0"
                class="absolute inset-0 noise-overlay pointer-events-none"
                :style="{ opacity: degradationLevel * 0.25 }"
              />
            </button>
          </div>

          <!-- Boutons de contrôle - se cassent -->
          <div
            class="flex justify-center gap-4 mt-6"
            :class="{ 'shake-subtle': degradationLevel > 0.6 }"
          >
            <button
              class="px-4 py-2 rounded-full bg-MyBlue text-MyBlack font-bricolage font-bold hover:scale-105 transition-transform relative overflow-hidden"
              :class="{ 'button-broken': degradationLevel > 0.7 }"
              :style="
                degradationLevel > 0.5 ? getGameDestructionStyle(220, 1.2) : {}
              "
              @click="shuffleSliding()"
            >
              🔀
              {{
                slidingGame.active
                  ? degradationLevel > 0.7
                    ? "R3c0mm3nc3r"
                    : "Recommencer"
                  : degradationLevel > 0.7
                    ? "J0u3r"
                    : "Jouer"
              }}
              <div
                v-if="degradationLevel > 0.6"
                class="absolute inset-0 noise-overlay opacity-20 pointer-events-none"
              />
            </button>
            <button
              v-if="slidingGame.active"
              class="px-4 py-2 rounded-full bg-zinc-700 text-white font-bricolage hover:bg-zinc-600 transition-colors relative overflow-hidden"
              :class="{ 'button-broken': degradationLevel > 0.7 }"
              :style="
                degradationLevel > 0.5 ? getGameDestructionStyle(221, 1) : {}
              "
              @click="initSliding()"
            >
              ⏹️ {{ degradationLevel > 0.7 ? "4b4nd0nn3r" : "Abandonner" }}
              <div
                v-if="degradationLevel > 0.6"
                class="absolute inset-0 noise-overlay opacity-20 pointer-events-none"
              />
            </button>
          </div>

          <p
            class="mt-3 text-center text-sm text-zinc-400"
            :class="{
              'text-corrupt': degradationLevel > 0.7,
              flicker: degradationLevel > 0.8,
            }"
          >
            {{
              degradationLevel > 0.7
                ? "Cl1c sur un3 tu1l3..."
                : "Clic sur une tuile adjacente pour la déplacer. Remets les tuiles dans l'ordre pour gagner !"
            }}
          </p>

          <!-- Puzzles solved counter -->
          <p
            v-if="slidingGame.puzzlesSolved > 0"
            class="mt-2 text-center text-xs text-MyGreen"
            :class="{ 'rgb-split': degradationLevel > 0.7 }"
          >
            ✅ {{ slidingGame.puzzlesSolved }} puzzle(s)
            {{ degradationLevel > 0.7 ? "r3s0lu(s)" : "résolu(s)" }} cette
            session
          </p>
        </div>
      </div>
    </section>

    <!-- SECTION 7: MEMORY GAME AVANCÉ - SE CORROMPT -->
    <section
      class="reveal-section relative min-h-screen px-6 py-24"
      :class="{ 'vhs-tracking': degradationLevel > 0.7 }"
    >
      <!-- Scanlines -->
      <div
        v-if="degradationLevel > 0.5"
        class="absolute inset-0 pointer-events-none scanlines"
        :style="{ opacity: degradationLevel * 0.25 }"
      />

      <div
        class="mx-auto max-w-3xl text-center relative"
        :style="getElementTransform(7)"
        :class="{ 'destruction-zone': degradationLevel > 0.6 }"
      >
        <!-- Message d'erreur -->
        <div
          v-if="degradationLevel > 0.6"
          class="absolute -top-6 right-1/4 font-mono text-[9px] text-red-500/50 error-popup"
          :style="getDestructionStyle(300, 30)"
        >
          MEMORY_LEAK_DETECTED
        </div>

        <h2
          class="font-candy text-4xl text-white md:text-6xl"
          :class="{
            'glitch-text': degradationLevel > 0.6,
            'rgb-split': degradationLevel > 0.75,
          }"
          :data-text="'🃏 Memory Pro'"
          :style="degradationLevel > 0.5 ? getDestructionStyle(301, 20) : {}"
        >
          🃏 {{ degradationLevel > 0.8 ? "M3m0ry Pr0" : "Memory Pro" }}
        </h2>
        <p
          class="mt-4 font-bricolage text-zinc-500"
          :class="{ 'text-corrupt': degradationLevel > 0.7 }"
          :style="degradationLevel > 0.5 ? getDestructionStyle(302, 15) : {}"
        >
          {{ memoryMessage }}
        </p>

        <!-- Stats du jeu - se déstructurent -->
        <div
          v-if="memoryGameActive"
          class="mt-4 flex justify-center gap-6 font-bricolage text-sm"
          :class="{ 'shake-subtle': degradationLevel > 0.6 }"
        >
          <span
            class="text-zinc-400"
            :class="{ 'glitch-text': degradationLevel > 0.7 }"
            :data-text="`⏱️ ${memoryTimer}s`"
          >
            ⏱️ {{ memoryTimer }}s
          </span>
          <span
            class="text-zinc-400"
            :class="{ 'text-corrupt': degradationLevel > 0.7 }"
          >
            👆 {{ memoryMoves }}
            {{ degradationLevel > 0.7 ? "c0ups" : "coups" }}
          </span>
          <span
            class="text-MyYellow"
            v-if="memoryCombo > 1"
            :class="{ 'shake-subtle rgb-split': degradationLevel > 0.6 }"
          >
            🔥 Combo x{{ memoryCombo }}
          </span>
        </div>

        <!-- Meilleur temps par niveau -->
        <div
          v-if="!memoryGameActive && (memoryBestTime[memoryLevel] ?? 999) < 999"
          class="mt-2 font-bricolage text-sm text-MyGreen"
          :class="{ flicker: degradationLevel > 0.7 }"
          :style="degradationLevel > 0.5 ? getDestructionStyle(303, 20) : {}"
        >
          🏆
          {{
            degradationLevel > 0.7 ? "M31ll3ur t3mps" : "Meilleur temps"
          }}
          niveau {{ memoryLevel }}: {{ memoryBestTime[memoryLevel] }}s
        </div>

        <!-- Sélection de niveau - boutons se cassent -->
        <div v-if="!memoryGameActive" class="mt-8">
          <p
            class="font-bricolage text-sm text-zinc-500 mb-4"
            :class="{ 'text-corrupt': degradationLevel > 0.7 }"
          >
            {{
              degradationLevel > 0.7
                ? "Ch01s1s un n1v34u :"
                : "Choisis un niveau :"
            }}
          </p>
          <div
            class="flex justify-center gap-4"
            :class="{ 'shake-subtle': degradationLevel > 0.6 }"
          >
            <button
              v-for="level in [1, 2, 3]"
              :key="`level-${level}`"
              class="px-6 py-3 rounded-xl font-bricolage font-bold transition-all hover:scale-105 relative overflow-hidden"
              :class="{
                'bg-MyBlue text-MyBlack': level === 1,
                'bg-MyPink text-MyBlack': level === 2,
                'bg-MyYellow text-MyBlack': level === 3,
                'ring-2 ring-white ring-offset-2 ring-offset-MyBlack':
                  memoryLevel === level,
                'button-broken': degradationLevel > 0.7,
                distort: degradationLevel > 0.65 && level === 2,
              }"
              :style="
                degradationLevel > 0.5
                  ? getGameDestructionStyle(310 + level, 1)
                  : {}
              "
              @click="selectMemoryLevel(level)"
            >
              <span v-if="level === 1">
                🌱 {{ degradationLevel > 0.7 ? "F4c1l3" : "Facile" }}<br />
                <span class="text-xs opacity-70">6 paires</span>
              </span>
              <span v-else-if="level === 2">
                🌿 Normal<br />
                <span class="text-xs opacity-70">8 paires</span>
              </span>
              <span v-else>
                🌳 {{ degradationLevel > 0.7 ? "D1ff1c1l3" : "Difficile"
                }}<br />
                <span class="text-xs opacity-70">10 paires</span>
              </span>
              <div
                v-if="degradationLevel > 0.6"
                class="absolute inset-0 noise-overlay opacity-20 pointer-events-none"
              />
            </button>
          </div>
        </div>

        <!-- Grille de cartes - SE FRAGMENTE -->
        <div
          v-if="memoryCards.length > 0"
          class="mt-8 grid gap-2 max-w-xl mx-auto relative"
          :style="{ gridTemplateColumns: `repeat(${getMemoryGridCols}, 1fr)` }"
          :class="{ 'destruction-zone': degradationLevel > 0.7 }"
        >
          <!-- Scanlines sur les cartes -->
          <div
            v-if="degradationLevel > 0.6"
            class="absolute inset-0 pointer-events-none scanlines"
            :style="{ opacity: degradationLevel * 0.3, zIndex: 20 }"
          />

          <button
            v-for="(card, cardIdx) in memoryCards"
            :key="`card-${card.id}`"
            class="aspect-square rounded-lg transition-all duration-300 flex items-center justify-center text-2xl md:text-3xl relative overflow-hidden"
            :class="{
              'bg-zinc-800 hover:bg-zinc-700': !card.flipped && !card.matched,
              'bg-MyPink scale-105': card.flipped && !card.matched,
              'bg-MyGreen': card.matched,
              'cursor-not-allowed opacity-70': card.matched,
              'element-drift': degradationLevel > 0.5,
              'shake-subtle': degradationLevel > 0.7 && cardIdx % 3 === 0,
            }"
            :style="
              degradationLevel > 0.4
                ? {
                    transform: `translate(${Math.sin(scrollOffset / 1000 + card.id) * degradationLevel * 6}px, ${Math.cos(scrollOffset / 1000 + card.id) * degradationLevel * 6}px) rotate(${Math.sin(scrollOffset / 800 + card.id) * degradationLevel * 8}deg)`,
                    filter: `hue-rotate(${Math.sin(scrollOffset / 500 + card.id) * degradationLevel * 30}deg)`,
                  }
                : {}
            "
            :disabled="card.matched"
            @click="flipCard(card)"
          >
            <span
              v-if="card.flipped || card.matched"
              :class="{ 'rgb-split': degradationLevel > 0.7 }"
            >
              {{ card.emoji }}
            </span>
            <span
              v-else
              class="opacity-30 text-lg"
              :class="{ flicker: degradationLevel > 0.6 }"
            >
              {{ degradationLevel > 0.8 ? "¿" : "?" }}
            </span>
            <!-- Noise sur les cartes -->
            <div
              v-if="degradationLevel > 0.6"
              class="absolute inset-0 noise-overlay pointer-events-none"
              :style="{ opacity: degradationLevel * 0.2 }"
            />
          </button>
        </div>

        <button
          v-if="!memoryGameActive && memoryCards.length > 0"
          class="mt-8 rounded-full bg-zinc-800 px-6 py-2 font-bricolage text-white hover:bg-zinc-700 transition-colors"
          @click="initMemoryGame()"
        >
          🔄 Rejouer niveau {{ memoryLevel }}
        </button>
      </div>
    </section>

    <!-- SECTION 8: REACTION TIME -->
    <section class="reveal-section relative min-h-screen px-6 py-24">
      <div
        class="mx-auto max-w-2xl text-center"
        :style="getElementTransform(8)"
      >
        <h2 class="font-candy text-4xl text-white md:text-6xl">⚡ Réflexes</h2>
        <p class="mt-4 font-bricolage text-zinc-500">
          Clique dès que l'écran devient vert !
        </p>
        <p
          v-if="reactionGame.bestTime < 999999"
          class="mt-2 font-bricolage text-sm text-MyGreen"
        >
          Meilleur temps: {{ reactionGame.bestTime }}ms
        </p>

        <button
          class="mt-10 h-64 w-64 mx-auto rounded-3xl transition-all duration-200 flex items-center justify-center font-candy text-2xl"
          :class="{
            'bg-zinc-800 hover:bg-zinc-700 text-white':
              reactionGame.state === 'waiting',
            'bg-MyYellow text-MyBlack': reactionGame.state === 'ready',
            'bg-MyGreen text-MyBlack animate-pulse':
              reactionGame.state === 'go',
            'bg-MyBlue text-white': reactionGame.state === 'result',
            'bg-red-500 text-white': reactionGame.state === 'tooEarly',
          }"
          @click="
            reactionGame.state === 'waiting'
              ? startReactionGame()
              : handleReactionClick()
          "
        >
          <span v-if="reactionGame.state === 'waiting'"
            >Clique pour<br />commencer</span
          >
          <span v-else-if="reactionGame.state === 'ready'">Attends...</span>
          <span v-else-if="reactionGame.state === 'go'">MAINTENANT !</span>
          <span v-else-if="reactionGame.state === 'result'"
            >{{ reactionGame.reactionTime }}ms</span
          >
          <span v-else-if="reactionGame.state === 'tooEarly'">Trop tôt !</span>
        </button>
      </div>
    </section>

    <!-- SECTION 9: TYPING CHALLENGE -->
    <section class="reveal-section relative min-h-screen px-6 py-24">
      <div
        class="mx-auto max-w-2xl text-center"
        :style="getElementTransform(9)"
      >
        <h2 class="font-candy text-4xl text-white md:text-6xl">⌨️ Typing</h2>

        <p class="font-bricolage text-zinc-500 mt-4">
          Tape les mots le plus vite possible en 30 secondes !
        </p>

        <p
          v-if="!typingGame.active && typingGame.score > 0"
          class="mt-2 font-bricolage text-sm text-MyGreen"
        >
          Dernier score: {{ typingGame.score }} points ({{
            typingGame.wordsCompleted
          }}
          mots)
        </p>

        <!-- Contenu du jeu toujours visible -->
        <div class="mt-10">
          <div class="flex justify-between items-center mb-6 max-w-md mx-auto">
            <span
              class="font-candy text-3xl"
              :class="typingGame.started ? 'text-MyYellow' : 'text-zinc-600'"
              >{{ typingGame.timeLeft || 30 }}s</span
            >
            <span class="font-bricolage text-zinc-400"
              >Score: {{ typingGame.score }}</span
            >
          </div>

          <p class="font-candy text-6xl text-white mb-8">
            {{ typingGame.targetWord || "chaos" }}
          </p>

          <!-- Bouton pour préparer le jeu si pas actif -->
          <button
            v-if="!typingGame.active"
            class="mb-4 rounded-full bg-MyYellow px-8 py-3 font-bricolage text-lg font-bold text-MyBlack hover:scale-105 transition-transform"
            @click="prepareTypingGame"
          >
            Préparer
          </button>

          <p
            v-if="typingGame.active && !typingGame.started"
            class="font-bricolage text-MyPink animate-pulse mb-4"
          >
            👆 Commence à taper pour démarrer le chrono !
          </p>

          <input
            type="text"
            :value="typingGame.userInput"
            @input="handleTypingInput"
            :disabled="!typingGame.active"
            class="w-full max-w-md mx-auto block bg-zinc-800 border-2 rounded-xl px-6 py-4 text-center font-bricolage text-2xl text-white focus:outline-none transition-colors"
            :class="
              typingGame.active
                ? 'border-MyPink focus:border-MyYellow'
                : 'border-zinc-700 opacity-50'
            "
            placeholder="Tape le mot ici..."
          />

          <p class="mt-4 font-bricolage text-sm text-zinc-600">
            Mots complétés: {{ typingGame.wordsCompleted }}
          </p>
        </div>
      </div>
    </section>

    <!-- SECTION 10: FAKE VICTORY BUTTON (Troll Game) -->
    <section
      class="reveal-section relative min-h-screen px-6 py-24 overflow-hidden"
    >
      <div class="mx-auto max-w-4xl text-center">
        <h2 class="font-candy text-4xl text-white md:text-6xl mb-4">
          <span
            class="text-transparent bg-clip-text bg-gradient-to-r from-MyYellow via-MyPink to-MyBlue"
            >Attrape-moi</span
          >
        </h2>
        <p class="font-bricolage text-zinc-500 mb-8">
          Clique sur le bouton pour gagner... si tu peux !
        </p>

        <p
          v-if="fakeButton.attempts > 0"
          class="font-bricolage text-MyPink mb-4"
        >
          Tentatives: {{ fakeButton.attempts }}
        </p>

        <!-- Fake button container -->
        <div
          class="relative h-[400px] rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden"
        >
          <!-- Background troll messages removed as requested -->

          <!-- The fake button that escapes -->
          <button
            class="absolute px-8 py-4 rounded-xl font-candy text-xl text-MyBlack transition-all duration-150 ease-out hover:scale-110"
            :class="{
              'bg-gradient-to-r from-MyGreen to-MyYellow':
                fakeButton.attempts === 0,
              'bg-gradient-to-r from-MyYellow to-MyPink':
                fakeButton.attempts > 0 && fakeButton.attempts < 5,
              'bg-gradient-to-r from-MyPink to-MyBlue':
                fakeButton.attempts >= 5 && fakeButton.attempts < 10,
              'bg-gradient-to-r from-MyBlue to-MyGreen animate-pulse':
                fakeButton.attempts >= 10,
            }"
            :style="{
              left: `${fakeButton.x}%`,
              top: `${fakeButton.y}%`,
              transform: 'translate(-50%, -50%)',
              boxShadow:
                fakeButton.attempts >= 10
                  ? '0 0 30px rgba(107, 255, 255, 0.5)'
                  : '0 0 20px rgba(187, 255, 66, 0.3)',
            }"
            @mouseenter="handleFakeButtonHover"
            @touchstart.prevent="handleFakeButtonHover"
            @click.prevent="handleFakeButtonClick"
          >
            {{ currentFakeMessage }}
          </button>
        </div>

        <p class="mt-6 font-bricolage text-sm text-zinc-600">
          <span v-if="fakeButton.attempts === 0">Vas-y, clique !</span>
          <span v-else-if="fakeButton.attempts < 5">Continue d'essayer...</span>
          <span v-else-if="fakeButton.attempts < 10"
            >Tu commences à comprendre ?</span
          >
          <span v-else-if="fakeButton.attempts < 20"
            >Impressionnante persévérance !</span
          >
          <span v-else class="text-MyPink">Tu as persévéré.</span>
        </p>
      </div>
    </section>

    <!-- SECTION 11: FINAL ZONE -->
    <section
      class="relative min-h-screen px-6 py-24 flex items-center justify-center"
    >
      <div class="text-center" :style="getElementTransform(11)">
        <h2 class="font-candy text-5xl text-white md:text-7xl">
          {{
            degradation.phase === "broken" ? "🔓 DÉVERROUILLÉ" : "🔒 VERROUILLÉ"
          }}
        </h2>

        <p class="mt-8 font-bricolage text-xl text-zinc-400">
          <span v-if="degradation.level < 0.7">
            Continue d'interagir pour atteindre le chaos...
            <br />
            <span class="text-zinc-600"
              >Dégradation: {{ Math.round(degradation.level * 100) }}% / 70%
              requis</span
            >
          </span>
          <span v-else-if="!gameWon">
            Le bouton secret est maintenant quelque part sur la page !
            <br />
            <span class="text-MyGreen"
              >Cherche attentivement... ou utilise un indice 💡</span
            >
          </span>
        </p>

        <div
          class="mt-12 h-4 w-64 mx-auto rounded-full bg-zinc-800 overflow-hidden"
        >
          <div
            class="h-full transition-all duration-500"
            :class="degradation.level >= 0.7 ? 'bg-MyGreen' : 'bg-MyPink'"
            :style="{
              width: `${Math.min(100, (degradation.level / 0.7) * 100)}%`,
            }"
          />
        </div>
        <p class="mt-2 font-bricolage text-xs text-zinc-600">
          Progression vers le déverrouillage
        </p>
      </div>
    </section>

    <!-- SPACER FOR MORE SCROLL -->
    <div class="h-screen flex items-center justify-center">
      <p class="font-bricolage text-zinc-700 text-center">
        Continue de chercher...<br />
        <span class="text-xs">Le bouton est petit et presque invisible</span>
      </p>
    </div>
  </main>
</template>

<style scoped>
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-bounce {
  animation: bounce 2s ease-in-out infinite;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* New animations for enhanced visuals */
@keyframes float-slow {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(30px, -30px) scale(1.1);
  }
}

@keyframes float-slow-reverse {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-30px, 30px) scale(1.1);
  }
}

@keyframes pulse-slow {
  0%,
  100% {
    opacity: 0.3;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(1.2);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes title-reveal {
  from {
    opacity: 0;
    transform: translateY(30px) rotateX(-20deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotateX(0);
  }
}

@keyframes secret-glow {
  0%,
  100% {
    box-shadow:
      0 0 20px #bbff42,
      0 0 40px #bbff42aa;
  }
  50% {
    box-shadow:
      0 0 30px #bbff42,
      0 0 60px #bbff42aa,
      0 0 80px #bbff4266;
  }
}

.animate-float-slow {
  animation: float-slow 8s ease-in-out infinite;
}

.animate-float-slow-reverse {
  animation: float-slow-reverse 10s ease-in-out infinite;
}

.animate-pulse-slow {
  animation: pulse-slow 6s ease-in-out infinite;
}

.animate-fade-in {
  animation: fade-in 0.8s ease-out forwards;
}

.animate-fade-in-up {
  opacity: 0;
  animation: fade-in-up 0.8s ease-out forwards;
}

.animate-title-reveal {
  opacity: 0;
  animation: title-reveal 0.8s ease-out forwards;
}

.hero-title-glow {
  text-shadow: 0 0 40px rgba(255, 255, 255, 0.1);
}

.secret-btn-glow {
  animation: secret-glow 2s ease-in-out infinite;
}

/* Horizontal scroll styles */
.horizontal-scroll-wrapper {
  overflow: hidden;
}

.horizontal-scroll-container {
  will-change: transform;
}

.horizontal-panel {
  flex-shrink: 0;
}

.horizontal-progress-dots {
  opacity: 0;
  transition: opacity 0.3s;
}

.horizontal-scroll-wrapper:hover .horizontal-progress-dots,
.horizontal-scroll-wrapper .horizontal-progress-dots {
  opacity: 1;
}

/* Gradient animation for text */
@keyframes gradient-x {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.animate-gradient-x {
  background-size: 200% auto;
  animation: gradient-x 3s ease infinite;
}

/* Glow effects for cards */
.glow-pink {
  box-shadow: 0 0 30px rgba(255, 102, 200, 0.3);
}

.glow-blue {
  box-shadow: 0 0 30px rgba(107, 255, 255, 0.3);
}

.glow-yellow {
  box-shadow: 0 0 30px rgba(255, 247, 70, 0.3);
}

/* Cartoon cursor styles */
/* custom cursor removed - native cursor visible */

.glow-green {
  box-shadow: 0 0 30px rgba(187, 255, 66, 0.3);
}

/* Shimmer effect */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

/* Neon text effect */
.neon-pink {
  text-shadow:
    0 0 10px #ff66c8,
    0 0 20px #ff66c8,
    0 0 40px #ff66c8;
}

.neon-blue {
  text-shadow:
    0 0 10px #6bffff,
    0 0 20px #6bffff,
    0 0 40px #6bffff;
}

.neon-yellow {
  text-shadow:
    0 0 10px #fff746,
    0 0 20px #fff746,
    0 0 40px #fff746;
}

.neon-green {
  text-shadow:
    0 0 10px #bbff42,
    0 0 20px #bbff42,
    0 0 40px #bbff42;
}

/* Starfield background for hidden game */
.starfield-bg {
  background-image:
    radial-gradient(2px 2px at 20px 30px, white, transparent),
    radial-gradient(
      2px 2px at 40px 70px,
      rgba(255, 255, 255, 0.8),
      transparent
    ),
    radial-gradient(1px 1px at 90px 40px, white, transparent),
    radial-gradient(
      2px 2px at 160px 120px,
      rgba(255, 255, 255, 0.9),
      transparent
    ),
    radial-gradient(1px 1px at 230px 80px, white, transparent),
    radial-gradient(
      2px 2px at 300px 150px,
      rgba(255, 255, 255, 0.7),
      transparent
    ),
    radial-gradient(1px 1px at 370px 60px, white, transparent),
    radial-gradient(
      2px 2px at 450px 200px,
      rgba(255, 255, 255, 0.8),
      transparent
    );
  background-size: 500px 250px;
  animation: starfield-move 60s linear infinite;
}

@keyframes starfield-move {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 500px 250px;
  }
}

/* Slow spin for stars */
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
}

/* Star catch animation */
@keyframes star-catch {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.8;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}

.star-caught {
  animation: star-catch 0.3s ease-out forwards;
}

/* Discrete hints - subtle hover effect */
.discrete-hint {
  position: relative;
}

.discrete-hint::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 4px;
  background: transparent;
  transition: background 0.3s ease;
  pointer-events: none;
}

.discrete-hint:hover::after {
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.05) 0%,
    transparent 70%
  );
}

/* Enhanced scroll animations */
.reveal-section {
  opacity: 1;
}

@keyframes slide-up-fade {
  from {
    opacity: 0;
    transform: translateY(60px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes blur-in {
  from {
    opacity: 0;
    filter: blur(10px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}

/* Parallax-like floating elements */
@keyframes parallax-float {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(10px, -15px) rotate(2deg);
  }
  50% {
    transform: translate(-5px, -25px) rotate(-1deg);
  }
  75% {
    transform: translate(-15px, -10px) rotate(1deg);
  }
}

.animate-parallax-float {
  animation: parallax-float 20s ease-in-out infinite;
}

/* Subtle breathing animation for backgrounds */
@keyframes breathe {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.05);
  }
}

.animate-breathe {
  animation: breathe 8s ease-in-out infinite;
}

/* Staggered reveal for grid items */
@keyframes stagger-in {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Glowing border animation */
@keyframes glow-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(255, 102, 200, 0);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 102, 200, 0.3);
  }
}

.animate-glow-pulse {
  animation: glow-pulse 3s ease-in-out infinite;
}

/* Text shimmer effect */
@keyframes text-shimmer {
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.text-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: text-shimmer 3s ease-in-out infinite;
  -webkit-background-clip: text;
  background-clip: text;
}

/* Butterfly transition */
.butterfly-enter-active,
.butterfly-leave-active {
  transition:
    opacity 0.8s ease,
    transform 0.8s ease;
}

.butterfly-enter-from {
  opacity: 0;
  transform: translateX(-50px) scale(0.5);
}

.butterfly-leave-to {
  opacity: 0;
  transform: translateX(50px) scale(0.5);
}

/* Hint fade transition */
.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: all 0.3s ease;
}

.hint-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.hint-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* ==================== SYSTÈME DE DESTRUCTION/GLITCH ==================== */

/* Shake animations de différentes intensités */
.shake-subtle {
  animation: shake-subtle 0.5s ease-in-out infinite;
}

@keyframes shake-subtle {
  0%,
  100% {
    transform: translate(0);
  }
  25% {
    transform: translate(-1px, 1px);
  }
  50% {
    transform: translate(1px, -1px);
  }
  75% {
    transform: translate(-1px, -1px);
  }
}

.shake-medium {
  animation: shake-medium 0.3s ease-in-out infinite;
}

@keyframes shake-medium {
  0%,
  100% {
    transform: translate(0);
  }
  25% {
    transform: translate(-3px, 2px);
  }
  50% {
    transform: translate(3px, -2px);
  }
  75% {
    transform: translate(-2px, -1px);
  }
}

.shake-intense {
  animation: shake-intense 0.15s ease-in-out infinite;
}

@keyframes shake-intense {
  0%,
  100% {
    transform: translate(0) rotate(0deg);
  }
  20% {
    transform: translate(-5px, 3px) rotate(-1deg);
  }
  40% {
    transform: translate(4px, -2px) rotate(1deg);
  }
  60% {
    transform: translate(-3px, -4px) rotate(-0.5deg);
  }
  80% {
    transform: translate(5px, 2px) rotate(0.5deg);
  }
}

/* Glitch text effect */
.glitch-text {
  position: relative;
}

.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.8;
}

.glitch-text::before {
  animation: glitch-anim-1 0.4s infinite linear alternate-reverse;
  color: #ff66c8;
  clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
}

.glitch-text::after {
  animation: glitch-anim-2 0.4s infinite linear alternate-reverse;
  color: #6bffff;
  clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
}

@keyframes glitch-anim-1 {
  0% {
    transform: translate(0);
  }
  20% {
    transform: translate(-2px, 2px);
  }
  40% {
    transform: translate(2px, -2px);
  }
  60% {
    transform: translate(-1px, 1px);
  }
  80% {
    transform: translate(1px, -1px);
  }
  100% {
    transform: translate(0);
  }
}

@keyframes glitch-anim-2 {
  0% {
    transform: translate(0);
  }
  20% {
    transform: translate(2px, -2px);
  }
  40% {
    transform: translate(-2px, 2px);
  }
  60% {
    transform: translate(1px, -1px);
  }
  80% {
    transform: translate(-1px, 1px);
  }
  100% {
    transform: translate(0);
  }
}

/* Scanlines effect */
.scanlines {
  position: relative;
  overflow: hidden;
}

.scanlines::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  pointer-events: none;
  z-index: 10;
}

/* RGB split effect */
.rgb-split {
  animation: rgb-split 0.2s steps(2) infinite;
}

@keyframes rgb-split {
  0%,
  100% {
    text-shadow:
      -2px 0 #ff66c8,
      2px 0 #6bffff;
  }
  50% {
    text-shadow:
      2px 0 #ff66c8,
      -2px 0 #6bffff;
  }
}

/* Corruption text effect */
.text-corrupt {
  animation: text-corrupt 0.5s steps(4) infinite;
}

@keyframes text-corrupt {
  0%,
  100% {
    transform: translate(0) skewX(0deg);
    opacity: 1;
  }
  25% {
    transform: translate(-2px, 1px) skewX(-2deg);
    opacity: 0.9;
  }
  50% {
    transform: translate(2px, -1px) skewX(2deg);
    opacity: 0.8;
  }
  75% {
    transform: translate(-1px, -1px) skewX(-1deg);
    opacity: 0.95;
  }
}

/* Game elements destruction */
.game-glitch {
  position: relative;
}

.game-glitch::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 102, 200, 0.1) 45%,
    rgba(107, 255, 255, 0.1) 55%,
    transparent 100%
  );
  animation: game-glitch-sweep 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes game-glitch-sweep {
  0%,
  100% {
    transform: translateX(-100%);
    opacity: 0;
  }
  50% {
    transform: translateX(100%);
    opacity: 1;
  }
}

/* Broken button effect */
.button-broken {
  animation: button-broken 0.3s ease-in-out infinite;
}

@keyframes button-broken {
  0%,
  100% {
    transform: translate(0) rotate(0deg);
    filter: none;
  }
  25% {
    transform: translate(-3px, 2px) rotate(-1deg);
    filter: hue-rotate(20deg);
  }
  50% {
    transform: translate(3px, -1px) rotate(1deg);
    filter: hue-rotate(-20deg);
  }
  75% {
    transform: translate(-2px, -2px) rotate(-0.5deg);
    filter: brightness(1.2);
  }
}

/* Flickering effect */
.flicker {
  animation: flicker 0.15s infinite;
}

@keyframes flicker {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Noise overlay */
.noise-overlay {
  position: relative;
}

.noise-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.05;
  pointer-events: none;
  mix-blend-mode: overlay;
}

/* Distortion effect */
.distort {
  animation: distort 0.5s ease-in-out infinite;
}

@keyframes distort {
  0%,
  100% {
    transform: scaleX(1) scaleY(1);
  }
  25% {
    transform: scaleX(1.02) scaleY(0.98);
  }
  50% {
    transform: scaleX(0.98) scaleY(1.02);
  }
  75% {
    transform: scaleX(1.01) scaleY(0.99);
  }
}

/* Color bleed */
.color-bleed {
  text-shadow:
    -2px 0 #ff66c8,
    2px 0 #6bffff,
    0 2px #fff746;
  animation: color-bleed-anim 0.1s steps(3) infinite;
}

@keyframes color-bleed-anim {
  0% {
    text-shadow:
      -2px 0 #ff66c8,
      2px 0 #6bffff,
      0 2px #fff746;
  }
  33% {
    text-shadow:
      -3px 1px #ff66c8,
      3px -1px #6bffff,
      1px 2px #fff746;
  }
  66% {
    text-shadow:
      -1px -1px #ff66c8,
      1px 1px #6bffff,
      -1px 3px #fff746;
  }
  100% {
    text-shadow:
      -2px 0 #ff66c8,
      2px 0 #6bffff,
      0 2px #fff746;
  }
}

/* Game destruction - elements that float away */
.element-drift {
  animation: element-drift 4s ease-in-out infinite;
}

@keyframes element-drift {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
  }
  25% {
    transform: translate(-10px, 5px) rotate(-3deg);
    opacity: 0.9;
  }
  50% {
    transform: translate(15px, -8px) rotate(2deg);
    opacity: 0.8;
  }
  75% {
    transform: translate(-8px, -12px) rotate(4deg);
    opacity: 0.9;
  }
}

/* Destruction container - applies chaos to children */
.destruction-zone {
  position: relative;
}

.destruction-zone > * {
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

/* Error popup animation */
.error-popup {
  animation:
    error-popup 0.5s ease-out forwards,
    error-shake 0.3s ease-in-out infinite 0.5s;
}

@keyframes error-popup {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes error-shake {
  0%,
  100% {
    transform: translate(0);
  }
  25% {
    transform: translate(-2px, 1px);
  }
  75% {
    transform: translate(2px, -1px);
  }
}

/* Glitch block overlay */
.glitch-block {
  animation: glitch-block 0.2s steps(5) infinite;
}

@keyframes glitch-block {
  0%,
  100% {
    clip-path: inset(0 0 0 0);
    transform: translateX(0);
  }
  20% {
    clip-path: inset(10% 0 80% 0);
    transform: translateX(-3px);
  }
  40% {
    clip-path: inset(50% 0 30% 0);
    transform: translateX(3px);
  }
  60% {
    clip-path: inset(70% 0 10% 0);
    transform: translateX(-2px);
  }
  80% {
    clip-path: inset(20% 0 60% 0);
    transform: translateX(2px);
  }
}

/* VHS tracking effect */
.vhs-tracking {
  position: relative;
}

.vhs-tracking::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    rgba(0, 0, 0, 0.5),
    rgba(255, 255, 255, 0.2),
    transparent
  );
  animation: vhs-tracking-move 3s linear infinite;
  pointer-events: none;
  z-index: 100;
}

@keyframes vhs-tracking-move {
  0% {
    top: -10%;
  }
  100% {
    top: 110%;
  }
}

/* Screen tear */
.screen-tear {
  animation: screen-tear 0.1s steps(3) infinite;
}

@keyframes screen-tear {
  0% {
    transform: translateX(0);
  }
  33% {
    transform: translateX(-5px);
  }
  66% {
    transform: translateX(5px);
  }
  100% {
    transform: translateX(0);
  }
}
</style>
