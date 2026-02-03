<template>
  <div
    class="min-h-screen bg-MyBlack flex items-center justify-center px-4 relative overflow-hidden"
  >
    <!-- Fond décoratif chaotique -->
    <div class="absolute inset-0 pointer-events-none">
      <div
        class="absolute -top-40 -left-40 w-80 h-80 bg-MyPink/20 rounded-full blur-3xl animate-pulse"
        :style="{ animationDuration: '3s' }"
      />
      <div
        class="absolute -bottom-40 -right-40 w-96 h-96 bg-MyBlue/15 rounded-full blur-3xl animate-pulse"
        :style="{ animationDuration: '4s', animationDelay: '1s' }"
      />
      <div
        class="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
        :style="{ animationDuration: '5s', animationDelay: '2s' }"
      />

      <!-- Glitch lines -->
      <div
        v-for="i in 5"
        :key="i"
        class="absolute h-px bg-gradient-to-r from-transparent via-MyPink/50 to-transparent"
        :style="{
          top: `${15 + i * 18}%`,
          left: '-10%',
          right: '-10%',
          animation: `glitchLine ${2 + i * 0.5}s ease-in-out infinite`,
          animationDelay: `${i * 0.3}s`,
        }"
      />
    </div>

    <!-- Contenu principal -->
    <div class="relative z-10 text-center max-w-lg">
      <!-- Code d'erreur glitché -->
      <div class="relative mb-8">
        <h1
          class="text-[120px] sm:text-[180px] font-bold font-bricolage leading-none select-none"
          :style="{
            background:
              'linear-gradient(135deg, #FF66C8 0%, #6BFFFF 50%, #FF66C8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 3s ease infinite',
          }"
        >
          404
        </h1>

        <!-- Effet de glitch sur le 404 -->
        <h1
          class="absolute inset-0 text-[120px] sm:text-[180px] font-bold font-bricolage leading-none text-MyPink/30 select-none"
          :style="{
            transform: 'translate(4px, -2px)',
            animation: 'glitchText 2s infinite',
          }"
        >
          404
        </h1>
        <h1
          class="absolute inset-0 text-[120px] sm:text-[180px] font-bold font-bricolage leading-none text-MyBlue/30 select-none"
          :style="{
            transform: 'translate(-4px, 2px)',
            animation: 'glitchText 2s infinite reverse',
          }"
        >
          404
        </h1>
      </div>

      <!-- Message d'erreur -->
      <div class="space-y-4 mb-8">
        <h2 class="text-2xl sm:text-3xl font-bricolage text-white">
          <span class="text-MyPink">Oups !</span> Page introuvable
        </h2>
        <p class="text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
          Cette page s'est perdue dans le chaos... Peut-être qu'elle n'a jamais
          existé, ou peut-être qu'elle est juste
          <span class="text-MyPink font-medium">éphémère</span>.
        </p>
      </div>

      <!-- Message glitché qui change -->
      <div
        class="mb-8 py-3 px-6 rounded-xl bg-zinc-900/50 border border-zinc-800 inline-block"
      >
        <p class="font-mono text-sm text-zinc-500">
          <span class="text-red-400">ERROR:</span>
          <span class="ml-2 text-zinc-300">{{ currentErrorMessage }}</span>
        </p>
      </div>

      <!-- Boutons d'action -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <NuxtLink
          to="/"
          class="px-8 py-3 rounded-xl bg-gradient-to-r from-MyPink to-purple-600 text-white font-bricolage font-semibold hover:opacity-90 transition-all hover:scale-105 active:scale-95"
        >
          🏠 Retour à l'accueil
        </NuxtLink>

        <button
          class="px-8 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bricolage transition-all hover:scale-105 active:scale-95 border border-zinc-700"
          @click="goBack"
        >
          ← Page précédente
        </button>
      </div>

      <!-- Easter egg - compteur de clics inutiles -->
      <div v-if="uselessClicks > 0" class="mt-8">
        <p class="text-xs text-zinc-600 font-mono">
          Clics inutiles sur cette page: {{ uselessClicks }}
        </p>
        <p v-if="uselessClicks >= 10" class="text-xs text-MyPink mt-1 animate-pulse">
          Tu cherches quelque chose ?
        </p>
        <p v-if="uselessClicks >= 20" class="text-xs text-purple-400 mt-1">
          Le secret n'est pas ici... mais ailleurs 🎭
        </p>
      </div>
    </div>

    <!-- Particules flottantes -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        v-for="i in 15"
        :key="'particle-' + i"
        class="absolute w-1 h-1 rounded-full"
        :class="i % 2 === 0 ? 'bg-MyPink/40' : 'bg-MyBlue/40'"
        :style="{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Page d'erreur 404
 * Design cohérent avec le reste du site chaotique
 */

definePageMeta({
  layout: false,
});

useSeoMeta({
  title: "404 - Page introuvable",
  description: "Cette page s'est perdue dans le chaos...",
  robots: "noindex, nofollow",
});

const router = useRouter();

const errorMessages = [
  "PAGE_NOT_FOUND",
  "REALITY_CORRUPTED",
  "DIMENSION_MISMATCH",
  "PATH_DISSOLVED",
  "EXISTENCE_UNDEFINED",
  "VOID_ENCOUNTERED",
  "CHAOS_OVERFLOW",
  "MEMORY_FRAGMENTED",
];

const currentErrorMessage = ref(errorMessages[0]);
const uselessClicks = ref(0);

// Changer le message d'erreur périodiquement
let messageInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  messageInterval = setInterval(() => {
    currentErrorMessage.value =
      errorMessages[Math.floor(Math.random() * errorMessages.length)] ??
      "UNKNOWN_ERROR";
  }, 2000);

  // Compter les clics inutiles
  document.addEventListener("click", handleUselessClick);
});

onUnmounted(() => {
  if (messageInterval) clearInterval(messageInterval);
  document.removeEventListener("click", handleUselessClick);
});

const handleUselessClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  // Ne pas compter si c'est un lien ou bouton
  if (target.closest("a") || target.closest("button")) return;
  uselessClicks.value++;
};

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/");
  }
};
</script>

<style scoped>
@keyframes gradientShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes glitchText {
  0%,
  100% {
    transform: translate(0, 0);
    opacity: 0;
  }
  20% {
    transform: translate(4px, -2px);
    opacity: 0.3;
  }
  40% {
    transform: translate(-2px, 1px);
    opacity: 0;
  }
  60% {
    transform: translate(2px, -1px);
    opacity: 0.2;
  }
  80% {
    transform: translate(-4px, 2px);
    opacity: 0;
  }
}

@keyframes glitchLine {
  0%,
  100% {
    transform: translateX(-100%) scaleX(0.5);
    opacity: 0;
  }
  50% {
    transform: translateX(100%) scaleX(1);
    opacity: 1;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.4;
  }
  25% {
    transform: translate(10px, -20px) scale(1.2);
    opacity: 0.8;
  }
  50% {
    transform: translate(-5px, -40px) scale(0.8);
    opacity: 0.4;
  }
  75% {
    transform: translate(15px, -20px) scale(1.1);
    opacity: 0.6;
  }
}
</style>
