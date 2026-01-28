-- ==============================================
-- Script SQL pour Supabase - Système de Jeux
-- À exécuter dans le SQL Editor de Supabase
-- Version avec statistiques par jeu
-- ==============================================

-- 1. Table des jeux disponibles
CREATE TABLE IF NOT EXISTS public.games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table des sessions de jeu (historique détaillé)
CREATE TABLE IF NOT EXISTS public.user_game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  score INTEGER,
  result_type TEXT CHECK (result_type IN ('win', 'lose', 'draw', 'abort')),
  degradation_level INTEGER DEFAULT 0,
  loops INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table des statistiques agrégées par jeu (mise à jour automatique)
CREATE TABLE IF NOT EXISTS public.user_game_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_id TEXT REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  total_plays INTEGER DEFAULT 0,
  best_score INTEGER,
  average_score NUMERIC(10,2),
  total_time_spent INTEGER DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, game_id)
);

-- 4. Activer Row Level Security (RLS)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_stats ENABLE ROW LEVEL SECURITY;

-- 5. Policies pour games (lecture publique)
CREATE POLICY "Games are viewable by everyone"
  ON public.games
  FOR SELECT
  USING (true);

-- 6. Policies pour user_game_sessions
CREATE POLICY "Users can view own game sessions"
  ON public.user_game_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game sessions"
  ON public.user_game_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. Policies pour user_game_stats
CREATE POLICY "Users can view own game stats"
  ON public.user_game_stats
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game stats"
  ON public.user_game_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game stats"
  ON public.user_game_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_game_sessions_user_id ON public.user_game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_sessions_game_id ON public.user_game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_user_game_sessions_created_at ON public.user_game_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_user_id ON public.user_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_game_id ON public.user_game_stats(game_id);

-- 9. Insérer les jeux disponibles
INSERT INTO public.games (id, name, description, category) VALUES
  ('color-sequence', 'Séquence de Couleurs', 'Mémorise et reproduis la séquence', 'memory'),
  ('click-challenge', 'Défi Clic', 'Clique le plus vite possible', 'reflex'),
  ('puzzle-blocks', 'Puzzle Blocs', 'Place les pièces au bon endroit', 'puzzle'),
  ('target-shooting', 'Tir sur Cibles', 'Touche les cibles qui apparaissent', 'reflex'),
  ('typing-game', 'Dactylographie', 'Tape les mots le plus vite possible', 'speed')
ON CONFLICT (id) DO NOTHING;

-- 10. Fonction pour enregistrer une session de jeu (version JSON)
CREATE OR REPLACE FUNCTION public.record_game_session_json(payload JSONB)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_game_id TEXT;
  v_score INTEGER;
  v_result_type TEXT;
  v_degradation_level INTEGER;
  v_loops INTEGER;
  v_time_spent INTEGER;
  v_extra JSONB;
  v_current_stats RECORD;
  v_new_total_plays INTEGER;
  v_new_best_score INTEGER;
  v_new_average_score NUMERIC(10,2);
  v_new_total_time INTEGER;
BEGIN
  -- Récupérer l'ID de l'utilisateur connecté
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Extraire les valeurs du payload JSON
  v_game_id := payload->>'game_id';
  v_score := COALESCE((payload->>'score')::INTEGER, 0);
  v_result_type := payload->>'result_type';
  v_degradation_level := COALESCE((payload->>'degradation_level')::INTEGER, 0);
  v_loops := COALESCE((payload->>'loops')::INTEGER, 0);
  v_time_spent := COALESCE((payload->>'time_spent')::INTEGER, 0);
  v_extra := COALESCE(payload->'extra', '{}'::JSONB);

  -- Insérer la session de jeu
  INSERT INTO public.user_game_sessions (
    user_id, game_id, score, result_type, 
    degradation_level, loops, time_spent, extra
  ) VALUES (
    v_user_id, v_game_id, v_score, v_result_type,
    v_degradation_level, v_loops, v_time_spent, v_extra
  );

  -- Récupérer les stats actuelles
  SELECT total_plays, best_score, average_score, total_time_spent
  INTO v_current_stats
  FROM public.user_game_stats
  WHERE user_id = v_user_id AND game_id = v_game_id;

  -- Calculer les nouvelles stats
  IF v_current_stats IS NULL THEN
    -- Première partie pour ce jeu
    v_new_total_plays := 1;
    v_new_best_score := v_score;
    v_new_average_score := v_score::NUMERIC;
    v_new_total_time := v_time_spent;
  ELSE
    -- Mise à jour des stats existantes
    v_new_total_plays := v_current_stats.total_plays + 1;
    v_new_best_score := GREATEST(COALESCE(v_current_stats.best_score, 0), v_score);
    v_new_average_score := (
      (COALESCE(v_current_stats.average_score, 0) * v_current_stats.total_plays) + v_score
    ) / v_new_total_plays;
    v_new_total_time := COALESCE(v_current_stats.total_time_spent, 0) + v_time_spent;
  END IF;

  -- Upsert dans user_game_stats
  INSERT INTO public.user_game_stats (
    user_id, game_id, total_plays, best_score, 
    average_score, total_time_spent, last_played_at
  ) VALUES (
    v_user_id, v_game_id, v_new_total_plays, v_new_best_score,
    v_new_average_score, v_new_total_time, NOW()
  )
  ON CONFLICT (user_id, game_id) DO UPDATE SET
    total_plays = v_new_total_plays,
    best_score = v_new_best_score,
    average_score = v_new_average_score,
    total_time_spent = v_new_total_time,
    last_played_at = NOW();
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Fonction pour obtenir le leaderboard d'un jeu
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_game_id TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ugs.user_id,
    COALESCE(p.username, 'Anonyme') as username,
    ugs.best_score as score,
    ugs.last_played_at as created_at
  FROM public.user_game_stats ugs
  JOIN public.profiles p ON p.id = ugs.user_id
  WHERE ugs.game_id = p_game_id
    AND ugs.best_score IS NOT NULL
  ORDER BY ugs.best_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Donner les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.record_game_session_json(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(TEXT, INTEGER) TO anon;
