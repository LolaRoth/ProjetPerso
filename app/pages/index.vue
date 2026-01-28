<script setup lang="ts">
/**
 * Experience visuelle interactive - Trouve le bouton caché
 * Dégradation progressive jusqu'au chaos total
 */
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import type { GameId } from "../../types/supabase";

const nuxtApp = useNuxtApp();
const router = useRouter();
const gsap = nuxtApp.$gsap as any;
const ScrollTrigger = nuxtApp.$ScrollTrigger as any;
const Draggable = nuxtApp.$Draggable as any;

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
  // Use the smooth interpolated cursor color for blobs
  const color = cursorSmooth.str || "#FF66C8";
  // Cartoon-style larger soft glow but subtle
  const size = 36 + Math.random() * 28 + degradation.level * 30;

  const id = mouseBlobId++;
  // keep single visible blob (replace previous)
  mouseBlobs.value = [{ id, x, y, color, size, opacity: 0.8 }];

  // smoother fade out
  setTimeout(
    () => {
      const b = mouseBlobs.value.find((m) => m.id === id);
      if (b) b.opacity = 0.45;
    },
    420 + Math.random() * 300,
  );
  setTimeout(
    () => {
      mouseBlobs.value = mouseBlobs.value.filter((m) => m.id !== id);
    },
    1100 + Math.random() * 500,
  );
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
  if (now - lastRevealTime < 15) return;
  lastRevealTime = now;

  const baseSize = 30 + degradation.level * 40;

  // Keep only a single reveal circle that follows the cursor
  const id = revealIdCounter++;
  revealCircles.value = [{ id, x, y, size: baseSize, opacity: 1 }];
};

// ===== DEGRADATION SYSTEM (SLOWER) =====
const degradation = reactive({
  level: 0,
  cycles: 0,
  scrollProgress: 0,
  timeSpent: 0,
  interactions: 0,
  clicks: 0,
  puzzlesSolved: 0,
  phase: "pristine" as
    | "pristine"
    | "stable"
    | "unstable"
    | "chaotic"
    | "broken",
});

const getPhase = (level: number) => {
  if (level < 0.15) return "pristine";
  if (level < 0.35) return "stable";
  if (level < 0.55) return "unstable";
  if (level < 0.8) return "chaotic";
  return "broken";
};

// Calcul plus lent de la dégradation
const calculateLevel = () => {
  const scrollFactor = degradation.scrollProgress * 0.35;
  const timeFactor = Math.min(degradation.timeSpent / 300, 0.15);
  const interactionFactor = Math.min(degradation.interactions / 200, 0.1);
  const clickFactor = Math.min(degradation.clicks / 50, 0.08);
  const cycleBonus = degradation.cycles * 0.08;
  const puzzleBonus = degradation.puzzlesSolved * 0.05;

  degradation.level = Math.min(
    cycleBonus +
      scrollFactor +
      timeFactor +
      interactionFactor +
      clickFactor +
      puzzleBonus,
    1,
  );
  degradation.phase = getPhase(degradation.level);

  // Révéler le bouton secret quand on est dans le chaos
  if (degradation.level > 0.7 && !secretButtonVisible.value) {
    secretButtonVisible.value = true;
    secretButtonPosition.value = {
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
    };
  }
};

const updateScroll = (progress: number) => {
  degradation.scrollProgress = progress;
  calculateLevel();
};

const addInteraction = (amount: number = 1) => {
  degradation.interactions += amount;
  calculateLevel();
};

// Scroll to a game section by id (smooth)
const scrollToSection = (id: string) => {
  if (!document) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  addInteraction(1);
};

const addClick = () => {
  degradation.clicks++;
  calculateLevel();
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
  target: 0,
  current: 0,
  active: false,
  timeLeft: 0,
});
let clickChallengeInterval: ReturnType<typeof setInterval> | null = null;

const startClickChallenge = () => {
  if (clickChallenge.value.active) return;

  clickChallenge.value = {
    target: 15 + Math.floor(degradation.level * 20),
    current: 0,
    active: true,
    timeLeft: 5,
  };

  clickChallengeInterval = setInterval(() => {
    clickChallenge.value.timeLeft--;
    if (clickChallenge.value.timeLeft <= 0) {
      if (clickChallengeInterval) clearInterval(clickChallengeInterval);
      const won = clickChallenge.value.current >= clickChallenge.value.target;
      // Enregistrer la session
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
    }
  }, 1000);
};

