<template>
  <div
    ref="welcomeContainer"
    class="fixed inset-0 bg-MyBlack flex items-center justify-center overflow-hidden z-50"
  >
    <!-- Fond avec particules subtiles -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Gradient ambiant -->
      <div
        class="absolute inset-0 opacity-30"
        style="
          background:
            radial-gradient(
              ellipse 80% 50% at 20% 30%,
              rgba(255, 102, 200, 0.15) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 60% 60% at 80% 70%,
              rgba(107, 255, 255, 0.1) 0%,
              transparent 50%
            );
        "
      />

      <!-- Particules flottantes -->
      <div
        v-for="particle in particles"
        :key="particle.id"
        class="absolute rounded-full"
        :style="{
          left: `${particle.x}%`,
          top: `${particle.y}%`,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          backgroundColor: particle.color,
          opacity: particle.opacity,
          filter: 'blur(1px)',
        }"
      />
    </div>

    <!-- Contenu principal -->
    <div ref="contentContainer" class="relative z-10 text-center px-6">
      <!-- Ligne décorative supérieure -->
      <div
        ref="lineTop"
        class="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-12"
        :class="animationReady ? 'w-0' : 'w-[200px]'"
      />

      <!-- Message de bienvenue -->
      <div ref="greetingContainer" class="overflow-hidden">
        <p
          ref="greetingText"
          class="font-bricolage text-zinc-400 text-xl md:text-2xl tracking-wider mb-2"
          :class="animationReady ? 'translate-y-full' : 'translate-y-0'"
        >
          Bienvenue,
        </p>
      </div>

      <!-- Pseudo de l'utilisateur -->
      <div ref="usernameContainer" class="overflow-hidden">
        <h1
          ref="usernameText"
          class="font-candy text-5xl md:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-r from-MyPink via-white to-MyBlue drop-shadow-lg"
          :class="animationReady ? 'translate-y-full' : 'translate-y-0'"
          style="
            text-shadow:
              0 0 40px rgba(255, 102, 200, 0.3),
              0 0 80px rgba(107, 255, 255, 0.2);
          "
        >
          {{ displayName }}
        </h1>
      </div>

      <!-- Message d'entrée dans l'expérience -->
      <div ref="experienceContainer" class="overflow-hidden mt-8">
        <p
          ref="experienceText"
          class="font-bricolage text-zinc-500 text-base md:text-lg tracking-wide flex items-center justify-center gap-2"
          :class="
            animationReady
              ? 'translate-y-full opacity-0'
              : 'translate-y-0 opacity-100'
          "
        >
          <span
            class="inline-block w-8 h-px bg-gradient-to-r from-transparent to-MyPink/50"
          ></span>
          Tu es arrivé dans l'expérience
          <span
            class="inline-block w-8 h-px bg-gradient-to-r from-MyBlue/50 to-transparent"
          ></span>
        </p>
      </div>

      <!-- Ligne décorative inférieure -->
      <div
        ref="lineBottom"
        class="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mt-12"
        :class="animationReady ? 'w-0' : 'w-[200px]'"
      />

      <!-- Indicateur de chargement subtil -->
      <div ref="loadingIndicator" class="mt-12 opacity-0">
        <div class="flex justify-center gap-2">
          <span
            v-for="n in 3"
            :key="n"
            class="w-1.5 h-1.5 rounded-full bg-white/40"
            :style="{ animationDelay: `${n * 0.15}s` }"
            :class="{ 'animate-pulse': showLoadingDots }"
          />
        </div>
      </div>
    </div>

    <!-- Overlay pour la transition de sortie -->
    <div
      ref="exitOverlay"
      class="absolute inset-0 bg-MyBlack pointer-events-none opacity-0 z-20"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";

definePageMeta({
  middleware: ["auth"],
});

// SEO (pas d'indexation - page privée)
useSeoMeta({
  title: "Bienvenue",
  robots: "noindex, nofollow",
});

const router = useRouter();

const { profile, user, isAuthenticated, initialized, initAuth } = useAuth();

// Fonction pour obtenir GSAP de manière sûre
const getGsap = (): typeof import("gsap").gsap | null => {
  try {
    const nuxtApp = useNuxtApp();
    return nuxtApp.$gsap as typeof import("gsap").gsap;
  } catch {
    return null;
  }
};

// Refs pour les éléments animés
const welcomeContainer = ref<HTMLElement | null>(null);
const contentContainer = ref<HTMLElement | null>(null);
const lineTop = ref<HTMLElement | null>(null);
const lineBottom = ref<HTMLElement | null>(null);
const greetingText = ref<HTMLElement | null>(null);
const usernameText = ref<HTMLElement | null>(null);
const experienceText = ref<HTMLElement | null>(null);
const loadingIndicator = ref<HTMLElement | null>(null);
const exitOverlay = ref<HTMLElement | null>(null);

const showLoadingDots = ref(false);
const animationReady = ref(false);

// Particules de fond
const particles = ref<
  Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    color: string;
    opacity: number;
  }>
