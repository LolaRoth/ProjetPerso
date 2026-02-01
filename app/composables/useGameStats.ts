/**
 * Composable pour la gestion des statistiques de jeux
 * Appelle la RPC record_game_session et récupère les stats utilisateur
 */
import type {
  RecordGameSessionParams,
  LeaderboardEntry,
  GameId,
  Json,
} from "../../types/supabase";
import { authUser } from "./useAuth";

// Types simplifiés pour éviter les erreurs de type récursif Supabase
interface SimpleGameStats {
  id: string;
  user_id: string;
  game_id: string;
  total_plays: number;
  best_score: number | null;
  average_score: number | null;
  total_time_spent: number;
  last_played_at: string | null;
  metadata: Json;
}

interface SimpleGameSession {
  id: string;
  user_id: string;
  game_id: string;
  score: number | null;
  result_type: "win" | "lose" | "draw" | "abort" | null;
  degradation_level: number | null;
  loops: number | null;
  time_spent: number | null;
  extra: Json;
  created_at: string;
}

// Informations sur les jeux disponibles
export const GAMES_INFO: Record<
  GameId,
  { name: string; description: string; icon: string }
> = {
  "color-sequence": {
    name: "Séquence de Couleurs",
    description: "Mémorise et reproduis la séquence",
    icon: "🎨",
  },
  "click-challenge": {
    name: "Défi Clic",
    description: "Clique le plus vite possible",
    icon: "👆",
  },
  "puzzle-blocks": {
    name: "Puzzle Blocs",
    description: "Place les pièces au bon endroit",
    icon: "🧩",
  },
  "target-shooting": {
    name: "Tir sur Cibles",
    description: "Touche les cibles qui apparaissent",
    icon: "🎯",
  },
  "typing-game": {
    name: "Dactylographie",
    description: "Tape les mots le plus vite possible",
    icon: "⌨️",
  },
  "secret-button": {
    name: "Bouton Secret",
    description: "Tu as trouvé le bouton caché !",
    icon: "🔮",
  },
  "memory-game": {
    name: "Jeu de Mémoire",
    description: "Retrouve les paires de cartes",
    icon: "🧠",
  },
  "reaction-time": {
    name: "Temps de Réaction",
    description: "Teste tes réflexes",
    icon: "⚡",
  },
  "attention-quiz": {
    name: "Quiz d'Attention",
    description: "As-tu vraiment observé ?",
    icon: "👁️",
  },
};

