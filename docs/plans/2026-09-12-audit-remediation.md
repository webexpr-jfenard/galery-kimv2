# Audit 2026-09-12 — plan de remédiation et consignes de sélection

> Rapport source : audit du 12/09/2026 (artifact « Audit Galerie Kim »).
> Décisions validées par Jeremy : quota = avertissement seulement ; modèles de consignes éditables dans une page admin ; rendu client aux couleurs du visuel de Kim ; toutes les recommandations sont à appliquer.

**Objectif :** remettre la sécurité côté serveur, nettoyer données et storage, corriger les bugs visibles, accélérer la galerie, supprimer le code mort, puis livrer les consignes de sélection par galerie.

**Architecture cible :**
- Admin authentifié par Supabase Auth (e-mail + mot de passe). Table `admin_users` listant les comptes autorisés ; toutes les politiques d'écriture (tables et storage) vérifient `auth.uid()` ∈ `admin_users`. Plus aucun secret dans le bundle.
- Identité visiteur = jeton secret aléatoire gardé dans le navigateur, envoyé en en-tête `x-user-token` ; `user_id` = SHA-256 du jeton. Les politiques INSERT/UPDATE/DELETE de `favorites` et `comments` comparent `user_id` au hash de l'en-tête. Personne ne peut écrire ou effacer au nom d'un autre.
- E-mail : l'endpoint ne reçoit que des champs structurés, construit le message et l'envoie à une adresse fixée côté serveur, avec le fichier de sélection en pièce jointe. Rien n'est stocké dans le bucket.
- Photos : `photos.bucket_path`, `thumbnail_url`, `width`, `height` alimentés à l'upload ; vignettes générées dans le navigateur (les transformations Supabase ne sont pas disponibles sur ce plan). Suppression par lot depuis la table.
- Consignes : `instruction_templates` (3 modèles, éditables dans `#/admin/instructions`) et `galleries.instructions` (copie éditable par galerie, `null` = désactivé).

**Actions manuelles à faire par Jeremy** (le code les suppose faites) :
1. Supabase → Authentication → Users → « Add user » : e-mail de Kim (+ celui de Jeremy), mot de passe, « Auto confirm ». Puis me donner les e-mails pour les inscrire dans `admin_users`.
2. Supabase → Authentication → Providers → Email : désactiver « Enable email signups » (les comptes sont créés à la main).
3. Vercel → variables : `NOTIFY_TO` (adresse qui reçoit les sélections, sinon `GMAIL_USER`), supprimer `VITE_ADMIN_SECRET`, `VITE_ADMIN_PASSWORD`, `VITE_GMAIL_API_SECRET`, `GMAIL_API_SECRET` devenus inutiles.
4. Supabase → Settings → Infrastructure : appliquer la mise à jour Postgres.

---

## Vague 1 — base, nettoyage, bugs (parallèle)

### T1 · Migration `security_foundation` (Claude, MCP)
- `admin_users(user_id uuid pk references auth.users, email text, created_at)` avec RLS (lecture : `user_id = auth.uid()`).
- Fonction `public.is_admin_user()` (`security invoker`, `stable`) = `exists(select 1 from admin_users where user_id = auth.uid())`.
- Fonction `public.request_user_id()` = `encode(digest(header x-user-token, 'sha256'), 'hex')` ou `null` si absent.
- Politiques galleries/photos : écriture = `is_admin() OR is_admin_user()` (transition), lecture inchangée.
- Politiques favorites/comments : INSERT `with_check (user_id = request_user_id() or is_admin_user())`, UPDATE/DELETE `using (user_id = request_user_id() or is_admin_user())`, SELECT `true`.
- Storage : supprimer la politique INSERT anon ; INSERT/UPDATE/DELETE sur bucket `photos` pour `is_admin_user()` ; conserver les lectures publiques.
- `revoke execute on function is_admin() from anon, authenticated`.
- Colonnes : `photos.bucket_path text`, `photos.thumbnail_url text`, `photos.width int`, `photos.height int` ; backfill `bucket_path = bucket_folder || '/' || name` pour les lignes existantes.
- Purge : `delete from favorites/comments where gallery_id not in (select id from galleries)` (100 % orphelins vérifiés), puis FK `on delete cascade` sur les deux tables.
- Trigger `photos_sync_gallery_count` maintenant `galleries.photo_count`.
- Suppression des index inutilisés sur `device_id`.
- `instruction_templates(id text pk, name text, sort_order int, content jsonb, updated_at)` (lecture publique, écriture admin) + `galleries.instructions jsonb`.
- `gallery_secrets(gallery_id text pk references galleries on delete cascade, password_hash text)` sans politique ; RPC `set_gallery_password(gallery_id, password)` (admin) et `verify_gallery_password(gallery_id, password)` (public, `security definer`) ; `galleries.has_password boolean` maintenu par les RPC ; backfill depuis `galleries.password` puis colonne mise à `null`.