>([]);

// Générer les particules
const generateParticles = () => {
  const colors = [
    "rgba(255, 102, 200, 0.3)",
    "rgba(107, 255, 255, 0.25)",
    "rgba(255, 247, 70, 0.2)",
    "rgba(187, 255, 66, 0.2)",
  ];

  const newParticles: typeof particles.value = [];
  for (let i = 0; i < 20; i++) {
    const color = colors[i % colors.length]!;
    newParticles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      color,
      opacity: 0.3 + Math.random() * 0.4,
    });
  }
  particles.value = newParticles;
};

// Nom d'affichage
const displayName = computed(() => {
  if (profile.value?.username) {
    return profile.value.username;
  }
  if (user.value?.user_metadata?.username) {
    return user.value.user_metadata.username as string;
  }
  if (user.value?.email) {
    return user.value.email.split("@")[0];
  }
  return "Voyageur";
});

// Animation des particules
let particleAnimationFrame: number;
const animateParticles = () => {
  particles.value = particles.value.map((p) => ({
    ...p,
    y: p.y - 0.02,
    x: p.x + Math.sin(Date.now() * 0.001 + p.id) * 0.01,
  }));

  // Recycler les particules qui sortent
  particles.value.forEach((p) => {
    if (p.y < -5) {
      p.y = 105;
      p.x = Math.random() * 100;
    }
  });

  particleAnimationFrame = requestAnimationFrame(animateParticles);
};

// Animation d'entrée
const playEntranceAnimation = () => {
  const gsap = getGsap();
  if (!gsap) {
    console.warn("GSAP non disponible, affichage statique puis redirection");
    animationReady.value = false; // Afficher le contenu normalement
    showLoadingDots.value = true;
    setTimeout(() => router.push("/"), 3000);
    return;
  }

  // Préparer l'animation (cacher les éléments)
  animationReady.value = true;

  // Attendre le prochain tick pour que les classes soient appliquées
  nextTick(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        showLoadingDots.value = true;
        // Démarrer la transition après un délai
        setTimeout(playExitAnimation, 2000);
      },
    });

    // Séquence d'animation
    tl.to(lineTop.value, {
      width: "200px",
      duration: 0.8,
      ease: "power2.out",
    })
      .to(
        greetingText.value,
        {
          y: 0,
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.3",
      )
      .to(
        usernameText.value,
        {
          y: 0,
          duration: 0.8,
          ease: "power3.out",
        },
        "-=0.2",
      )
      .to(
        experienceText.value,
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
        },
        "-=0.3",
      )
      .to(
        lineBottom.value,
        {
          width: "200px",
          duration: 0.8,
          ease: "power2.out",
        },
        "-=0.4",
      )
      .to(
        loadingIndicator.value,
        {
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
        },
        "-=0.2",
      );
  }); // Fin du nextTick
};

// Animation de sortie vers l'expérience
const playExitAnimation = () => {
  const gsap = getGsap();
  if (!gsap) {
    router.push("/");
    return;
  }

  // Marquer la visite
  localStorage.setItem("hasVisitedBefore", "true");

  const tl = gsap.timeline({
    onComplete: () => {
      router.push("/");
    },
  });

  // Animation de sortie
  tl.to(loadingIndicator.value, {
    opacity: 0,
    y: 20,
    duration: 0.3,
    ease: "power2.in",
  })
    .to(
      [lineTop.value, lineBottom.value],
      {
        width: 0,
        duration: 0.4,
        ease: "power2.in",
      },
      "-=0.1",
    )
    .to(
      contentContainer.value,
      {
        scale: 1.05,
        opacity: 0,
        duration: 0.6,
        ease: "power2.in",
      },
      "-=0.2",
    )
    .to(
      exitOverlay.value,
      {
        opacity: 1,
        duration: 0.4,
        ease: "power2.inOut",
      },
      "-=0.3",
    );
};

onMounted(async () => {
  console.log("Welcome page mounted");

  // S'assurer que l'auth est initialisée
  if (!initialized.value) {
    console.log("Initializing auth...");
    await initAuth();
  }

  console.log("Auth initialized:", initialized.value);
  console.log("Is authenticated:", isAuthenticated.value);
  console.log("User:", user.value);

  // Vérifier l'authentification
  if (!isAuthenticated.value) {
    console.log("Not authenticated, redirecting to login");
    router.push("/login");
    return;
  }

  generateParticles();
  animateParticles();

  // Attendre que le DOM soit prêt
  await nextTick();

  console.log("Starting entrance animation");
  // Petit délai pour que le DOM soit prêt
  setTimeout(playEntranceAnimation, 100);
});

onUnmounted(() => {
  if (particleAnimationFrame) {
    cancelAnimationFrame(particleAnimationFrame);
  }
});
</script>

<style scoped>
.font-candy {
  font-family: "Candy Beans", cursive;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.animate-pulse {
  animation: pulse 1s ease-in-out infinite;
}
</style>
