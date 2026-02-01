-- ==============================================
-- Configuration du Storage Supabase pour les avatars
-- À exécuter dans le SQL Editor de Supabase
-- ==============================================

-- 1. Créer le bucket "avatars" (si pas déjà fait via l'interface)
-- Note: La création de bucket se fait généralement via l'interface Supabase
-- Dashboard > Storage > New bucket > "avatars" (public: true)

-- 2. Policies pour le bucket avatars

-- Permettre à tout le monde de voir les avatars (bucket public)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Permettre aux utilisateurs authentifiés d'upload leur avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Permettre aux utilisateurs de mettre à jour leur propre avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Permettre aux utilisateurs de supprimer leur propre avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- ==============================================
-- Instructions manuelles:
-- 
-- 1. Allez dans Supabase Dashboard > Storage
-- 2. Cliquez sur "New bucket"
-- 3. Nom: "avatars"
-- 4. Cochez "Public bucket" (pour que les images soient accessibles)
-- 5. Cliquez sur "Create bucket"
-- 6. Exécutez les policies ci-dessus dans SQL Editor
--
-- Alternative via l'interface:
-- Storage > avatars > Policies > New policy
-- ==============================================
