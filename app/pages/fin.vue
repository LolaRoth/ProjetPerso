<script setup lang="ts">
/**
 * Page de Fin - Expérience Terminée
 * Une fois ici, impossible de partir. Le chaos est complet.
 */
import { ref, onMounted, onUnmounted } from "vue";

const nuxtApp = useNuxtApp();
const gsap = nuxtApp.$gsap as any;

// Empêcher toute navigation
definePageMeta({
  layout: false,
});

// State
const showContent = ref(false);
const glitchActive = ref(false);
const particles = ref<
  {
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    delay: number;
  }[]
>([]);
const floatingTexts = ref<
  {
    id: number;
    text: string;
    x: number;
    y: number;
    size: number;
    opacity: number;
  }[]
>([]);

const colors = [
  "#FF66C8",
  "#6BFFFF",
  "#FFF746",
  "#BBFF42",
  "#FF8855",
  "#AA66FF",
];
const crypticTexts = [
  "TU AS TROUVÉ",
  "FÉLICITATIONS",
  "LE CHAOS EST COMPLET",
  "BIENVENUE DANS LE VIDE",
  "∞",
  "01001111 01001011",
  "SYSTEM.EXIT(0)",
  "FIN DE PARTIE",
  "MERCI D'AVOIR JOUÉ",
  "...",
];

// Generate floating particles
const generateParticles = () => {
  particles.value = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)] || "#FF66C8",
    size: 4 + Math.random() * 12,
    delay: Math.random() * 5,
  }));
};

// Generate floating cryptic texts
const generateFloatingTexts = () => {
  floatingTexts.value = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    text:
      crypticTexts[Math.floor(Math.random() * crypticTexts.length)] || "...",
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 12 + Math.random() * 24,
    opacity: 0.1 + Math.random() * 0.3,
  }));
};

// Glitch effect interval
let glitchInterval: ReturnType<typeof setInterval> | null = null;

// Block all escape attempts
const blockEscape = (e: KeyboardEvent) => {
  // Block F5, Ctrl+R, Ctrl+W, Escape, Backspace navigation
  if (
    e.key === "F5" ||
    (e.ctrlKey && e.key === "r") ||
    (e.ctrlKey && e.key === "w") ||
    e.key === "Escape" ||
    e.key === "Backspace"
  ) {
    e.preventDefault();
    e.stopPropagation();
    triggerGlitch();
  }
};

const blockContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  triggerGlitch();
};

const blockNavigation = (e: PopStateEvent) => {
  e.preventDefault();
  history.pushState(null, "", window.location.href);
  triggerGlitch();
};

const triggerGlitch = () => {
  glitchActive.value = true;
  setTimeout(() => {
    glitchActive.value = false;
  }, 200);
};

onMounted(async () => {
  generateParticles();
  generateFloatingTexts();

  // Push state to prevent back navigation
  history.pushState(null, "", window.location.href);
  history.pushState(null, "", window.location.href);

  // Block escape attempts
  window.addEventListener("keydown", blockEscape);
  window.addEventListener("contextmenu", blockContextMenu);
  window.addEventListener("popstate", blockNavigation);

  // Prevent beforeunload
  window.onbeforeunload = () => {
    return "Tu ne peux pas partir...";
  };

  // Random glitch effect
  glitchInterval = setInterval(() => {
    if (Math.random() < 0.1) {
      triggerGlitch();
    }
  }, 2000);

  // Animate entrance
  await new Promise((resolve) => setTimeout(resolve, 500));
  showContent.value = true;

  if (gsap) {
    gsap.fromTo(
      ".main-title",
      { scale: 0, rotation: -720, opacity: 0 },
      {
        scale: 1,
        rotation: 0,
        opacity: 1,
        duration: 2,
        ease: "elastic.out(1, 0.3)",
        delay: 0.5,
      },
    );

    gsap.fromTo(
      ".subtitle",
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out",
        delay: 1.5,
      },
    );

    gsap.fromTo(
      ".final-message",
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out",
        delay: 2.5,
      },
    );
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", blockEscape);
  window.removeEventListener("contextmenu", blockContextMenu);
  window.removeEventListener("popstate", blockNavigation);
  window.onbeforeunload = null;
  if (glitchInterval) clearInterval(glitchInterval);
});
</script>

