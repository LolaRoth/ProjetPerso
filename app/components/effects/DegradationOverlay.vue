<template>
  <!-- Overlay de dégradation globale - version très légère -->
  <div class="degradation-overlay pointer-events-none fixed inset-0 z-[9999]">
    <!-- Effet de filtre global sur tout le viewport - seulement hue-rotate léger -->
    <div
      v-if="level > 0.2"
      class="absolute inset-0 filter-layer"
      :style="{
        filter: globalFilter,
      }"
    />

    <!-- Effet de scanlines - visible dès 30% -->
    <div
      v-if="level > 0.3"
      class="absolute inset-0 scanlines"
      :style="{ opacity: Math.min((level - 0.3) * 0.15, 0.08) }"
    />

    <!-- Vignette très légère -->
    <div
      class="absolute inset-0 vignette"
      :style="{ opacity: 0.15 + level * 0.15 }"
    />

    <!-- Flash de dommage lors des boucles de scroll - très subtil -->
    <Transition name="damage-flash">
      <div
        v-if="showDamageFlash"
        class="absolute inset-0 bg-MyPink/15 damage-flash"
      />
    </Transition>

    <!-- Message de transition de phase -->
    <!-- phase transition message (loop indicator removed) -->

    <!-- HUD de dégradation - visible dès qu'il y a de la dégradation -->
    <div
      v-if="level > 0.05 && !isTransitioning"
      class="absolute bottom-4 right-4 degradation-hud"
    >
      <div
        class="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-3 font-mono text-xs"
      >
        <!-- Barre de progression -->
        <div class="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="progressBarClass"
            :style="{ width: `${level * 100}%` }"
          />
        </div>

        <div class="flex items-center justify-between text-white/60">
          <span class="uppercase tracking-wider text-[10px]">Dégâts</span>
          <span class="text-MyPink font-bold"
            >{{ Math.round(level * 100) }}%</span
          >
        </div>

        <!-- Stats additionnelles en phase avancée -->
        <div
          v-if="level > 0.2"
          class="mt-2 pt-2 border-t border-white/10 space-y-1"
        >
          <!-- Boucles stat removed -->
          <div class="flex justify-between text-[10px]">
            <span class="text-zinc-500">Temps</span>
            <span class="text-white/80">{{ formatTime(timeSpent) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  level,
  phase,
  factors,
  isTransitioning,
  transitionMessage,
  timeSpent,
  lastDamageTime,
} = useDegradation();

// Flash de dommage
const showDamageFlash = ref(false);
let damageFlashTimeout: ReturnType<typeof setTimeout> | null = null;

watch(lastDamageTime, () => {
  if (lastDamageTime.value > 0) {
    showDamageFlash.value = true;
    if (damageFlashTimeout) clearTimeout(damageFlashTimeout);
    damageFlashTimeout = setTimeout(() => {
      showDamageFlash.value = false;
    }, 200);
  }
});

// Bandes de glitch aléatoires
const glitchBands = computed(() => {
  if (level.value < 0.2) return [];
  const count = Math.floor(level.value * 8);
  return Array.from({ length: count }, (_, i) => ({
    y: Math.random() * 100,
    height: 1 + Math.random() * 4,
    offset: (Math.random() - 0.5) * 20 * level.value,
    opacity: 0.1 + Math.random() * 0.3 * level.value,
  }));
});

// Filtre global - très léger pour garder le site lisible
const globalFilter = computed(() => {
  const l = level.value;
  const parts = [];

  // Seulement un léger hue-rotate à partir de 25%
  if (l > 0.25)
    parts.push(`hue-rotate(${Math.min(factors.value.hueShift * 0.3, 15)}deg)`);
  // Légère saturation à partir de 50%
  if (l > 0.5) parts.push(`saturate(${Math.min(1 + (l - 0.5) * 0.3, 1.15)})`);

  return parts.length ? parts.join(" ") : "none";
});

// Classes et labels
const phaseEmoji = computed(() => {
  switch (phase.value) {
    case "glitching":
      return "⚡";
    case "unstable":
      return "🌀";
    case "chaotic":
      return "🔥";
    case "broken":
      return "💀";
    default:
      return "✨";
  }
});

const phaseIconClass = computed(() => {
  switch (phase.value) {
    case "glitching":
      return "bg-yellow-500/20 border-2 border-yellow-500/50";
    case "unstable":
      return "bg-orange-500/20 border-2 border-orange-500/50";
    case "chaotic":
      return "bg-red-500/20 border-2 border-red-500/50";
    case "broken":
      return "bg-purple-500/20 border-2 border-purple-500/50 animate-pulse";
    default:
      return "bg-green-500/20 border-2 border-green-500/50";
  }
});

const phaseLabel = computed(() => {
  switch (phase.value) {
    case "glitching":
      return "Glitching";
    case "unstable":
      return "Instable";
    case "chaotic":
      return "Chaotique";
    case "broken":
      return "Détruit";
    default:
      return "Normal";
  }
});

const phaseBadgeClass = computed(() => {
  switch (phase.value) {
    case "glitching":
      return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
    case "unstable":
      return "bg-orange-500/20 border-orange-500/50 text-orange-400";
    case "chaotic":
      return "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse";
    case "broken":
      return "bg-purple-500/20 border-purple-500/50 text-purple-400 animate-pulse";
    default:
      return "bg-green-500/20 border-green-500/50 text-green-400";
  }
});

const progressBarClass = computed(() => {
  if (level.value < 0.3) return "bg-gradient-to-r from-green-500 to-yellow-500";
  if (level.value < 0.5)
    return "bg-gradient-to-r from-yellow-500 to-orange-500";
  if (level.value < 0.75) return "bg-gradient-to-r from-orange-500 to-red-500";
  return "bg-gradient-to-r from-red-500 to-purple-500 animate-pulse";
});

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};
</script>

