-- ==============================================
-- Script SQL pour Supabase
-- À exécuter dans le SQL Editor de Supabase
-- ==============================================

-- 1. Table profiles (liée à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table user_results (résultats de l'expérience)
CREATE TABLE IF NOT EXISTS public.user_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  degradation_level INTEGER NOT NULL,
  loops INTEGER NOT NULL,
  time_spent INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Activer Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_results ENABLE ROW LEVEL SECURITY;

-- 4. Policies pour profiles
-- Lecture: les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Insertion: les utilisateurs peuvent créer leur propre profil
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Mise à jour: les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 5. Policies pour user_results
-- Lecture: les utilisateurs peuvent voir leurs propres résultats
CREATE POLICY "Users can view own results"
  ON public.user_results
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insertion: les utilisateurs peuvent ajouter leurs propres résultats
CREATE POLICY "Users can insert own results"
  ON public.user_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_results_user_id ON public.user_results(user_id);
CREATE INDEX IF NOT EXISTS idx_user_results_created_at ON public.user_results(created_at DESC);

-- 7. (Optionnel) Fonction pour créer automatiquement un profil à l'inscription
-- Cette fonction est appelée via un trigger après l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger (si pas déjà existant)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