Vérification : `pg_policies`, advisors sécurité, `select count(*)` orphelins = 0.

### T2 · Purge du storage (Claude)
- Politique DELETE temporaire pour `anon` limitée aux préfixes `gallery-9b2xjgs/`, `gallery-kr04fmi/`, `gallery-8eyf60n/`, `selections/`.
- Script Node (clé anon) : `storage.from('photos').remove()` par lots de 100 sur la liste issue de SQL (711 objets).
- Suppression de la politique temporaire ; vérification `count(*)` par dossier.

### T3 · Code mort et garde-fous (sous-agent, fichiers disjoints)
- Supprimer : `components/AdminPanel.tsx`, `GalleryCard.tsx`, `EmailConfigDialog.tsx`, `ApiConfiguration.tsx`, `FavoritePhotoItem.tsx`, `PhotoItem.tsx`, `SupabaseConfig.tsx`, `components/figma/`, les trois `*.backup.tsx`, `services/emailService.ts`, `resendEmailService.ts`, `smtpEmailService.ts`, `storageService.ts`, `commentsService.ts`, `api/send-gmail.js`, `api/send-gmail-simple.js`, `add-category-column.cjs`, `debug-storage.js`, `masonry.js` (après vérification de `index.html`), `public/KimRedler_photo.png`, les `components/ui/*` qui importent des paquets absents.
- Archiver dans `docs/archive/` : `API_SETUP_GUIDE.md`, `DATABASE_SETUP_GUIDE.md`, `GET_API_KEY.md`, `QUICK_START_SUPABASE.md`, `SMTP_OVH_SETUP.md`, `SUPABASE_SETUP_GUIDE.md`, `SUPABASE_SETUP.md`, `TROUBLESHOOTING.md`, `SUPABASE_ADD_CATEGORY.sql`, `SUPABASE_FOLDERS_UPDATE.sql`.
- `git rm --cached` : `dist/index.html`, `.DS_Store`, `node_modules/.package-lock.json`.
- `tsconfig.json` : `"types": ["vite/client"]` ; `package.json` : script `typecheck` (`tsc --noEmit`) et `build` = `npm run typecheck && vite build` une fois les erreurs à zéro ; `vite.config.ts` : `esbuild: { drop: ['console', 'debugger'] }` en production.
- `styles/globals.css` : retirer la syntaxe Tailwind v4 (`@custom-variant`, `@theme inline`), corriger le sélecteur de la ligne 151.

Vérification : `npm run typecheck` sans erreur, `npm run build` sans avertissement CSS.

### T4 · Bugs visibles (sous-agent, fichiers disjoints)
- `components/SelectionSubmitButton.tsx:64` : `f.userId`.
- `components/PhotoManager.tsx:909` : `uploadedAt`.
- `components/QuoteCalculator.tsx:1580-1659` : renommer le paramètre du `map` pour ne plus masquer `quote`.
- `components/FavoritesPage.tsx:430-450` : « Tout effacer » réservé à l'admin ; bouton visiteur « Effacer ma sélection » (`favoritesService.clearUserFavorites(galleryId, userId)` à créer, DELETE filtré `user_id`).
- Deux `alert()` de `SubfolderSelector.tsx` → `toast.error`.
- `onKeyPress` → `onKeyDown` (8 occurrences).

---