<style scoped>
/* Scanlines CRT */
.scanlines {
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  animation: scanline-move 0.08s linear infinite;
}

@keyframes scanline-move {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 0 3px;
  }
}

/* Aberration chromatique */
.chromatic-aberration {
  background:
    linear-gradient(90deg, rgba(255, 0, 0, 0.1) 0%, transparent 20%),
    linear-gradient(90deg, transparent 80%, rgba(0, 255, 255, 0.1) 100%);
  animation: chromatic-shift 0.1s steps(3) infinite;
}

@keyframes chromatic-shift {
  0%,
  100% {
    transform: translateX(0);
  }
  33% {
    transform: translateX(var(--chromatic-offset, 2px));
  }
  66% {
    transform: translateX(calc(var(--chromatic-offset, 2px) * -1));
  }
}

/* RGB Split */
.rgb-split {
  background:
    linear-gradient(90deg, rgba(255, 0, 0, 0.15) 0%, transparent 25%),
    linear-gradient(90deg, transparent 75%, rgba(0, 0, 255, 0.15) 100%);
  animation: rgb-shift 0.06s steps(2) infinite;
}

@keyframes rgb-shift {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(var(--split-amount, 3px));
  }
}

/* Bandes de glitch */
.glitch-band {
  animation: glitch-band-move 0.15s steps(2) infinite;
}

@keyframes glitch-band-move {
  0%,
  100% {
    opacity: 0.1;
  }
  50% {
    opacity: 0.3;
  }
}

/* Vignette */
.vignette {
  background: radial-gradient(
    ellipse at center,
    transparent 0%,
    transparent 30%,
    rgba(0, 0, 0, 0.6) 80%,
    rgba(0, 0, 0, 0.9) 100%
  );
}

/* Noise */
.noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  animation: noise-move 0.15s steps(8) infinite;
}

@keyframes noise-move {
  0%,
  100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(-3%, -3%);
  }
  50% {
    transform: translate(3%, 3%);
  }
  75% {
    transform: translate(-2%, 2%);
  }
}

/* CRT Flicker */
.crt-flicker {
  background: linear-gradient(transparent 50%, rgba(255, 255, 255, 0.03) 50%);
  background-size: 100% 4px;
  animation: crt-flicker 0.05s linear infinite;
}

@keyframes crt-flicker {
  0%,
  100% {
    opacity: 0.08;
  }
  50% {
    opacity: 0.12;
  }
}

