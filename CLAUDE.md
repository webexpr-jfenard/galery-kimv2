# Galerie Kim v2

Application de galerie photo professionnelle pour la photographe Kim Redler. Permet de partager des galeries avec des clients, qui peuvent sélectionner leurs photos favorites et laisser des commentaires.

## Stack technique

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **UI**: Radix UI primitives + shadcn/ui components + Lucide icons
- **Backend**: Supabase (PostgreSQL + Storage + RLS)
- **Hosting**: Vercel (SPA + serverless functions)
- **Email**: Gmail SMTP via nodemailer (Vercel serverless)
- **Routing**: Hash-based SPA routing (`#/gallery/xxx`, `#/admin`, etc.)

## Supabase

- **Project ID**: `ugfkyfmthbwqoeauyqlz`
- **URL**: `https://ugfkyfmthbwqoeauyqlz.supabase.co`
- **MCP Server**: `supabase-galery-kim` (configuré dans `.mcp.json`)
- **Tables**: `galleries`, `favorites`, `comments`
- **Storage bucket**: `photos` (galeries + sélections exportées)
- **Schema SQL**: `SUPABASE_TABLE_SETUP.sql`
- **Migrations**: `supabase/migrations/`

## Architecture

### Routes (hash-based dans App.tsx)
| Route | Composant | Auth |
|-------|-----------|------|
| `/` | HomePage | Non |
| `/gallery/{id}` | PhotoGallery | Mot de passe galerie (optionnel) |
| `/favorites/{id}` | FavoritesPage | Non |
| `/admin` | AdminPanel | Mot de passe admin |
| `/admin/quote-calculator` | QuoteCalculator (via AdminPanel) | Mot de passe admin |

### Services (`services/`)
| Service | Rôle |
|---------|------|
| `authService.ts` | Auth admin (password, session localStorage, rate limiting) |
| `galleryService.ts` | CRUD galeries + photos, auth galerie |
| `favoritesService.ts` | Favoris + commentaires (Supabase + localStorage fallback) |
| `selectionService.ts` | Export sélections → fichier texte + upload + email |
| `userService.ts` | Session utilisateur (nom, userId, deviceId) |
| `gmailService.ts` | Envoi email via `/api/send-gmail-final` |
| `supabaseService.ts` | Client Supabase |
| `emailService.ts` | Service mailto (fallback) |
| `smtpEmailService.ts` | SMTP générique (OVH, etc.) |
| `resendEmailService.ts` | Resend API (placeholder, pas intégré) |
| `storageService.ts` | Abstraction stockage |
| `commentsService.ts` | Legacy comments (deprecated, remplacé par favoritesService) |

### Composants principaux (`components/`)
| Composant | Rôle |
|-----------|------|
| `AdminPanel.tsx` | Panel admin complet (CRUD galeries, uploads, stats, config) |
| `PhotoGallery.tsx` | Vue galerie client (masonry, subfolders, favoris, commentaires) |
| `FavoritesPage.tsx` | Page sélection (avec filtre par personne pour admin) |
| `QuoteCalculator.tsx` | Calculateur de devis photo |
| `Lightbox.tsx` | Visionneuse plein écran |
| `SelectionSubmitButton.tsx` | Export sélection + envoi email |
| `AuthDialog.tsx` | Dialog mot de passe (admin + galerie) |
| `UserNameDialog.tsx` | Dialog identification utilisateur |

### API Serverless (`api/`)
| Endpoint | Rôle |
|----------|------|
| `send-gmail-final.js` | Envoi email Gmail SMTP (auth Bearer token optionnel) |
| `send-gmail.js` | Alternative avec vérification SMTP |
| `send-gmail-simple.js` | Version simplifiée/mock |

## Commandes

```bash
npm run dev      # Serveur de dev Vite
npm run build    # Build production
npm run preview  # Preview du build
```

## Variables d'environnement

### `.env.local` (frontend - Vite)
```
VITE_SUPABASE_URL=https://ugfkyfmthbwqoeauyqlz.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_PASSWORD=...          # Optionnel, fallback: admin123
VITE_GMAIL_API_SECRET=...        # Token pour auth API email
```

### Vercel (serverless functions)
```
GMAIL_USER=...                   # Adresse Gmail expéditeur
GMAIL_APP_PASSWORD=...           # App password Gmail (2FA requis)
GMAIL_API_SECRET=...             # Token Bearer pour protéger l'API
```

## GitHub

- **Repo**: `webexpr-jfenard/galery-kimv2`
- **Compte GitHub actif**: `webexpr-jfenard` (switcher avec `gh auth switch`)
- **Branche principale**: `main`

## Conventions

- Français pour l'UI, anglais pour le code
- Services singleton exportés (`export const xxxService = new XxxService()`)
- Toast notifications via `sonner`
- Pas de tests automatisés (pas de framework de test configuré)
- Auth admin côté client uniquement (localStorage)
- Favoris identifiés par `userId` (pas `deviceId`)