<template>
  <div
    class="fixed inset-0 overflow-hidden select-none"
    :class="{ 'glitch-shake': glitchActive }"
    style="background: #0a0a0a"
  >
    <!-- Animated background gradient -->
    <div class="absolute inset-0 bg-gradient-animation" />

    <!-- Floating particles -->
    <div class="absolute inset-0 pointer-events-none">
      <div
        v-for="p in particles"
        :key="`particle-${p.id}`"
        class="absolute rounded-full animate-float-particle"
        :style="{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          backgroundColor: p.color,
          boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          animationDelay: `${p.delay}s`,
          opacity: 0.6,
        }"
      />
    </div>

    <!-- Floating cryptic texts -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        v-for="t in floatingTexts"
        :key="`text-${t.id}`"
        class="absolute font-mono animate-float-text whitespace-nowrap"
        :style="{
          left: `${t.x}%`,
          top: `${t.y}%`,
          fontSize: `${t.size}px`,
          opacity: t.opacity,
          color: colors[t.id % colors.length],
          textShadow: `0 0 10px ${colors[t.id % colors.length]}`,
        }"
      >
        {{ t.text }}
      </div>
    </div>

    <!-- Scanlines effect -->
    <div class="absolute inset-0 pointer-events-none scanlines" />

    <!-- Vignette -->
    <div class="absolute inset-0 pointer-events-none vignette" />

    <!-- Main content -->
    <div
      v-if="showContent"
      class="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center"
    >
      <!-- Main title -->
      <h1
        class="main-title text-6xl md:text-8xl lg:text-9xl font-black mb-8 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent animate-gradient-x"
        style="opacity: 0"
      >
        FIN
      </h1>

      <!-- Subtitle -->
      <p
        class="subtitle text-2xl md:text-4xl text-white/80 mb-12 font-light tracking-wider"
        style="opacity: 0"
      >
        Tu as traversé le chaos.
      </p>

      <!-- Final message box -->
      <div
        class="final-message max-w-2xl mx-auto p-8 rounded-2xl border border-white/10 backdrop-blur-sm"
        style="
          background: linear-gradient(
            135deg,
            rgba(255, 102, 200, 0.1) 0%,
            rgba(107, 255, 255, 0.1) 50%,
            rgba(187, 255, 66, 0.1) 100%
          );
          opacity: 0;
        "
      >
        <p class="text-lg md:text-xl text-white/90 mb-6 leading-relaxed">
          Félicitations, tu as trouvé le bouton secret caché dans le chaos.
        </p>
        <p class="text-base md:text-lg text-white/60 mb-8">
          Il n'y a plus rien à faire ici. Le voyage est terminé.
        </p>

        <!-- Fake buttons that do nothing -->
        <div class="flex flex-wrap justify-center gap-4">
          <button
            class="px-6 py-3 rounded-lg bg-white/5 border border-white/20 text-white/40 cursor-not-allowed transition-all hover:bg-white/10"
            @click.prevent="triggerGlitch"
          >
            Recommencer ?
          </button>
          <button
            class="px-6 py-3 rounded-lg bg-white/5 border border-white/20 text-white/40 cursor-not-allowed transition-all hover:bg-white/10"
            @click.prevent="triggerGlitch"
          >
            Quitter
          </button>
          <button
            class="px-6 py-3 rounded-lg bg-white/5 border border-white/20 text-white/40 cursor-not-allowed transition-all hover:bg-white/10"
            @click.prevent="triggerGlitch"
          >
            Retour
          </button>
        </div>

        <p class="mt-8 text-sm text-white/30 italic">
          (Ferme l'onglet si tu veux vraiment partir... si tu peux.)
        </p>
      </div>

      <!-- Timer since arrival -->
      <div class="mt-16 text-white/20 text-sm font-mono">
        <span class="animate-pulse">█</span> SESSION TERMINÉE
        <span class="animate-pulse">█</span>
      </div>
    </div>

    <!-- Glitch overlay -->
    <div
      v-if="glitchActive"
      class="fixed inset-0 z-50 pointer-events-none mix-blend-screen"
    >
      <div class="absolute inset-0 bg-red-500/20 animate-glitch-1" />
      <div class="absolute inset-0 bg-cyan-500/20 animate-glitch-2" />
    </div>
  </div>
</template>

<style scoped>
.bg-gradient-animation {
  background: linear-gradient(
    -45deg,
    #0a0a0a,
    #1a0a1a,
    #0a1a1a,
    #1a1a0a,
    #0a0a0a
  );
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-gradient-x {
  background-size: 200% auto;
  animation: gradientX 3s linear infinite;
}

@keyframes gradientX {
  0% {
    background-position: 0% center;
  }
  100% {
    background-position: 200% center;
  }
}

.animate-float-particle {
  animation: floatParticle 8s ease-in-out infinite;
}

@keyframes floatParticle {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(20px, -30px) scale(1.2);
  }
  50% {
    transform: translate(-10px, -50px) scale(0.8);
  }
  75% {
    transform: translate(30px, -20px) scale(1.1);
  }
}

.animate-float-text {
  animation: floatText 20s linear infinite;
}

@keyframes floatText {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 0.3;
  }
  90% {
    opacity: 0.3;
  }
  100% {
    transform: translateY(-100vh) translateX(50px);
    opacity: 0;
  }
}

