# Galerie Kim v2

Application de galerie photo professionnelle pour la photographe Kim Redler. Permet de partager des galeries avec des clients, qui peuvent sélectionner leurs photos favorites et laisser des commentaires.

## Stack technique

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **UI**: Radix UI primitives + shadcn/ui components + Lucide icons
- **Backend**: Supabase (PostgreSQL + Storage + RLS + Auth pour l'admin)
- **Hosting**: Vercel (SPA + serverless functions)
- **Email**: Gmail SMTP via nodemailer (Vercel serverless)
- **Routing**: Hash-based SPA routing (`#/gallery/xxx`, `#/admin`, etc.)

## Supabase

- **Project ID**: `ugfkyfmthbwqoeauyqlz`
- **URL**: `https://ugfkyfmthbwqoeauyqlz.supabase.co`
- **MCP Server**: `supabase-galery-kim` (configuré dans `.mcp.json`)
- **Tables**: `galleries`, `photos`, `favorites`, `comments`, `instruction_templates`, `admin_users`, `gallery_secrets`, `app_config` (legacy)
- **Storage bucket**: `photos` (public en lecture ; originaux dans `gallery-<id>/`, vignettes dans `gallery-<id>/thumbs/`)
- **Schema SQL de référence**: `SUPABASE_TABLE_SETUP.sql`
- **Migrations**: `supabase/migrations/` (appliquées via le MCP `apply_migration`)
- **Sécurité**: voir `SECURITY.md` (RLS, `is_admin_user()`, `request_user_id()`, mots de passe hachés)

## Architecture

### Routes (hash-based dans App.tsx)
| Route | Composant | Auth |
|-------|-----------|------|
| `/` | HomePage | Non |
| `/gallery/{id}` | PhotoGallery | Mot de passe galerie (optionnel, vérifié par RPC) |
| `/favorites/{id}` | FavoritesPage | Non |
| `/admin` | AdminPanel (chargé à la demande) | Supabase Auth + `admin_users` |
| `/admin/quote-calculator` | QuoteCalculator (via AdminPanel) | idem |

### Services (`services/`)
| Service | Rôle |
|---------|------|
| `authService.ts` | Session admin Supabase Auth (`signIn`, `signOut`, `whenReady`, `onChange`, réinitialisation de mot de passe) |
| `supabaseService.ts` | Client Supabase unique ; injecte `x-user-token` dans chaque requête ; helpers storage |
| `userService.ts` | Identité visiteur : jeton secret + `userId = sha256(jeton)`, prénom, `deviceId` |
| `galleryService.ts` | CRUD galeries + photos, arbre de dossiers, upload avec vignettes, suppression storage, mots de passe (RPC) |
| `favoritesService.ts` | Favoris + commentaires (Supabase uniquement) |
| `selectionService.ts` | Export texte de la sélection + notification e-mail (pièce jointe) |
| `gmailService.ts` | Appel de `/api/notify-selection` |
| `instructionsService.ts` | Modèles et consignes de sélection |
| `imageService.ts` | Vignettes côté navigateur, `photoSrc()`, `thumbnailPathFor()` |

### Composants principaux (`components/`)
| Composant | Rôle |
|-----------|------|
| `admin/AdminPanel.tsx` | Panel admin (galeries, upload, stats, réglages, consignes) — **le seul AdminPanel** |
| `admin/AdminLogin.tsx` | Connexion e-mail + mot de passe, mot de passe oublié, récupération |
| `admin/InstructionsPage.tsx` / `InstructionsEditor.tsx` | Modèles de consignes et éditeur partagé |
| `PhotoGallery.tsx` | Vue galerie client (masonry, dossiers/groupes, favoris, commentaires, consignes) |
| `PhotoManager.tsx` | Gestion des photos d'une galerie (dossiers, groupes, vignettes manquantes) |
| `FavoritesPage.tsx` | Page sélection (filtre par personne pour l'admin) |
| `GalleryEditDialog.tsx` | Édition galerie (mot de passe, catégorie, consignes) |
| `InstructionsPanel.tsx` | Consignes affichées au client (charte du visuel de Kim) |
| `SelectionSubmitButton.tsx` | Envoi de la sélection + état de la notification |
| `Lightbox.tsx`, `ComparisonModal.tsx`, `AuthDialog.tsx`, `UserNameDialog.tsx` | Visionneuse, comparaison, mot de passe galerie, identification |

### API Serverless (`api/`)
| Endpoint | Rôle |
|----------|------|
| `notify-selection.js` | Notifie la photographe (destinataire fixé côté serveur, pièce jointe, limite de débit). `{ test: true }` envoie un e-mail de test. |

## Commandes

```bash
npm run dev        # Serveur de dev Vite
npm run typecheck  # tsc --noEmit (doit rester à zéro erreur)
npm run build      # Build production (console.* supprimés)
npm run preview    # Preview du build
```

## Variables d'environnement

### `.env.local` (frontend - Vite)
```
VITE_SUPABASE_URL=https://ugfkyfmthbwqoeauyqlz.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### Vercel (serverless functions)
```
GMAIL_USER=...            # Adresse Gmail expéditrice
GMAIL_APP_PASSWORD=...    # App password Gmail (2FA requis)
NOTIFY_TO=...             # Destinataire des sélections (optionnel, sinon GMAIL_USER)
SITE_URL=...              # Optionnel, URL publique pour les liens dans les e-mails
```

## GitHub

- **Repo**: `webexpr-jfenard/galery-kimv2`
- **Compte GitHub actif**: `webexpr-jfenard` (switcher avec `gh auth switch`)
- **Branche principale**: `main` (déploiement Vercel automatique)

## Conventions

- Français pour l'UI, anglais pour le code
- Services singleton exportés (`export const xxxService = new XxxService()`)
- Toast notifications via `sonner`
- Pas de tests automatisés ; `npm run typecheck` avant chaque push
- Favoris identifiés par `userId` (hash du jeton visiteur) ; un visiteur ne peut effacer que les siens
- Sous-dossiers : `photos.subfolder` reste plat (nom de feuille). La hiérarchie (2 niveaux, groupes) et l'ordre d'affichage sont dans `galleries.folder_tree` (JSONB, `[{name, children?}]`). Helpers purs dans `galleryService.ts` (`buildFolderSections`, `flattenFolderSections`)
- Consignes de sélection : modèles dans `instruction_templates`, copie par galerie dans `galleries.instructions` (`null` = désactivées). Le quota est un avertissement, jamais bloquant
- Photos : `photos.bucket_path` est le chemin réel dans le bucket ; `thumbnail_url`, `width`, `height` alimentés à l'upload (vignettes générées dans le navigateur). Les grilles affichent `photoSrc(photo, 'grid')`, la lightbox l'original
- Le drapeau `is_public` n'est plus exposé (sans effet fonctionnel)
- Audit et plan de remédiation : `docs/plans/2026-09-12-audit-remediation.md`
