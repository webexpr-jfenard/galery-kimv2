# Changelog - 14 mars 2026

## Ce qui a été fait

### 1. Filtre par personne sur la page Sélection
- **Fichier**: `components/FavoritesPage.tsx`
- Ajout d'un dropdown pour filtrer les favoris par utilisateur (admin uniquement)
- Affiche le nom de chaque utilisateur + nombre de favoris
- Badge cliquable pour retirer le filtre
- Visible uniquement quand il y a 2+ utilisateurs

### 2. Audit complet du projet
Audit des 4 domaines : admin, partage, favoris/commentaires, email.
Rapport sauvegardé dans `docs/plans/2026-03-14-audit-fixes.md`.

### 3. Sécurité admin (`services/authService.ts`)
- Mot de passe admin lu depuis `VITE_ADMIN_PASSWORD` (env var) au lieu de hardcoded `admin123`
- Support mot de passe custom via `changeAdminPassword()` (persiste dans localStorage)
- Rate limiting : 5 tentatives max, lockout 15 minutes
- Route `/admin/quote-calculator` protégée par auth (`App.tsx`)

### 4. Sécurité email
- **`api/send-gmail-final.js`** : ajout auth Bearer token (`GMAIL_API_SECRET`)
- **`services/gmailService.ts`** : envoi du token dans les requêtes
- **`services/selectionService.ts`** : suppression du hardcoded `redlerkim@gmail.com`, utilise la config Gmail sauvegardée

### 5. Base de données
- **`SUPABASE_TABLE_SETUP.sql`** : ajout colonnes `user_id`, `user_name` aux tables `favorites` et `comments` + colonnes `category`, `featured_photo_url`, `featured_photo_id` à `galleries`
- **`supabase/migrations/add_user_columns.sql`** : migration pour DB existante (ALTER TABLE + indexes + contrainte unique)
- Contrainte unique mise à jour : `(gallery_id, photo_id, user_id)` au lieu de `(gallery_id, photo_id, device_id)`

### 6. Corrections de bugs
- **`services/favoritesService.ts`** : suppression de commentaires filtre par `user_id` au lieu de `device_id`
- **`services/favoritesService.ts`** : champs snake_case (`photo_id`, `user_id`, etc.) rendus optionnels dans l'interface `FavoritePhoto`
- **`services/selectionService.ts`** : accès aux champs en camelCase (`userId`, `photoId`, `userName`) au lieu de snake_case
- **`services/selectionService.ts`** : fix `clearSelection()` qui attendait un objet alors que `clearAllFavorites()` retourne un boolean

### 7. Performance
- **`components/FavoritesPage.tsx`** : `useMemo` sur `favoritePhotos` et `filteredFavoritePhotos`
- Utilisation de `Set` pour lookups O(1) au lieu de `Array.some()` O(n)

### 8. Configuration projet
- **`CLAUDE.md`** créé avec toutes les infos projet
- **`.mcp.json`** configuré pour connexion MCP Supabase directe
- **`.gitignore`** : ajout `.mcp.json`

---

## Ce qu'il reste à faire

### Critique - Migration DB
- [ ] **Exécuter la migration SQL** sur Supabase (dans SQL Editor ou via MCP après restart Claude Code)
  - Fichier : `supabase/migrations/add_user_columns.sql`
  - Sans ça, les colonnes `user_id`/`user_name` n'existent pas en DB et le filtrage par personne ne fonctionnera pas

### Important - Variables d'environnement
- [ ] **Définir `VITE_ADMIN_PASSWORD`** dans `.env.local` pour remplacer le fallback `admin123`
- [ ] **Définir `GMAIL_API_SECRET`** dans Vercel env vars ET `.env.local` (`VITE_GMAIL_API_SECRET`) pour activer la protection de l'API email
- [ ] **Configurer l'email photographe** dans l'app (Gmail Config Dialog) pour ne plus dépendre du fallback `redlerkim@gmail.com`

### Recommandé - Sécurité
- [ ] Appliquer le flag `isPublic` des galeries (actuellement non appliqué — une galerie "privée" reste accessible si on connaît l'ID)
- [ ] Ajouter des foreign keys avec `ON DELETE CASCADE` entre `galleries` → `favorites`/`comments`
- [ ] Renforcer les RLS policies Supabase (actuellement `FOR ALL USING (true)`)
- [ ] Hasher les mots de passe des galeries en DB (actuellement en clair)

### Nice to have
- [ ] Consolider les 4 services email en un seul (emailService, gmailService, smtpEmailService, resendEmailService)
- [ ] Implémenter le tracking `viewCount` sur les galeries
- [ ] Ajouter des dates d'expiration sur les galeries
- [ ] Ajouter un audit log des actions admin
- [ ] Nettoyer `commentsService.ts` (legacy, deprecated)
- [ ] Supprimer `send-gmail.js` et `send-gmail-simple.js` (alternatives non utilisées)