## Vague 2 — authentification, identité, e-mail (Claude)

### T5 · Supabase Auth côté client
- `services/authService.ts` réécrit : `init()`, `signIn(email, password)`, `signOut()`, `isAdminAuthenticated()`, `getSessionInfo()`, `onChange(cb)`, `resetPassword(email)`. Session gérée par supabase-js.
- `services/supabaseService.ts` : un seul client, `global.fetch` qui injecte `x-user-token` depuis `userService` ; suppression de `enableAdminMode` / `x-admin-secret`.
- `components/AuthDialog.tsx` : mode admin = e-mail + mot de passe + lien « mot de passe oublié ».
- `App.tsx` : attente de `authService.init()` avant le rendu des routes admin ; `React.lazy` sur l'admin et le calculateur.
- `components/admin/AdminPanel.tsx` : bouton Déconnexion → `signOut()`, affichage de l'e-mail.
- Supprimer `changeAdminPassword`, `extendSession`, `VITE_ADMIN_*`.

### T6 · Identité visiteur
- `services/userService.ts` : session `{ token, userId (sha256 hex), userName, deviceId, createdAt }` ; `createSession` asynchrone (Web Crypto) ; migration des sessions sans jeton (nouveau jeton, même nom).
- `services/favoritesService.ts` : suppression des replis localStorage et de la migration legacy ; `clearUserFavorites` ; `clearAllFavorites` réservé à l'admin.
- En-tête visible : prénom + « ce n'est pas moi » (`clearSession`) dans `PhotoGallery.tsx`.

### T7 · E-mail sûr par construction
- `api/send-gmail-final.js` renommé `api/notify-selection.js` : body `{ galleryId, galleryName, userName, userEmail?, selectionType, photoCount, fileName, textContent }` ; destinataire `NOTIFY_TO || GMAIL_USER` ; sujet et HTML construits côté serveur (échappement) ; pièce jointe `textContent` ; limite 30 requêtes / 10 min par IP (mémoire) ; TLS strict ; `textContent` ≤ 200 kB.
- `services/gmailService.ts` : `notifySelection(payload)` ; suppression de `photographerEmail`.
- `services/selectionService.ts` : plus d'upload storage ; retour `{ success, notified: boolean, fileName, blobUrl }` ; échec de notification remonté.
- `components/SelectionSubmitButton.tsx` : état « fichier prêt, notification non partie » avec bouton Télécharger.
- `components/GmailConfigDialog.tsx` : plus de champ destinataire ; bouton « envoyer un e-mail de test » (endpoint avec `test: true`, admin authentifié requis côté client).

---

## Vague 3 — storage, vignettes, performance

### T8 · Upload et suppression
- `galleryService.uploadPhotos` : vignette canvas (largeur 900, JPEG 0.8) vers `${bucketFolder}/thumbs/${subfolder/}${cleanName}.jpg`, dimensions lues, insertion de `bucket_path`, `thumbnail_url`, `width`, `height`.
- `deletePhoto` / `deleteAllPhotos` / `deleteGallery` : suppression par lot des `bucket_path` et vignettes listés en base ; `supabaseService.deleteFile` retourne `notFound` distinct de `success`.
- `PhotoManager.tsx` : bouton « Générer les vignettes manquantes » (traite les photos sans `thumbnail_url`).

### T9 · Affichage et requêtes
- Helper `photoSrc(photo, 'grid' | 'full')` ; grilles, listes et comparaison en vignette ; lightbox en original.
- `checkDatabaseHealth` mémorisé (une sonde par session) ; `getGallery` avec cache 5 s invalidé par les écritures.
- `PhotoGallery.tsx` : favoris optimistes (Sets locaux, rechargement seulement sur erreur) ; `Map` id→index et id→comptes calculées une fois par rendu ; `aspect-ratio` depuis `width/height`.
- `admin/AdminPanel.tsx` : statistiques via une seule requête `photos` groupée.
- `getPhotos` : `.range()` par pages de 500 jusqu'à épuisement.

---

## Vague 4 — consignes de sélection