const handleChallengeClick = () => {
  if (!clickChallenge.value.active) return;
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
  targetWord: "",
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

const startTypingGame = () => {
  if (typingGame.value.active) return;

  typingGame.value = {
    active: true,
    targetWord:
      typingWords[Math.floor(Math.random() * typingWords.length)] || "chaos",
    userInput: "",
    wordsCompleted: 0,
    timeLeft: 30,
    score: 0,
  };

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

  if (won) {
    degradation.puzzlesSolved++;
    calculateLevel();
  }
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

const startTargetGame = (difficulty: "easy" | "normal" | "hard" = "normal") => {
  if (targetGame.value.active) return;

  targetGame.value = {
    active: true,
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

  // Spawn first target immediately
  spawnGameTarget();
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

    // Brief flash animation then redirect
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

// ===== STYLES =====
const backgroundStyle = computed(() => {
  const deg = degradation.level;
  return {
    background: `
      radial-gradient(
        ellipse at ${50 + Math.sin(deg * 6) * 20}% ${50 + Math.cos(deg * 5) * 20}%,
        hsla(${320 + deg * 40}, 60%, 40%, ${0.02 + deg * 0.08}) 0%,
        hsla(${180 + deg * 30}, 60%, 40%, ${0.01 + deg * 0.05}) 40%,
        rgba(18, 18, 18, 1) 100%
      )
    `,
  };
});

const indicatorStyle = computed(() => {
  const colors: Record<string, string> = {
    pristine: "#BBFF42",
    stable: "#FFF746",
    unstable: "#FF66C8",
    chaotic: "#6BFFFF",
    broken: "#FF3333",
  };
  return {
    width: `${degradation.level * 100}%`,
    backgroundColor: colors[degradation.phase] || "#FFF",
    boxShadow: `0 0 15px ${colors[degradation.phase]}`,
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

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("click", addClick);

  timeInterval = setInterval(() => {
    degradation.timeSpent++;
    calculateLevel();
  }, 1000);

  fallInterval = setInterval(triggerFall, 800);

  // Dynamic elements generation based on degradation
  dynamicElementsInterval = setInterval(generateDynamicElements, 500);

  // Animate floating shapes
  floatingAnimationInterval = setInterval(animateFloatingShapes, 50);

  if (ScrollTrigger) {
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.3,
      onUpdate: (self: any) => updateScroll(self.progress),
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
});
</script>

<template>
  <main
    ref="mainContainer"
    class="relative min-h-screen overflow-hidden bg-MyBlack text-white"
    :style="backgroundStyle"
  >
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

    <!-- MOUSE COLOR BLOBS (overlay) -->
    <div class="pointer-events-none fixed inset-0 z-60">
      <div
        v-for="blob in mouseBlobs"
        :key="`blob-${blob.id}`"
        class="absolute rounded-full"
        :style="{
          left: `${blob.x}px`,
          top: `${blob.y}px`,
          width: `${blob.size}px`,
          height: `${blob.size}px`,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle at 30% 30%, ${blob.color} 0%, transparent 60%)`,
          opacity: blob.opacity,
          filter: 'blur(12px)',
          mixBlendMode: 'screen',
        }"
      />
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
      v-if="degradation.level > 0.4"
      class="fixed bottom-4 left-4 z-50 pointer-events-none"
    >
      <div
        class="px-3 py-1 rounded font-mono text-xs backdrop-blur-sm"
        :class="{
          'bg-MyYellow/20 text-MyYellow': degradation.phase === 'stable',
          'bg-MyPink/20 text-MyPink': degradation.phase === 'unstable',
          'bg-MyBlue/20 text-MyBlue animate-pulse':
            degradation.phase === 'chaotic',
          'bg-red-500/20 text-red-500 animate-bounce':
            degradation.phase === 'broken',
        }"
      >
        <span v-if="degradation.phase === 'unstable'">⚠️ INSTABLE</span>
        <span v-else-if="degradation.phase === 'chaotic'">🌀 CHAOTIQUE</span>
        <span v-else-if="degradation.phase === 'broken'">💀 CRITIQUE</span>
      </div>
    </div>

    <!-- SECRET BUTTON -->
    <button
      v-if="secretButtonVisible && !gameWon"
      class="fixed z-[150] rounded-full transition-all duration-300 cursor-pointer secret-btn-glow"
      :class="{
        'h-3 w-3': degradation.level < 0.8,
        'h-5 w-5': degradation.level >= 0.8 && degradation.level < 0.95,
        'h-8 w-8 animate-pulse': degradation.level >= 0.95,
      }"
      :style="{
        left: `${secretButtonPosition.x}%`,
        top: `${secretButtonPosition.y}%`,
        opacity:
          degradation.level > 0.95
            ? 1
            : degradation.level > 0.85
              ? 0.7
              : degradation.level > 0.7
                ? 0.3
                : 0.1,
        background: `radial-gradient(circle, ${degradation.level > 0.9 ? '#BBFF42' : '#BBFF42aa'} 0%, transparent 70%)`,
        boxShadow:
          degradation.level > 0.9
            ? '0 0 20px #BBFF42, 0 0 40px #BBFF42aa, 0 0 60px #BBFF4266'
            : 'none',
        transform: 'translate(-50%, -50%)',
      }"
      @click="handleSecretClick"
    />

    <!-- HINT -->
    <div
      v-if="showHint && secretButtonVisible"
      class="fixed left-1/2 top-20 z-[160] -translate-x-1/2 rounded-xl bg-MyGreen/20 px-6 py-3 text-MyGreen font-bricolage backdrop-blur"
    >
      🔍 Le bouton est quelque part à {{ Math.round(secretButtonPosition.x) }}%
      horizontal, {{ Math.round(secretButtonPosition.y) }}% vertical
    </div>

    <!-- DEGRADATION INDICATOR -->
    <div class="fixed left-0 top-0 z-50 h-1.5 w-full bg-zinc-900/80">
      <div class="h-full transition-all duration-500" :style="indicatorStyle" />
    </div>

    <!-- INFO PANEL removed per user request -->

    <!-- HINT BUTTON -->
    <button
      v-if="degradation.level > 0.5 && !gameWon"
      class="fixed left-4 top-4 z-50 rounded-lg bg-zinc-900/80 px-3 py-2 font-bricolage text-xs text-zinc-400 hover:text-MyYellow transition-colors border border-zinc-800"
      @click="showHintFn"
    >
      💡 Indice
    </button>

    <!-- SECTION 1: HERO -->
    <section
      class="relative flex min-h-screen flex-col items-center justify-center px-6 overflow-hidden"
    >
      <!-- Animated background orbs for hero -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          class="absolute top-1/4 left-1/4 w-96 h-96 bg-MyPink/10 rounded-full blur-3xl animate-float-slow"
        />
        <div
          class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-MyBlue/10 rounded-full blur-3xl animate-float-slow-reverse"
        />
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-MyYellow/5 rounded-full blur-3xl animate-pulse-slow"
        />
      </div>

      <div class="relative z-10 text-center" :style="getElementTransform(1)">
        <p
          class="font-bricolage text-sm text-MyPink mb-4 tracking-widest uppercase animate-fade-in"
        >
          🎯 OBJECTIF
        </p>
        <h1
          ref="heroTitle"
          class="font-candy text-6xl text-white md:text-8xl lg:text-[10rem] hero-title-glow"
        >
          <span class="inline-block animate-title-reveal p-4">Trouve</span>
          <span
            class="inline-block animate-title-reveal"
            style="animation-delay: 0.1s"
          >
            le</span
          >
          <span
            class="inline-block animate-title-reveal text-transparent bg-clip-text bg-gradient-to-r from-MyPink via-MyBlue to-MyGreen p-4"
            style="animation-delay: 0.2s"
          >
            secret.</span
          >
        </h1>
        <p
          class="mt-8 max-w-lg mx-auto text-center font-bricolage text-xl text-zinc-400 animate-fade-in-up"
          style="animation-delay: 0.5s"
        >
          Un bouton est caché quelque part. Plus le chaos augmente, plus il
          devient visible.
        </p>
        <p
          class="mt-4 font-bricolage text-sm text-zinc-600 animate-fade-in-up"
          style="animation-delay: 0.7s"
        >
          Interagis • Joue aux mini-jeux • Dégrade le système
        </p>

        <!-- Progress hint -->
        <div
          class="mt-12 flex items-center justify-center gap-4 animate-fade-in-up"
          style="animation-delay: 0.9s"
        >
          <div
            class="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700"
          >
            <span
              class="w-2 h-2 rounded-full"
              :class="
                degradation.level >= 0.7
                  ? 'bg-MyGreen animate-pulse'
                  : 'bg-zinc-600'
              "
            />
            <span
              class="font-bricolage text-xs"
              :class="
                degradation.level >= 0.7 ? 'text-MyGreen' : 'text-zinc-500'
              "
            >
              {{
                degradation.level >= 0.7
                  ? "Bouton débloqué !"
                  : `${Math.round(degradation.level * 100)}% / 70%`
              }}
            </span>
          </div>
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
          class="horizontal-panel min-w-[100vw] h-screen flex items-center justify-center relative overflow-hidden"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-MyYellow/10 via-transparent to-MyGreen/10"
          />
          <div
            class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-MyYellow via-MyGreen to-MyBlue"
          />
          <div class="text-center z-10 px-8">
            <span
              class="inline-block px-4 py-2 rounded-full bg-MyYellow/20 border border-MyYellow/50 text-MyYellow text-sm font-bricolage mb-6"
              >02 / 04</span
            >
            <h2 class="font-candy text-5xl md:text-7xl text-white mb-12">
              Mini-Jeux<br /><span class="text-MyYellow">Addictifs</span>
            </h2>
            <div
              class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
            >
              <div
                role="button"
                tabindex="0"
                @click.prevent="scrollToSection('game-sequence')"
                @keydown.enter="scrollToSection('game-sequence')"
                class="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-MyPink/50 transition-all hover:scale-105 cursor-pointer"
              >
                <span class="text-4xl">🧠</span>
                <p class="mt-3 font-bricolage text-white text-sm">Séquence</p>
              </div>
              <div
                role="button"
                tabindex="0"
                @click.prevent="scrollToSection('game-target')"
                @keydown.enter="scrollToSection('game-target')"
                class="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-MyBlue/50 transition-all hover:scale-105 cursor-pointer"
              >
                <span class="text-4xl">🎯</span>
                <p class="mt-3 font-bricolage text-white text-sm">Cibles</p>
              </div>
              <div
                role="button"
                tabindex="0"
                @click.prevent="scrollToSection('game-puzzle')"
                @keydown.enter="scrollToSection('game-puzzle')"
                class="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-MyYellow/50 transition-all hover:scale-105 cursor-pointer"
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

        <!-- Panel 5: HIDDEN GAME - Catch the Stars -->
        <div
          class="horizontal-panel min-w-[100vw] h-screen flex items-center justify-center relative overflow-hidden"
        >
          <!-- Animated starfield background -->
          <div
            class="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-MyBlack to-MyBlack"
          />
          <div class="absolute inset-0 starfield-bg" />
          <div
            class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-MyPink to-MyYellow"
          />

          <div class="text-center z-10 px-8 w-full max-w-4xl mx-auto">
            <span
              class="inline-block px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/50 text-purple-400 text-sm font-bricolage mb-4"
            >
              ⭐ JEU SECRET ⭐
            </span>

            <h2 class="font-candy text-4xl md:text-6xl text-white mb-4">
              <span
                class="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-MyPink to-MyYellow"
              >
                Attrape les Étoiles
              </span>
            </h2>

            <!-- Game not started -->
            <div v-if="!catchGame.active && catchGame.timeLeft === 20">
              <p class="font-bricolage text-zinc-400 mb-4">
                Tu as découvert un jeu caché ! Attrape un maximum d'étoiles en
                20 secondes.
              </p>
              <p
                v-if="catchGame.bestScore > 0"
                class="font-bricolage text-MyGreen mb-6"
              >
                🏆 Meilleur score: {{ catchGame.bestScore }} pts
              </p>
              <button
                @click="startCatchGame"
                class="px-10 py-4 rounded-full bg-gradient-to-r from-purple-500 to-MyPink font-bricolage text-xl font-bold text-white hover:scale-110 transition-transform shadow-lg shadow-purple-500/30"
              >
                ⭐ Jouer
              </button>
            </div>

            <!-- Game active -->
            <div v-else-if="catchGame.active" class="relative">
              <!-- Stats bar -->
              <div class="flex justify-center gap-8 mb-4 font-bricolage">
                <span class="text-white text-xl"
                  >{{ catchGame.score }} pts</span
                >
                <span class="font-candy text-3xl text-MyYellow"
                  >{{ catchGame.timeLeft }}s</span
                >
                <span
                  v-if="catchGame.combo >= 3"
                  class="text-MyPink animate-pulse"
                  >🔥 x{{ catchGame.combo }}</span
                >
              </div>

              <!-- Game area -->
              <div
                class="relative h-[350px] w-full max-w-2xl mx-auto rounded-2xl bg-zinc-900/80 border border-purple-500/30 overflow-hidden"
              >
                <!-- Falling stars -->
                <button
                  v-for="star in fallingStars.filter((s) => !s.caught)"
                  :key="star.id"
                  :data-star-id="star.id"
                  class="absolute transition-transform hover:scale-125 cursor-pointer"
                  :style="{
                    left: `${star.x}%`,
                    top: `${star.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }"
                  @click="catchStar(star.id)"
                >
                  <span
                    class="block animate-spin-slow"
                    :style="{
                      fontSize: `${star.size}px`,
                      filter: `drop-shadow(0 0 10px ${star.color})`,
                    }"
                    >⭐</span
                  >
                </button>

                <p
                  v-if="fallingStars.length === 0"
                  class="absolute inset-0 flex items-center justify-center font-bricolage text-zinc-600"
                >
                  Les étoiles arrivent...
                </p>
              </div>
            </div>

            <!-- Game ended -->
            <div v-else class="text-center">
              <p class="font-candy text-5xl text-MyYellow mb-4">
                {{ catchGame.score }} pts
              </p>
              <p class="font-bricolage text-zinc-400 mb-2">
                Étoiles ratées: {{ catchGame.missed }} | Max Combo: x{{
                  catchGame.maxCombo
                }}
              </p>
              <p
                v-if="
                  catchGame.score >= catchGame.bestScore && catchGame.score > 0
                "
                class="text-MyGreen font-bricolage mb-4"
              >
                🎉 Nouveau record !
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
      <!-- Background decoration -->
      <div class="absolute inset-0 pointer-events-none">
        <div
          class="absolute top-20 left-10 w-64 h-64 bg-MyPink/5 rounded-full blur-3xl animate-float-slow"
        />
        <div
          class="absolute bottom-20 right-10 w-80 h-80 bg-MyBlue/5 rounded-full blur-3xl animate-float-slow-reverse"
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
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-MyPink/10 via-transparent to-transparent rounded-full"
        />
      </div>

      <div
        class="mx-auto max-w-2xl text-center relative z-10"
        :style="getElementTransform(3)"
      >
        <h2 class="font-candy text-4xl text-white md:text-6xl">
          🧠
          <span
            class="text-transparent bg-clip-text bg-gradient-to-r from-MyPink to-MyBlue"
            >Séquence de couleurs</span
          >
        </h2>
        <p class="mt-2 font-bricolage text-sm text-zinc-600">
          Niveau {{ sequenceLevel }}
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
          }"
        >
          {{ sequenceMessage }}
        </p>

        <!-- Progression de la séquence -->
        <div
          v-if="colorSequence.length > 0 && !showingSequence"
          class="mt-4 flex justify-center gap-2"
        >
          <div
            v-for="(_, i) in colorSequence"
            :key="`progress-${i}`"
            class="h-3 w-3 rounded-full transition-all"
            :class="
              i < playerSequence.length ? 'bg-MyGreen scale-125' : 'bg-zinc-700'
            "
          />
        </div>

        <div class="mt-8 grid grid-cols-2 gap-4 max-w-md mx-auto">
          <button
            v-for="(color, index) in sequenceGameColors"
            :key="`seq-${index}`"
            :id="`seq-btn-${index}`"
            class="aspect-square rounded-2xl transition-all hover:scale-105 active:scale-95 relative overflow-hidden"
            :style="{ backgroundColor: color }"
            :class="{
              'ring-4 ring-white ring-offset-4 ring-offset-MyBlack':
                activeSequenceIndex === index,
              'opacity-50 cursor-not-allowed': showingSequence,
            }"
            :disabled="showingSequence"
            @click="handleSequenceClick(color, index)"
          >
            <span
              v-if="activeSequenceIndex === index"
              class="absolute inset-0 bg-white/50 animate-ping"
            />
          </button>
        </div>

        <button
          class="mt-8 rounded-full px-8 py-3 font-bricolage text-white transition-all"
          :class="
            showingSequence
              ? 'bg-zinc-700 cursor-not-allowed'
              : 'bg-MyPink hover:bg-MyPink/80 hover:scale-105'
          "
          :disabled="showingSequence"
          @click="startSequenceGame"
        >
          {{ showingSequence ? "👀 Regarde..." : "🎮 JOUER" }}
        </button>
      </div>
    </section>

    <!-- SECTION 4: CLICK CHALLENGE -->
    <section
      id="game-click"
      class="reveal-section relative min-h-screen px-6 py-24"
    >
      <div
        class="mx-auto max-w-2xl text-center"
        :style="getElementTransform(4)"
      >
        <h2 class="font-candy text-4xl text-white md:text-6xl">
          ⚡ Défi de clics
        </h2>

        <div v-if="!clickChallenge.active" class="mt-10">
          <p class="font-bricolage text-zinc-500">
            Clique le plus vite possible en 5 secondes !
          </p>
          <button
            class="mt-6 rounded-full bg-MyPink px-10 py-4 font-bricolage text-xl font-bold text-MyBlack hover:scale-105 transition-transform"
            @click="startClickChallenge"
          >
            Lancer le défi
          </button>
        </div>

        <div v-else class="mt-10">
          <div class="mb-6 font-candy text-8xl text-MyYellow">
            {{ clickChallenge.timeLeft }}
          </div>
          <button
            class="h-48 w-48 rounded-full bg-gradient-to-br from-MyPink to-MyBlue font-candy text-4xl text-white hover:scale-105 active:scale-95 transition-transform mx-auto block"
            @click="handleChallengeClick"
          >
            {{ clickChallenge.current }}
          </button>
          <p class="mt-4 font-bricolage text-zinc-500">
            Objectif: {{ clickChallenge.target }} clics
          </p>
          <div
            class="mt-4 h-2 w-full max-w-xs mx-auto rounded-full bg-zinc-800"
          >
            <div
              class="h-full rounded-full bg-MyGreen transition-all"
              :style="{
                width: `${Math.min(100, (clickChallenge.current / clickChallenge.target) * 100)}%`,
              }"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 5: TARGET SHOOTING (AMÉLIORÉ) -->
    <section
      id="game-target"
      class="reveal-section relative min-h-screen px-6 py-24"
    >
      <div class="mx-auto max-w-4xl" :style="getElementTransform(5)">
        <h2 class="text-center font-candy text-4xl text-white md:text-6xl">
          🎯 Chasse aux cibles
        </h2>

        <!-- Game not active - Show start screen -->
        <div v-if="!targetGame.active" class="mt-8 text-center">
          <p
            v-if="targetGame.bestScore > 0"
            class="font-bricolage text-MyGreen mb-4"
          >
            🏆 Meilleur score: {{ targetGame.bestScore }} points
          </p>

          <p class="font-bricolage text-zinc-500 mb-6">
            Touche un maximum de cibles en 30 secondes !
          </p>

          <!-- Difficulty Selection -->
          <div class="flex flex-wrap justify-center gap-4 mb-8">
            <button
              @click="startTargetGame('easy')"
              class="px-6 py-3 rounded-xl font-bricolage font-bold bg-MyGreen text-MyBlack hover:scale-105 transition-transform"
            >
              🌱 Facile<br /><span class="text-xs opacity-70"
                >Lent • 3s par cible</span
              >
            </button>
            <button
              @click="startTargetGame('normal')"
              class="px-6 py-3 rounded-xl font-bricolage font-bold bg-MyYellow text-MyBlack hover:scale-105 transition-transform"
            >
              ⚡ Normal<br /><span class="text-xs opacity-70"
                >Modéré • 2s par cible</span
              >
            </button>
            <button
              @click="startTargetGame('hard')"
              class="px-6 py-3 rounded-xl font-bricolage font-bold bg-MyPink text-MyBlack hover:scale-105 transition-transform"
            >
              🔥 Difficile<br /><span class="text-xs opacity-70"
                >Rapide • 1.2s par cible</span
              >
            </button>
          </div>

          <!-- Last game results -->
          <div
            v-if="targetGame.score > 0 || targetGame.missed > 0"
            class="bg-zinc-900/50 rounded-xl p-4 max-w-md mx-auto border border-zinc-800"
          >
            <p class="font-bricolage text-zinc-400 text-sm">Dernière partie</p>
            <p class="font-candy text-3xl text-white mt-1">
              {{ targetGame.score }} pts
            </p>
            <div class="flex justify-center gap-4 mt-2 text-xs text-zinc-500">
              <span
                >Touchées:
                {{ targetGame.totalTargetsSpawned - targetGame.missed }}</span
              >
              <span>Ratées: {{ targetGame.missed }}</span>
              <span>Max Combo: {{ targetGame.maxCombo }}</span>
            </div>
          </div>
        </div>

        <!-- Game active - Show game area -->
        <div v-else>
          <!-- Stats bar -->
          <div class="mt-6 flex justify-center gap-6 font-bricolage text-sm">
            <span class="text-white font-bold text-lg"
              >{{ targetGame.score }} pts</span
            >
            <span class="text-MyYellow font-candy text-2xl"
              >{{ targetGame.timeLeft }}s</span
            >
            <span v-if="targetGame.combo >= 3" class="text-MyPink animate-pulse"
              >🔥 x{{ targetGame.combo }}</span
            >
          </div>

          <div class="mt-2 flex justify-center gap-4 text-xs text-zinc-500">
            <span
              >Touchées:
              {{ targetGame.totalTargetsSpawned - targetGame.missed }}</span
            >
            <span>Ratées: {{ targetGame.missed }}</span>
          </div>

          <!-- Game area -->
          <div
            class="relative mt-6 h-[400px] rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden cursor-crosshair"
          >
            <button
              v-for="target in targets.filter((t) => !t.hit)"
              :key="target.id"
              :data-target-id="target.id"
              class="absolute rounded-full bg-gradient-to-br from-MyPink to-MyBlue hover:from-MyYellow hover:to-MyGreen transition-all cursor-crosshair flex items-center justify-center shadow-lg shadow-MyPink/30"
              :style="{
                left: `${target.x}%`,
                top: `${target.y}%`,
                width: `${target.size}px`,
                height: `${target.size}px`,
                transform: 'translate(-50%, -50%)',
              }"
              @click="hitTarget(target.id)"
            >
              <span class="text-xl">🎯</span>
            </button>

            <p
              v-if="targets.filter((t) => !t.hit).length === 0"
              class="absolute inset-0 flex items-center justify-center font-bricolage text-zinc-600 animate-pulse"
            >
              Prépare-toi...
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 6: PUZZLE (Sliding 3x3 puzzle - AMÉLIORÉ avec stats) -->
    <section
      id="game-puzzle"
      class="reveal-section relative min-h-screen px-6 py-24"
    >
      <div class="mx-auto max-w-3xl" :style="getElementTransform(6)">
        <h2 class="text-center font-candy text-4xl text-white md:text-6xl">
          🧩 Puzzle Coulissant
        </h2>
        <p class="mt-4 text-center font-bricolage text-zinc-500">
          {{ slidingMessage }}
        </p>

        <!-- Best records display -->
        <div
          v-if="slidingGame.bestTime > 0"
          class="mt-2 flex justify-center gap-6 text-sm"
        >
          <span class="text-MyGreen font-bricolage"
            >🏆 Meilleur temps: {{ slidingGame.bestTime }}s</span
          >
          <span class="text-MyBlue font-bricolage"
            >⭐ Min coups: {{ slidingGame.bestMoves }}</span
          >
        </div>

        <!-- Current game stats -->
        <div
          v-if="slidingGame.active"
          class="mt-4 flex justify-center gap-6 font-bricolage"
        >
          <span class="text-MyYellow font-candy text-2xl"
            >⏱️ {{ slidingGame.timer }}s</span
          >
          <span class="text-white text-lg"
            >👆 {{ slidingGame.moves }} coups</span
          >
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

          <div class="grid grid-cols-3 gap-2" style="user-select: none">
            <button
              v-for="(tile, idx) in slidingTiles"
              :key="`tile-${idx}`"
              @click="handleTileClick(idx)"
              class="aspect-square rounded-lg flex items-center justify-center transition-all hover:scale-105 p-0"
              :style="
                tile === 0
                  ? {
                      opacity: 0.15,
                      background: 'transparent',
                      cursor: 'default',
                    }
                  : Object.assign({ cursor: 'pointer' }, tileBgStyle(tile))
              "
            >
              <span v-if="tile === 0" class="text-zinc-400">&nbsp;</span>
            </button>
          </div>

          <div class="flex justify-center gap-4 mt-6">
            <button
              class="px-4 py-2 rounded-full bg-MyBlue text-MyBlack font-bricolage font-bold hover:scale-105 transition-transform"
              @click="shuffleSliding()"
            >
              🔀 {{ slidingGame.active ? "Recommencer" : "Jouer" }}
            </button>
            <button
              v-if="slidingGame.active"
              class="px-4 py-2 rounded-full bg-zinc-700 text-white font-bricolage hover:bg-zinc-600 transition-colors"
              @click="initSliding()"
            >
              ⏹️ Abandonner
            </button>
          </div>

          <p class="mt-3 text-center text-sm text-zinc-400">
            Clic sur une tuile adjacente pour la déplacer. Remets les tuiles
            dans l'ordre pour gagner !
          </p>

          <!-- Puzzles solved counter -->
          <p
            v-if="slidingGame.puzzlesSolved > 0"
            class="mt-2 text-center text-xs text-MyGreen"
          >
            ✅ {{ slidingGame.puzzlesSolved }} puzzle(s) résolu(s) cette session
          </p>
        </div>
      </div>
    </section>

    <!-- SECTION 7: MEMORY GAME AVANCÉ -->
    <section class="reveal-section relative min-h-screen px-6 py-24">
      <div
        class="mx-auto max-w-3xl text-center"
        :style="getElementTransform(7)"
      >
        <h2 class="font-candy text-4xl text-white md:text-6xl">
          🃏 Memory Pro
        </h2>
        <p class="mt-4 font-bricolage text-zinc-500">
          {{ memoryMessage }}
        </p>

        <!-- Stats du jeu -->
        <div
          v-if="memoryGameActive"
          class="mt-4 flex justify-center gap-6 font-bricolage text-sm"
        >
          <span class="text-zinc-400">⏱️ {{ memoryTimer }}s</span>
          <span class="text-zinc-400">👆 {{ memoryMoves }} coups</span>
          <span class="text-MyYellow" v-if="memoryCombo > 1"
            >🔥 Combo x{{ memoryCombo }}</span
          >
        </div>

        <!-- Meilleur temps par niveau -->
        <div
          v-if="!memoryGameActive && (memoryBestTime[memoryLevel] ?? 999) < 999"
          class="mt-2 font-bricolage text-sm text-MyGreen"
        >
          🏆 Meilleur temps niveau {{ memoryLevel }}:
          {{ memoryBestTime[memoryLevel] }}s
        </div>

        <!-- Sélection de niveau -->
        <div v-if="!memoryGameActive" class="mt-8">
          <p class="font-bricolage text-sm text-zinc-500 mb-4">
            Choisis un niveau :
          </p>
          <div class="flex justify-center gap-4">
            <button
              v-for="level in [1, 2, 3]"
              :key="`level-${level}`"
              class="px-6 py-3 rounded-xl font-bricolage font-bold transition-all hover:scale-105"
              :class="{
                'bg-MyBlue text-MyBlack': level === 1,
                'bg-MyPink text-MyBlack': level === 2,
                'bg-MyYellow text-MyBlack': level === 3,
                'ring-2 ring-white ring-offset-2 ring-offset-MyBlack':
                  memoryLevel === level,
              }"
              @click="selectMemoryLevel(level)"
            >
              <span v-if="level === 1"
                >🌱 Facile<br /><span class="text-xs opacity-70"
                  >6 paires</span
                ></span
              >
              <span v-else-if="level === 2"
                >🌿 Normal<br /><span class="text-xs opacity-70"
                  >8 paires</span
                ></span
              >
              <span v-else
                >🌳 Difficile<br /><span class="text-xs opacity-70"
                  >10 paires</span
                ></span
              >
            </button>
          </div>
        </div>

        <!-- Grille de cartes -->
        <div
          v-if="memoryCards.length > 0"
          class="mt-8 grid gap-2 max-w-xl mx-auto"
          :style="{ gridTemplateColumns: `repeat(${getMemoryGridCols}, 1fr)` }"
        >
          <button
            v-for="card in memoryCards"
            :key="`card-${card.id}`"
            class="aspect-square rounded-lg transition-all duration-300 flex items-center justify-center text-2xl md:text-3xl"
            :class="{
              'bg-zinc-800 hover:bg-zinc-700': !card.flipped && !card.matched,
              'bg-MyPink scale-105': card.flipped && !card.matched,
              'bg-MyGreen': card.matched,
              'cursor-not-allowed opacity-70': card.matched,
            }"
            :disabled="card.matched"
            @click="flipCard(card)"
          >
            <span v-if="card.flipped || card.matched">{{ card.emoji }}</span>
            <span v-else class="opacity-30 text-lg">?</span>
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

        <div v-if="!typingGame.active" class="mt-10">
          <p class="font-bricolage text-zinc-500">
            Tape les mots le plus vite possible en 30 secondes !
          </p>
          <p
            v-if="typingGame.score > 0"
            class="mt-2 font-bricolage text-sm text-MyGreen"
          >
            Dernier score: {{ typingGame.score }} points ({{
              typingGame.wordsCompleted
            }}
            mots)
          </p>
          <button
            class="mt-6 rounded-full bg-MyYellow px-10 py-4 font-bricolage text-xl font-bold text-MyBlack hover:scale-105 transition-transform"
            @click="startTypingGame"
          >
            Commencer
          </button>
        </div>

        <div v-else class="mt-10">
          <div class="flex justify-between items-center mb-6 max-w-md mx-auto">
            <span class="font-candy text-3xl text-MyYellow"
              >{{ typingGame.timeLeft }}s</span
            >
            <span class="font-bricolage text-zinc-400"
              >Score: {{ typingGame.score }}</span
            >
          </div>

          <p class="font-candy text-6xl text-white mb-8">
            {{ typingGame.targetWord }}
          </p>

          <input
            type="text"
            :value="typingGame.userInput"
            @input="handleTypingInput"
            class="w-full max-w-md mx-auto block bg-zinc-800 border-2 border-zinc-700 rounded-xl px-6 py-4 text-center font-bricolage text-2xl text-white focus:outline-none focus:border-MyPink"
            placeholder="Tape le mot ici..."
            autofocus
          />

          <p class="mt-4 font-bricolage text-sm text-zinc-600">
            Mots complétés: {{ typingGame.wordsCompleted }}
          </p>
        </div>
      </div>
    </section>

    <!-- SECTION 10: TEXT DEGRADATION -->
    <section class="reveal-section relative min-h-screen px-6 py-24">
      <div class="mx-auto max-w-4xl text-center">
        <div class="flex flex-wrap justify-center gap-1 md:gap-2">
          <span
            v-for="(letter, i) in 'ENTROPIE MAXIMALE'"
            :key="`letter-${i}`"
            class="font-candy text-4xl md:text-6xl lg:text-7xl transition-all duration-300"
            :style="{
              color:
                degradation.level > 0.5
                  ? cursorColors[i % cursorColors.length]
                  : 'white',
              transform: `
                translateY(${degradation.phase === 'broken' ? Math.sin(i) * 50 + degradation.level * 100 : Math.sin(degradation.level * 5 + i * 0.3) * degradation.level * 20}px)
                rotate(${degradation.level * (i % 2 === 0 ? 10 : -10)}deg)
              `,
              opacity:
                letter === ' ' ? 0 : Math.max(0.5, 1 - degradation.level * 0.3),
            }"
          >
            {{ letter === " " ? "&nbsp;" : letter }}
          </span>
        </div>

        <p
          class="mt-16 font-bricolage text-xl text-zinc-500"
          :style="getElementTransform(10)"
        >
          Quand tout s'effondre, le secret se révèle.
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
</style>
