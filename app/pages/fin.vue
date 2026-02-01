<template>
  <div class="fixed inset-0 bg-MyBlack text-white overflow-hidden select-none">
    <!-- ==================== FOND CHAOTIQUE EN MOUVEMENT ==================== -->
    <div class="absolute inset-0 pointer-events-none">
      <!-- Gradients statiques subtils -->
      <div
        class="absolute inset-0"
        style="
          background:
            radial-gradient(
              ellipse 80% 60% at 30% 20%,
              rgba(255, 102, 200, 0.15) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 60% 80% at 70% 80%,
              rgba(107, 255, 255, 0.12) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 50% 50% at 50% 50%,
              rgba(255, 247, 70, 0.08) 0%,
              transparent 70%
            );
        "
      />

      <!-- Grille infinie qui défile -->
      <div
        class="absolute inset-0 opacity-[0.03]"
        :style="{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: `translateY(${scrollOffset % 60}px)`,
        }"
      />

      <!-- Lignes de scan horizontales -->
      <div
        v-for="n in 8"
        :key="`scan-${n}`"
        class="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
        :style="{
          top: `${(n * 12.5 + scrollOffset * 0.3) % 100}%`,
          opacity: 0.4 + Math.sin(scrollOffset * 0.01 + n) * 0.3,
        }"
      />

      <!-- Orbes flottantes -->
      <div
        v-for="orb in floatingOrbs"
        :key="orb.id"
        class="absolute rounded-full blur-2xl"
        :style="{
          width: `${orb.size}px`,
          height: `${orb.size}px`,
          left: `${orb.x + Math.sin(scrollOffset * orb.speed + orb.phase) * 5}%`,
          top: `${((orb.y + scrollOffset * orb.drift) % 120) - 10}%`,
          backgroundColor: orb.color,
          opacity: orb.opacity,
        }"
      />

      <!-- Fragments d'interface qui flottent -->
      <div
        v-for="fragment in interfaceFragments"
        :key="fragment.id"
        class="absolute font-mono text-xs whitespace-nowrap"
        :style="{
          left: `${fragment.x}%`,
          top: `${((fragment.y + scrollOffset * fragment.speed) % 130) - 15}%`,
          color: fragment.color,
          opacity: fragment.opacity,
          transform: `rotate(${fragment.rotation + scrollOffset * 0.02}deg)`,
          fontSize: `${fragment.size}px`,
        }"
      >
        {{ fragment.text }}
      </div>

      <!-- Formes géométriques dérivantes -->
      <div
        v-for="shape in floatingShapes"
        :key="shape.id"
        class="absolute border"
        :style="{
          width: `${shape.size}px`,
          height: `${shape.size}px`,
          left: `${shape.x + Math.cos(scrollOffset * shape.speed) * 3}%`,
          top: `${((shape.y + scrollOffset * shape.drift) % 120) - 10}%`,
          borderColor: shape.color,
          borderRadius:
            shape.type === 'circle'
              ? '50%'
              : shape.type === 'diamond'
                ? '0'
                : '4px',
          transform: `rotate(${shape.rotation + scrollOffset * shape.rotSpeed}deg)`,
          opacity: shape.opacity,
        }"
      />

      <!-- Emojis qui dérivent -->
      <div
        v-for="emoji in driftingEmojis"
        :key="emoji.id"
        class="absolute"
        :style="{
          left: `${emoji.x + Math.sin(scrollOffset * emoji.wobble) * 2}%`,
          top: `${((emoji.y + scrollOffset * emoji.speed) % 130) - 15}%`,
          fontSize: `${emoji.size}px`,
          opacity: emoji.opacity,
          transform: `rotate(${emoji.rotation + scrollOffset * 0.05}deg)`,
        }"
      >
        {{ emoji.char }}
      </div>

      <!-- Lignes de code qui scrollent sur le côté gauche -->
      <div
        class="absolute left-0 top-0 bottom-0 w-48 overflow-hidden opacity-[0.06]"
      >
        <div
          class="font-mono text-[10px] text-MyBlue whitespace-pre leading-relaxed"
          :style="{ transform: `translateY(${-scrollOffset * 0.5}px)` }"
        >
          <div v-for="(line, i) in codeLines" :key="i" class="px-2">
            {{ line }}
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== VIGNETTE OVERLAY ==================== -->
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: radial-gradient(
          ellipse at center,
          transparent 0%,
          transparent 40%,
          rgba(0, 0, 0, 0.6) 100%
        );
      "
    />

    <!-- ==================== CONTENU PRINCIPAL ==================== -->
    <div class="relative z-10 h-full flex items-center justify-center p-6">
      <!-- ===== PHASE INTRO: TEMPS PASSÉ ===== -->
      <div
        v-if="phase === 'intro'"
        class="text-center max-w-xl animate-fade-in-slow"
      >
        <p
          class="font-bricolage text-zinc-600 text-sm mb-4 tracking-widest uppercase"
        >
          Tu as passé
        </p>
        <p
          class="font-candy text-7xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/40 mb-6"
        >
          {{ formattedTime }}
        </p>
        <p class="font-bricolage text-lg text-zinc-500 mb-4">
          {{ timeMessage }}
        </p>
        <div class="mt-8 flex justify-center gap-1">
          <span
            v-for="n in 3"
            :key="n"
            class="w-2 h-2 rounded-full bg-white/30 animate-pulse"
            :style="{ animationDelay: `${n * 0.3}s` }"
          />
        </div>
      </div>

      <!-- ===== QUIZ DIRECT ===== -->
      <div v-if="phase === 'quiz'" class="w-full max-w-lg animate-fade-in">
        <!-- Temps passé discret en haut -->
        <div class="absolute top-6 left-1/2 -translate-x-1/2 text-center">
          <p class="font-candy text-2xl text-white/20">{{ formattedTime }}</p>
          <p class="font-bricolage text-[10px] text-zinc-700">dans le chaos</p>
        </div>
        <!-- Indicateur de progression minimal -->
        <div class="flex justify-center gap-2 mb-12">
          <div
            v-for="n in selectedQuestions.length"
            :key="n"
            class="w-2 h-2 rounded-full transition-all duration-300"
            :class="
              n - 1 < currentQuestionIndex
                ? 'bg-MyGreen'
                : n - 1 === currentQuestionIndex
                  ? 'bg-white'
                  : 'bg-zinc-800'
            "
          />
        </div>

        <!-- Question -->
        <div class="text-center mb-8">
          <p
            class="font-bricolage text-xl md:text-2xl text-white/90 leading-relaxed"
          >
            {{ currentQuestion?.question }}
          </p>
        </div>

        <!-- Input -->
        <div class="relative mb-6">
          <input
            ref="answerInput"
            v-model="currentAnswer"
            type="text"
            placeholder="..."
            class="w-full px-6 py-5 bg-transparent border-b-2 border-zinc-800 text-center font-bricolage text-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
            @keydown.enter="handleSubmit"
            :disabled="answered"
          />
        </div>

        <!-- Feedback -->
        <div class="h-16 flex items-center justify-center">
          <div v-if="answered" class="animate-fade-in text-center">
            <p
              v-if="lastAnswerCorrect"
              class="text-MyGreen font-bricolage flex items-center gap-2 justify-center"
            >
              <span class="text-2xl">✓</span>
              <span>Tu l'avais vu.</span>
            </p>
            <div v-else class="text-center">
              <p class="font-bricolage text-red-400/80 mb-2">
                C'était
                <span class="text-white">{{
                  currentQuestion?.correctAnswer
                }}</span>
              </p>
              <p class="font-bricolage text-xs text-zinc-600">
                Retour au chaos dans {{ redirectCountdown }}s...
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-center gap-4 mt-8">
          <button
            v-if="
              !answered &&
              currentQuestion?.hint &&
              !showHints[currentQuestion.id]
            "
            @click="useHint"
            class="px-4 py-2 text-zinc-600 hover:text-MyYellow font-bricolage text-sm transition-colors"
          >
            💡 indice
          </button>
          <span
            v-else-if="showHints[currentQuestion?.id || '']"
            class="text-xs text-MyYellow/50 font-bricolage"
          >
            {{ currentQuestion?.hint }}
          </span>
        </div>

        <div class="flex justify-center mt-4">
          <button
            v-if="!answered"
            @click="handleSubmit"
            :disabled="!currentAnswer.trim()"
            class="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-bricolage text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Valider
          </button>
          <button
            v-else-if="lastAnswerCorrect"
            @click="goToNext"
            class="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-bricolage text-white transition-all"
          >
            {{
              currentQuestionIndex < selectedQuestions.length - 1
                ? "Suivant"
                : "Voir les résultats"
            }}
          </button>
          <!-- Si erreur, pas de bouton - redirection automatique -->
        </div>
      </div>

      <!-- ===== PHASE RÉSULTATS ===== -->
      <div
        v-else-if="phase === 'result'"
        class="text-center max-w-2xl animate-fade-in-slow"
      >
        <!-- Message simple de fin -->
        <div class="mb-12">
          <p
            class="font-candy text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-white via-white/60 to-white/20 mb-6"
          >
            Fin.
          </p>
          <p class="font-bricolage text-zinc-500 text-lg">
            L'expérience est terminée.
          </p>
        </div>

        <!-- Citation finale -->
        <p
          class="font-bricolage text-sm text-zinc-700 max-w-sm mx-auto italic leading-relaxed mb-16"
        >
          « Nous regardons sans voir.<br />
          L'attention est devenue le plus rare des luxes. »
        </p>

        <!-- Bouton recommencer -->
        <button
          @click="restartAll"
          class="inline-block px-10 py-4 border border-zinc-700 rounded-full font-bricolage text-sm text-zinc-500 hover:text-white hover:border-white/30 transition-all duration-500"
        >
          Recommencer
        </button>
      </div>
    </div>

    <!-- ==================== GRAIN SUBTIL ==================== -->
    <div
      class="absolute inset-0 pointer-events-none opacity-[0.015]"
      style="
        background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==&quot;);
      "
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import {
  useAttentionQuiz,
  ATTENTION_QUESTIONS,
} from "~/composables/useAttentionQuiz";
import { useDegradation } from "~/composables/useDegradation";
import { useRouter } from "vue-router";