### T10 · Données et modèles
- Seed `instruction_templates` : `portrait-single`, `portrait-multi`, `reportage` avec les textes du visuel de Kim.
- `services/instructionsService.ts` : types `Instructions`, `InstructionStep`, `listTemplates`, `saveTemplate`, `getGalleryInstructions`, `saveGalleryInstructions`.

### T11 · Admin
- Page `#/admin/instructions` : liste des modèles, éditeur (nom, encart, étapes avec icône et ordre, aide, quota par défaut), aperçu.
- Onglet « Consignes » dans `components/admin/GalleryEditDialog` : activé/désactivé, choix du modèle (copie), mêmes blocs éditables, quota, aperçu.

### T12 · Client
- `components/InstructionsPanel.tsx` : rendu aux couleurs du visuel (crème `#F5F0E7`, doré `#B8965A`, bleu nuit `#1F2A44`), boutons « J'ai compris » / « Voir les photos ».
- `PhotoGallery.tsx` : ouverture automatique une fois par galerie et par navigateur (`localStorage`), bouton « Consignes » dans l'en-tête, compteur « n / quota » et avertissement (sans blocage) dans la boîte Soumettre.

---

## Vague 5 — mots de passe de galerie, finitions, déploiement

### T13 · Mots de passe de galerie
- `galleryService.authenticateGallery` via RPC `verify_gallery_password` ; admin via `set_gallery_password` ; `needsPassword = gallery.hasPassword`.
- Retirer le champ « publique » des dialogues (drapeau sans effet).

### T14 · Finitions
- `aria-label` sur les boutons icône du parcours client ; mosaïque en `grid` ; fond d'accueil en deux tailles ; métadonnées `index.html` (favicon, description) ; toasts en thème clair ; libellé racine unique `Photos principales`.
- `SECURITY.md` et `CLAUDE.md` réécrits ; `SUPABASE_TABLE_SETUP.sql` aligné.

### T15 · Bascule et vérification
- Vérifier la connexion admin de Kim et Jeremy en production.
- Migration `security_finalize` : politiques sans `is_admin()`, suppression de la fonction et de `app_config`.
- Contrôle : advisors sécurité, `curl` sans jeton sur l'endpoint e-mail (403), tentative de DELETE favoris avec la clé anon (0 ligne), bundle sans secret.

---

## Statut (12 septembre 2026, soir)

**Fait (commit local, pas encore déployé)** : T1 (migrations `security_foundation`, `data_model_audit_2026_09`, `admin_policies_transition`, `storage_policies_admin`), T2 (711 objets purgés, 262 Mo), T3, T4, T5, T6 (code ; politiques dans `supabase/migrations/visitor_identity_policies.sql`), T7, T8, T9 (sauf virtualisation), T10, T11, T12, T13, T14 (aria-labels, favicon, métadonnées, libellé racine).

**Vérifié en local** : galerie Viparis sans erreur console, panneau de consignes sur la galerie test, cycle favori (prénom → cœur → retrait) avec `user_id` = SHA-256 du jeton, écran de connexion admin. Build : bundle client 163 kB (au lieu de 732 kB), typecheck à zéro erreur.

**Reste, dans l'ordre**
1. Jeremy : créer les comptes admin (Supabase → Authentication → Users → Add user, auto-confirm), désactiver les inscriptions, définir `NOTIFY_TO` sur Vercel.
2. Claude : `insert into admin_users`, appliquer `visitor_identity_policies.sql`, pousser `main` (déploiement Vercel), vérifier la connexion admin en production, appliquer `security_finalize.sql`, contrôles finaux (endpoint e-mail 400 sans envoi, DELETE anon = 0 ligne, bundle sans secret).
3. Jeremy : supprimer `VITE_ADMIN_SECRET`, `VITE_ADMIN_PASSWORD`, `VITE_GMAIL_API_SECRET`, `GMAIL_API_SECRET` sur Vercel ; appliquer la mise à jour Postgres.
4. Admin : bouton « Vignettes » dans Gérer les photos de la galerie Viparis (génère les 308 vignettes manquantes depuis le navigateur).
5. Plus tard : virtualisation de la grille, mosaïque en `grid` (nécessite un calcul JS), montée de version Vite/React.
