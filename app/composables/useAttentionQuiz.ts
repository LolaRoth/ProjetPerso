/**
 * Composable pour le quiz d'attention final
 * Gère les questions basées sur les éléments discrets de la page principale
 */
import { ref, computed, reactive } from "vue";

export interface AttentionQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  hint?: string;
  category:
    | "pays"
    | "animal"
    | "couleur"
    | "mot"
    | "symbole"
    | "nombre"
    | "objet";
}

// Questions basées sur les éléments discrets ajoutés à la page principale
export const ATTENTION_QUESTIONS: AttentionQuestion[] = [
  {
    id: "pays",
    question:
      "Quel pays était mentionné discrètement en bas de la première page ?",
    correctAnswer: "islande",
    hint: "C'était écrit en tout petit, près du mot 'design'...",
    category: "pays",
  },
  {
    id: "animal",
    question:
      "Quel animal (emoji) flottait dans un coin pendant le scroll horizontal ?",
    correctAnswer: "papillon",
    hint: "Il avait des ailes colorées...",
    category: "animal",
  },
  {
    id: "couleur",
    question:
      "Quelle couleur était indiquée verticalement sur le côté de la page ?",
    correctAnswer: "violet",
    hint: "C'était écrit 'teinte : ...'",
    category: "couleur",
  },
  {
    id: "mot",
    question: "Quel mot en majuscules apparaissait sous 'État du système' ?",
    correctAnswer: "éphémère",
    hint: "Un mot qui évoque quelque chose de passager...",
    category: "mot",
  },
  {
    id: "symbole",
    question:
      "Quel symbole mathématique était affiché discrètement dans la section de progression ?",
    correctAnswer: "infini",
    hint: "Un 8 couché...",
    category: "symbole",
  },
  {
    id: "nombre",
    question:
      "Quel nombre mythique était caché dans le coin de la section 'Séquence de couleurs' ?",
    correctAnswer: "42",
    hint: "La réponse à la grande question sur la vie, l'univers et le reste...",
    category: "nombre",
  },
  {
    id: "objet",
    question:
      "Quel emoji représentant le temps était visible dans la section du défi de clics ?",
    correctAnswer: "sablier",
    hint: "Il mesure le temps qui s'écoule...",
    category: "objet",
  },
];

// Réponses alternatives acceptées pour chaque question
const ALTERNATIVE_ANSWERS: Record<string, string[]> = {
  islande: ["iceland", "island"],
  papillon: ["butterfly", "🦋"],
  violet: ["purple", "mauve"],
  éphémère: ["ephemere", "ephemeral", "ephémère"],
  infini: ["infinity", "∞", "8"],
  "42": ["quarante-deux", "quarante deux", "forty two", "fortytwo"],
  sablier: ["hourglass", "⏳", "horloge", "temps", "timer"],
};

export function useAttentionQuiz() {
  // État du quiz
  const currentQuestionIndex = ref(0);
  const answers = reactive<Record<string, string>>({});
  const showHints = reactive<Record<string, boolean>>({});
  const quizCompleted = ref(false);
  const quizStarted = ref(false);

  // Nombre de questions configurables (par défaut 3 sur 5)
  const questionsToAsk = ref(3);

  // Questions sélectionnées aléatoirement
  const selectedQuestions = ref<AttentionQuestion[]>([]);

  // Initialiser les questions
  const initQuiz = (count: number = 3) => {
    questionsToAsk.value = Math.min(count, ATTENTION_QUESTIONS.length);

    // Mélanger et sélectionner les questions
    const shuffled = [...ATTENTION_QUESTIONS].sort(() => Math.random() - 0.5);
    selectedQuestions.value = shuffled.slice(0, questionsToAsk.value);

    // Reset état
    currentQuestionIndex.value = 0;
    Object.keys(answers).forEach((key) => delete answers[key]);
    Object.keys(showHints).forEach((key) => delete showHints[key]);
    quizCompleted.value = false;
    quizStarted.value = true;
  };

  // Question courante
  const currentQuestion = computed(() => {
    return selectedQuestions.value[currentQuestionIndex.value] || null;
  });

  // Normaliser une réponse pour comparaison
  const normalizeAnswer = (answer: string): string => {
    return answer
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Retirer les accents
      .replace(/[^a-z0-9∞]/g, ""); // Garder seulement lettres, chiffres et ∞
  };

  // Vérifier si une réponse est correcte
  const isAnswerCorrect = (questionId: string, answer: string): boolean => {
    const question = selectedQuestions.value.find((q) => q.id === questionId);
    if (!question) return false;

    const normalizedAnswer = normalizeAnswer(answer);
    const normalizedCorrect = normalizeAnswer(question.correctAnswer);

    // Vérifier la réponse principale
    if (normalizedAnswer === normalizedCorrect) return true;

    // Vérifier les alternatives
    const alternatives = ALTERNATIVE_ANSWERS[question.correctAnswer] || [];
    return alternatives.some(
      (alt) => normalizeAnswer(alt) === normalizedAnswer,
    );
  };

  // Soumettre une réponse
  const submitAnswer = (questionId: string, answer: string): boolean => {
    answers[questionId] = answer;
    return isAnswerCorrect(questionId, answer);
  };

  // Passer à la question suivante
  const nextQuestion = () => {
    if (currentQuestionIndex.value < selectedQuestions.value.length - 1) {
      currentQuestionIndex.value++;
    } else {
      quizCompleted.value = true;
    }
  };

  // Afficher un indice
  const showHint = (questionId: string) => {
    showHints[questionId] = true;
  };

  // Calculer le score
  const score = computed(() => {
    let correct = 0;
    selectedQuestions.value.forEach((q) => {
      const answer = answers[q.id];
      if (answer && isAnswerCorrect(q.id, answer)) {
        correct++;
      }
    });
    return {
      correct,
      total: selectedQuestions.value.length,
      percentage: Math.round((correct / selectedQuestions.value.length) * 100),
    };
  });

  // Résultats détaillés
  const results = computed(() => {
    return selectedQuestions.value.map((q) => {
      const answer = answers[q.id];
      return {
        question: q,
        userAnswer: answer || "",
        isCorrect: answer ? isAnswerCorrect(q.id, answer) : false,
        usedHint: showHints[q.id] || false,
      };
    });
  });

  // Message de fin basé sur le score
  const endMessage = computed(() => {
    const pct = score.value.percentage;

    if (pct === 100) {
      return {
        title: "Impressionnant !",
        message:
          "Tu as vraiment observé chaque détail. Rares sont ceux qui font attention à ce point.",
        emoji: "🏆",
      };
    } else if (pct >= 60) {
      return {
        title: "Pas mal !",
        message:
          "Tu as remarqué certains détails, mais d'autres t'ont échappé. L'attention est un muscle.",
        emoji: "👀",
      };
    } else if (pct >= 30) {
      return {
        title: "Le constat",
        message:
          "Tu as scrollé, cliqué, joué... mais tu n'as pas vraiment regardé. C'est normal. On fait tous ça.",
        emoji: "💭",
      };
    } else {
      return {
        title: "Révélation",
        message:
          "Tu as traversé toute l'expérience sans vraiment observer. Ces éléments étaient pourtant visibles. L'attention est précieuse – et rare.",
        emoji: "🪞",
      };
    }
  });

  return {
    // État
    currentQuestionIndex,
    answers,
    showHints,
    quizCompleted,
    quizStarted,
    selectedQuestions,

    // Computed
    currentQuestion,
    score,
    results,
    endMessage,

    // Méthodes
    initQuiz,
    submitAnswer,
    nextQuestion,
    showHint,
    isAnswerCorrect,
  };
}