/* Distorsion verticale */
.vertical-distortion {
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    transparent 3px,
    rgba(255, 255, 255, 0.02) 3px,
    rgba(255, 255, 255, 0.02) 4px
  );
  animation: vertical-shift 0.2s steps(5) infinite;
}

@keyframes vertical-shift {
  0%,
  100% {
    transform: scaleX(1);
  }
  50% {
    transform: scaleX(1.002);
  }
}

/* Damage flash */
.damage-flash {
  animation: damage-pulse 0.2s ease-out;
}

@keyframes damage-pulse {
  0% {
    opacity: 0.5;
  }
  100% {
    opacity: 0;
  }
}

.damage-flash-enter-active {
  animation: damage-in 0.1s ease-out;
}

.damage-flash-leave-active {
  animation: damage-out 0.15s ease-out;
}

@keyframes damage-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 0.4;
  }
}

@keyframes damage-out {
  0% {
    opacity: 0.4;
  }
  100% {
    opacity: 0;
  }
}

/* Glitch text effect */
.glitch-text {
  position: relative;
  text-shadow:
    2px 0 #ff66c8,
    -2px 0 #6bffff;
  animation: glitch-text-anim 0.3s infinite;
}

.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.glitch-text::before {
  color: #ff66c8;
  animation: glitch-1 0.25s infinite;
  clip-path: polygon(0 0, 100% 0, 100% 35%, 0 35%);
}

.glitch-text::after {
  color: #6bffff;
  animation: glitch-2 0.25s infinite;
  clip-path: polygon(0 65%, 100% 65%, 100% 100%, 0 100%);
}

@keyframes glitch-text-anim {
  0%,
  100% {
    text-shadow:
      2px 0 #ff66c8,
      -2px 0 #6bffff;
  }
  25% {
    text-shadow:
      -2px 0 #ff66c8,
      2px 0 #6bffff;
  }
  50% {
    text-shadow:
      2px 2px #ff66c8,
      -2px -2px #6bffff;
  }
  75% {
    text-shadow:
      -2px 2px #ff66c8,
      2px -2px #6bffff;
  }
}

@keyframes glitch-1 {
  0%,
  100% {
    transform: translate(0);
  }
  20% {
    transform: translate(-4px, 2px);
  }
  40% {
    transform: translate(4px, -2px);
  }
  60% {
    transform: translate(-3px, -2px);
  }
  80% {
    transform: translate(3px, 2px);
  }
}

@keyframes glitch-2 {
  0%,
  100% {
    transform: translate(0);
  }
  20% {
    transform: translate(4px, -2px);
  }
  40% {
    transform: translate(-4px, 2px);
  }
  60% {
    transform: translate(3px, 2px);
  }
  80% {
    transform: translate(-3px, -2px);
  }
}

/* Glitch container */
.glitch-container {
  animation: container-glitch 3s infinite;
}

@keyframes container-glitch {
  0%,
  95%,
  100% {
    transform: translate(0);
  }
  96% {
    transform: translate(-3px, 1px);
  }
  97% {
    transform: translate(2px, -1px);
  }
  98% {
    transform: translate(-1px, -2px);
  }
  99% {
    transform: translate(1px, 1px);
  }
}

/* Phase transition animations */
.phase-message-enter-active {
  animation: phase-in 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.phase-message-leave-active {
  animation: phase-out 0.4s cubic-bezier(0.7, 0, 0.84, 0);
}

@keyframes phase-in {
  0% {
    opacity: 0;
    transform: scale(1.3);
    filter: blur(30px) brightness(2);
  }
  50% {
    filter: blur(10px) brightness(1.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
    filter: blur(0) brightness(1);
  }
}

@keyframes phase-out {
  0% {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.7);
    filter: blur(20px);
  }
}

/* Phase icon pulse */
.phase-icon {
  animation: icon-pulse 1.2s ease-in-out infinite;
}

@keyframes icon-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

/* HUD animations */
.degradation-hud {
  animation: hud-appear 0.3s ease-out;
}

@keyframes hud-appear {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.phase-indicator {
  animation: indicator-appear 0.3s ease-out;
}

@keyframes indicator-appear {
  0% {
    opacity: 0;
    transform: translateX(-10px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