interface UseGameStatsReturn {
  stats: Ref<SimpleGameStats[]>;
  sessions: Ref<SimpleGameSession[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  recordSession: (
    params: RecordGameSessionParams,
  ) => Promise<{ error: Error | null }>;
  fetchStats: () => Promise<void>;
  fetchSessions: (gameId?: GameId) => Promise<void>;
  fetchLeaderboard: (
    gameId: GameId,
    limit?: number,
  ) => Promise<LeaderboardEntry[]>;
  getStatsByGame: (gameId: GameId) => SimpleGameStats | undefined;
  getTotalPlays: ComputedRef<number>;
  getBestOverallScore: ComputedRef<number>;
  getAverageOverallScore: ComputedRef<number>;
}

export const useGameStats = (): UseGameStatsReturn => {
  // Utiliser directement la ref globale pour éviter la récursion de types
  const user = authUser;
  const isAuthenticated = computed(() => !!user.value);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getSupabase = (): any => {
    if (!import.meta.client) {
      return null;
    }
    const nuxtApp = tryUseNuxtApp();
    if (!nuxtApp?.$supabase) {
      return null;
    }
    return nuxtApp.$supabase;
  };

  const stats: Ref<SimpleGameStats[]> = shallowRef([]);
  const sessions: Ref<SimpleGameSession[]> = shallowRef([]);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  /**
   * Enregistre une session de jeu via la RPC record_game_session
   */
  const recordSession = async (
    params: RecordGameSessionParams,
  ): Promise<{ error: Error | null }> => {
    if (!isAuthenticated.value || !user.value) {
      return { error: new Error("Utilisateur non connecté") };
    }

    const supabase = getSupabase();
    if (!supabase) {
      return { error: new Error("Supabase non disponible") };
    }

    try {
      // Use JSON-wrapper RPC to avoid PostgREST schema matching issues
      const payload = {
        game_id: params.gameId,
        score: params.score,
        result_type: params.resultType,
        degradation_level: params.degradationLevel ?? 0,
        loops: params.loops ?? 0,
        time_spent: params.timeSpent ?? 0,
        extra: params.extra ?? {},
      };

      const { error: rpcError } = await supabase.rpc(
        "record_game_session_json",
        {
          payload,
        },
      );

      if (rpcError) {
        console.error(
          "Erreur lors de l'enregistrement de la session:",
          rpcError,
        );
        return { error: new Error(rpcError.message) };
      }

      // Rafraîchir les stats après enregistrement
      await fetchStats();
      return { error: null };
    } catch (err) {
      console.error("Erreur inattendue:", err);
      return { error: err as Error };
    }
  };

  /**
   * Récupère toutes les statistiques agrégées de l'utilisateur
   */
  const fetchStats = async (): Promise<void> => {
    if (!isAuthenticated.value || !user.value) {
      stats.value = [];
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("user_game_stats")
        .select("*")
        .eq("user_id", user.value.id);

      if (fetchError) {
        error.value = fetchError.message;
        return;
      }

      stats.value = data || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Erreur lors de la récupération";
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les sessions de jeu (historique)
   */
  const fetchSessions = async (gameId?: GameId): Promise<void> => {
    if (!isAuthenticated.value || !user.value) {
      sessions.value = [];
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    loading.value = true;
    error.value = null;

    try {
      let query = supabase
        .from("user_game_sessions")
        .select("*")
        .eq("user_id", user.value.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (gameId) {
        query = query.eq("game_id", gameId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        error.value = fetchError.message;
        return;
      }

      sessions.value = data || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Erreur lors de la récupération";
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère le leaderboard pour un jeu
   */
  const fetchLeaderboard = async (
    gameId: GameId,
    limit: number = 10,
  ): Promise<LeaderboardEntry[]> => {
    const supabase = getSupabase();
    if (!supabase) return [];

    try {
      const { data, error: rpcError } = await supabase.rpc("get_leaderboard", {
        p_game_id: gameId,
        p_limit: limit,
      });

      if (rpcError) {
        console.error("Erreur leaderboard:", rpcError);
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  };

  /**
   * Obtient les stats pour un jeu spécifique
   */
  const getStatsByGame = (gameId: GameId): SimpleGameStats | undefined => {
    const arr = stats.value;
    return arr.find((item) => item.game_id === gameId);
  };

  /**
   * Total de parties jouées (tous jeux confondus)
   */
  const totalPlays = computed<number>(() => {
    const arr = stats.value;
    return arr.reduce((sum, item) => sum + (item.total_plays || 0), 0);
  });

  /**
   * Meilleur score global (tous jeux confondus)
   */
  const bestOverallScore = computed<number>(() => {
    const arr = stats.value;
    const scores = arr
      .map((item) => item.best_score)
      .filter((score): score is number => score !== null);
    return scores.length > 0 ? Math.max(...scores) : 0;
  });

  /**
   * Moyenne des scores (tous jeux confondus)
   */
  const averageOverallScore = computed<number>(() => {
    const arr = stats.value;
    const validArr = arr.filter(
      (item) => item.average_score !== null && item.total_plays > 0,
    );
    if (validArr.length === 0) return 0;

    const totalWeightedScore = validArr.reduce(
      (sum, item) => sum + (item.average_score || 0) * item.total_plays,
      0,
    );
    const totalPlaysSum = validArr.reduce(
      (sum, item) => sum + item.total_plays,
      0,
    );

    return totalPlaysSum > 0
      ? Math.round(totalWeightedScore / totalPlaysSum)
      : 0;
  });

  return {
    stats,
    sessions,
    loading,
    error,
    recordSession,
    fetchStats,
    fetchSessions,
    fetchLeaderboard,
    getStatsByGame,
    getTotalPlays: totalPlays,
    getBestOverallScore: bestOverallScore,
    getAverageOverallScore: averageOverallScore,
  } as UseGameStatsReturn;
};