.scanlines {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  animation: scanlineMove 8s linear infinite;
}

@keyframes scanlineMove {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 0 100vh;
  }
}

.vignette {
  background: radial-gradient(
    ellipse at center,
    transparent 0%,
    transparent 40%,
    rgba(0, 0, 0, 0.8) 100%
  );
}

.glitch-shake {
  animation: glitchShake 0.2s ease-in-out;
}

@keyframes glitchShake {
  0%,
  100% {
    transform: translate(0);
  }
  20% {
    transform: translate(-5px, 3px);
  }
  40% {
    transform: translate(5px, -3px);
  }
  60% {
    transform: translate(-3px, 5px);
  }
  80% {
    transform: translate(3px, -5px);
  }
}

.animate-glitch-1 {
  animation: glitch1 0.2s ease-in-out;
}

.animate-glitch-2 {
  animation: glitch2 0.2s ease-in-out;
}

@keyframes glitch1 {
  0%,
  100% {
    clip-path: inset(0 0 0 0);
    transform: translate(0);
  }
  20% {
    clip-path: inset(20% 0 60% 0);
    transform: translate(-10px);
  }
  40% {
    clip-path: inset(40% 0 40% 0);
    transform: translate(10px);
  }
  60% {
    clip-path: inset(60% 0 20% 0);
    transform: translate(-5px);
  }
  80% {
    clip-path: inset(80% 0 10% 0);
    transform: translate(5px);
  }
}

@keyframes glitch2 {
  0%,
  100% {
    clip-path: inset(0 0 0 0);
    transform: translate(0);
  }
  20% {
    clip-path: inset(60% 0 20% 0);
    transform: translate(10px);
  }
  40% {
    clip-path: inset(20% 0 60% 0);
    transform: translate(-10px);
  }
  60% {
    clip-path: inset(80% 0 10% 0);
    transform: translate(5px);
  }
  80% {
    clip-path: inset(10% 0 80% 0);
    transform: translate(-5px);
  }
}
</style>
