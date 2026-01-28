# Intégration Supabase

Ce document explique comment configurer et utiliser l'intégration Supabase dans ce projet Nuxt 3.

## Configuration

### 1. Variables d'environnement

Copiez `.env.example` vers `.env` et remplissez vos clés Supabase :

```bash
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_clé_anon
```

### 2. Base de données Supabase

Exécutez les scripts SQL dans le SQL Editor de votre projet Supabase :

1. **Schema de base** : `supabase/schema.sql` - Crée les tables `profiles` et `user_results`
2. **Schema des jeux** : `supabase/schema_games.sql` - Crée le système de statistiques par jeu

Le script des jeux crée :

- Table `games` - Liste des jeux disponibles
- Table `user_game_sessions` - Historique détaillé de chaque partie
- Table `user_game_stats` - Statistiques agrégées par jeu et utilisateur
- Fonction `record_game_session_json` - Enregistre une session et met à jour les stats
- Fonction `get_leaderboard` - Récupère le classement d'un jeu

## Architecture

```
plugins/
  supabase.client.ts     # Initialisation du client Supabase

app/
  composables/
    useSupabase.ts       # Accès au client Supabase
    useAuth.ts           # Gestion authentification
    useGameStats.ts      # Gestion des statistiques par jeu

  middleware/
    auth.ts              # Protection des routes authentifiées
    guest.ts             # Redirection si déjà connecté

  pages/
    login.vue            # Page de connexion
    register.vue         # Page d'inscription
    profile.vue          # Page de profil avec statistiques par jeu

  components/
    layout/
      AuthHeader.vue     # Header avec état de connexion

types/
  supabase.ts            # Types TypeScript pour la DB
```

## Utilisation

### Authentification

```typescript
const { user, isAuthenticated, signIn, signUp, signOut } = useAuth();

// Inscription
await signUp("email@example.com", "password", "username");

// Connexion
await signIn("email@example.com", "password");

// Déconnexion
await signOut();

// Vérifier si connecté
if (isAuthenticated.value) {
  console.log("Utilisateur connecté:", user.value?.email);
}
```

### Statistiques de jeux

```typescript
const {
  stats,
  sessions,
  recordSession,
  fetchStats,
  fetchSessions,
  getStatsByGame,
  getTotalPlays,
  getBestOverallScore,
} = useGameStats();

// Enregistrer une session de jeu
await recordSession({
  gameId: "target-shooting",
  score: 150,
  resultType: "win",
  degradationLevel: 45,
  timeSpent: 30,
  extra: { maxCombo: 5, accuracy: 85 },
});

// Récupérer les stats de tous les jeux
await fetchStats();

// Récupérer l'historique des sessions
await fetchSessions("target-shooting"); // filtre par jeu
await fetchSessions(); // toutes les sessions

// Statistiques
const targetStats = getStatsByGame("target-shooting");
console.log(`Meilleur score: ${targetStats?.best_score}`);
console.log(`Parties jouées: ${targetStats?.total_plays}`);
```

### Protection des routes

Utilisez le middleware `auth` pour protéger une page :

```vue
<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});
</script>
```

Utilisez le middleware `guest` pour les pages accessibles uniquement aux non-connectés :

```vue
<script setup lang="ts">
definePageMeta({
  middleware: ["guest"],
});
</script>
```

## Jeux disponibles

| ID                | Nom                  | Description                         |
| ----------------- | -------------------- | ----------------------------------- |
| `color-sequence`  | Séquence de Couleurs | Mémorise et reproduis la séquence   |
| `click-challenge` | Défi Clic            | Clique le plus vite possible        |
| `puzzle-blocks`   | Puzzle Blocs         | Place les pièces au bon endroit     |
| `target-shooting` | Tir sur Cibles       | Touche les cibles qui apparaissent  |
| `typing-game`     | Dactylographie       | Tape les mots le plus vite possible |

## Pages disponibles

- `/` - Page d'accueil (expérience interactive avec mini-jeux)
- `/login` - Connexion
- `/register` - Inscription
- `/profile` - Profil utilisateur avec statistiques par jeu (protégé)

## Notes importantes

1. **Session persistante** : La session est automatiquement persistée dans le localStorage
2. **RLS activé** : Row Level Security est activé sur toutes les tables
3. **Auto-refresh** : Les tokens sont automatiquement rafraîchis
4. **Trigger profil** : Un profil est automatiquement créé à l'inscription via trigger SQL
5. **Stats automatiques** : Les statistiques sont mises à jour automatiquement via la fonction RPC

## Dépannage

### Les statistiques ne s'enregistrent pas

1. Vérifiez que vous êtes connecté (l'enregistrement ne fonctionne que pour les utilisateurs authentifiés)
2. Exécutez le script `supabase/schema_games.sql` dans le SQL Editor de Supabase
3. Vérifiez les logs de la console du navigateur pour les erreurs RPC
4. Assurez-vous que les tables `games`, `user_game_sessions` et `user_game_stats` existent

### Erreur "User not authenticated"

Cette erreur signifie que l'utilisateur n'est pas connecté. Les statistiques ne sont enregistrées que pour les utilisateurs authentifiés.

### Erreur "relation does not exist"

Exécutez les scripts SQL dans l'ordre :

1. `supabase/schema.sql`
2. `supabase/schema_games.sql`