// Protection de la route - authentification obligatoire
definePageMeta({
  middleware: ["auth"],
});

// ==================== QUIZ ====================
const {
  currentQuestionIndex,
  showHints,
  quizCompleted,
  quizStarted,
  selectedQuestions,
  currentQuestion,
  score,
  endMessage,
  initQuiz,
  submitAnswer,
  nextQuestion,
  showHint,
} = useAttentionQuiz();

// ==================== PHASES ====================
type Phase = "intro" | "quiz" | "result";
const phase = ref<Phase>("intro");

// ==================== ÉTAT LOCAL ====================
const currentAnswer = ref("");
const answered = ref(false);
const lastAnswerCorrect = ref(false);
const answerInput = ref<HTMLInputElement | null>(null);
const redirectCountdown = ref(3);
let redirectTimer: ReturnType<typeof setInterval> | null = null;

// ==================== TEMPS ====================
const timeSpentSeconds = ref(0);

const formattedTime = computed(() => {
  const hours = Math.floor(timeSpentSeconds.value / 3600);
  const minutes = Math.floor((timeSpentSeconds.value % 3600) / 60);
  const seconds = timeSpentSeconds.value % 60;

  if (hours > 0) {
    return `${hours}h${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  } else {
    return `${seconds}s`;
  }
});

const timeMessage = computed(() => {
  const t = timeSpentSeconds.value;
  if (t < 60) return "Un passage éclair dans le chaos digital.";
  if (t < 180) return "Assez pour se perdre, pas assez pour tout voir.";
  if (t < 300) return "Le temps file quand l'attention dérive.";
  if (t < 600) return "Tu t'es laissé absorber par l'expérience.";
  if (t < 900) return "Profondément immergé dans le flux.";
  return "Un voyage complet à travers le chaos.";
});

// ==================== ANIMATION DE SCROLL CONTINU ====================
const scrollOffset = ref(0);
let scrollAnimationFrame: number;
let isAnimating = true;

const animateScroll = () => {
  if (!isAnimating) return;
  scrollOffset.value += 0.5;
  scrollAnimationFrame = requestAnimationFrame(animateScroll);
};

// ==================== ÉLÉMENTS VISUELS ====================
const floatingOrbs = computed(() => {
  const colors = [
    "rgba(255, 102, 200, 0.15)",
    "rgba(107, 255, 255, 0.12)",
    "rgba(255, 247, 70, 0.1)",
    "rgba(187, 255, 66, 0.08)",
  ];
  return Array.from({ length: 6 }, (_, i) => ({
    id: `orb-${i}`,
    x: 10 + ((i * 15) % 80),
    y: 5 + ((i * 20) % 90),
    size: 150 + ((i * 50) % 200),
    color: colors[i % colors.length],
    speed: 0.002 + i * 0.001,
    drift: 0.02 + i * 0.01,
    phase: i * 1.5,
    opacity: 0.5,
  }));
});

const interfaceFragments = computed(() => {
  const fragments = [
    { text: "ERREUR", color: "rgba(255, 102, 200, 0.3)" },
    { text: "404", color: "rgba(107, 255, 255, 0.25)" },
    { text: "LOADING...", color: "rgba(255, 255, 255, 0.15)" },
    { text: "undefined", color: "rgba(255, 247, 70, 0.2)" },
    { text: "NULL", color: "rgba(187, 255, 66, 0.2)" },
    { text: "ISLANDE", color: "rgba(107, 255, 255, 0.25)" },
    { text: "ÉPHÉMÈRE", color: "rgba(255, 102, 200, 0.2)" },
    { text: "VIOLET", color: "rgba(138, 43, 226, 0.3)" },
    { text: "∞", color: "rgba(255, 247, 70, 0.3)" },
    { text: "42", color: "rgba(187, 255, 66, 0.25)" },
  ];
  return fragments.map((f, i) => ({
    id: `frag-${i}`,
    text: f.text,
    color: f.color,
    x: 5 + ((i * 11) % 90),
    y: (i * 13) % 100,
    speed: 0.03 + i * 0.015,
    rotation: -15 + ((i * 7) % 30),
    opacity: 0.6,
    size: 10 + (i % 3) * 2,
  }));
});

const floatingShapes = computed(() => {
  const types = ["circle", "square", "diamond"] as const;
  const colors = [
    "rgba(255, 102, 200, 0.2)",
    "rgba(107, 255, 255, 0.15)",
    "rgba(255, 247, 70, 0.15)",
  ];
  return Array.from({ length: 12 }, (_, i) => ({
    id: `shape-${i}`,
    type: types[i % 3],
    x: 8 + ((i * 8) % 85),
    y: (i * 11) % 100,
    size: 20 + ((i * 5) % 40),
    color: colors[i % colors.length],
    rotation: i * 30,
    rotSpeed: 0.05 + i * 0.02,
    speed: 0.003 + i * 0.002,
    drift: 0.025 + i * 0.008,
    opacity: 0.4,
  }));
});

const driftingEmojis = computed(() => {
  const chars = ["👁️", "⏰", "🦋", "⏳", "💭", "✨", "🌀", "∞"];
  return chars.map((char, i) => ({
    id: `emoji-${i}`,
    char,
    x: 10 + ((i * 12) % 80),
    y: (i * 15) % 100,
    size: 16 + (i % 3) * 8,
    speed: 0.02 + i * 0.01,
    wobble: 0.01 + i * 0.005,
    rotation: i * 15,
    opacity: 0.25,
  }));
});

const codeLines = computed(() => {
  const lines = [
    "const attention = null;",
    "while (true) { scroll(); }",
    "if (time > 0) waste(time);",
    "return undefined;",
    'throw new Error("focus");',
    "await distraction();",
    "memory.clear();",
    "consciousness.fade();",
    "// TODO: be present",
    'import { chaos } from "life";',
    "export default void 0;",
    "delete reality.meaning;",
    'console.log("...");',
    "break; // never reached",
    "continue; // forever",
  ];
  // Répéter pour créer un scroll infini
  return [...lines, ...lines, ...lines, ...lines, ...lines];
});

// ==================== SCORE GRADIENT ====================
const scoreGradientClass = computed(() => {
  const p = score.value.percentage;
  if (p >= 80)
    return "bg-gradient-to-b from-MyGreen via-MyGreen/70 to-MyGreen/30";
  if (p >= 60)
    return "bg-gradient-to-b from-MyYellow via-MyYellow/70 to-MyYellow/30";
  if (p >= 40) return "bg-gradient-to-b from-MyBlue via-MyBlue/70 to-MyBlue/30";
  return "bg-gradient-to-b from-MyPink via-MyPink/70 to-MyPink/30";
});

// ==================== ACTIONS ====================
const router = useRouter();

// Reset global progression and navigate home
const { reset } = useDegradation();
const restartAll = () => {
  try {
    reset();
  } catch (e) {}
  // clear any local storage tracking
  try {
    localStorage.removeItem("chaosTimeSpent");
  } catch (e) {}
  router.push("/");
};

const startRedirectCountdown = () => {
  redirectCountdown.value = 3;
  redirectTimer = setInterval(() => {
    redirectCountdown.value--;
    if (redirectCountdown.value <= 0) {
      if (redirectTimer) clearInterval(redirectTimer);
      router.push("/");
    }
  }, 1000);
};

const restartQuiz = () => {
  currentAnswer.value = "";
  answered.value = false;
  lastAnswerCorrect.value = false;
  initQuiz(5);
  phase.value = "quiz";
  nextTick(() => {
    answerInput.value?.focus();
  });
};

const handleSubmit = () => {
  if (!currentAnswer.value.trim() || answered.value) return;

  if (currentQuestion.value) {
    lastAnswerCorrect.value = submitAnswer(
      currentQuestion.value.id,
      currentAnswer.value,
    );
    answered.value = true;

    // Si mauvaise réponse, démarrer le countdown de redirection
    if (!lastAnswerCorrect.value) {
      startRedirectCountdown();
    }
  }
};

const goToNext = () => {
  currentAnswer.value = "";
  answered.value = false;
  lastAnswerCorrect.value = false;

  if (currentQuestionIndex.value >= selectedQuestions.value.length - 1) {
    nextQuestion();
    phase.value = "result";
  } else {
    nextQuestion();
    nextTick(() => {
      answerInput.value?.focus();
    });
  }
};

const useHint = () => {
  if (currentQuestion.value) {
    showHint(currentQuestion.value.id);
  }
};

// Timer pour la transition auto de l'intro
let introTimer: ReturnType<typeof setTimeout> | null = null;

// ==================== LIFECYCLE ====================
onMounted(() => {
  // Récupérer le temps depuis localStorage
  const savedTime = localStorage.getItem("chaosTimeSpent");
  if (savedTime) {
    timeSpentSeconds.value = parseInt(savedTime, 10);
  }

  // Démarrer l'animation de scroll
  animateScroll();

  // Initialiser le quiz
  initQuiz(5);

  // Commencer par la phase intro (affichage du temps)
  phase.value = "intro";

  // Auto-transition vers le quiz après 3.5 secondes
  introTimer = setTimeout(() => {
    phase.value = "quiz";
    nextTick(() => {
      answerInput.value?.focus();
    });
  }, 3500);
});

onUnmounted(() => {
  isAnimating = false;
  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
  }
  if (redirectTimer) {
    clearInterval(redirectTimer);
  }
  if (introTimer) {
    clearTimeout(introTimer);
  }
});
</script>

<style scoped>
.font-candy {
  font-family: "Candy Beans", cursive;
}

/* Animations */
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

@keyframes fade-in-slow {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in-slow {
  animation: fade-in-slow 1.5s ease-out forwards;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out forwards;
}
</style>
