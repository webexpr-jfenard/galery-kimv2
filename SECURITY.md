# Sécurité — Galerie Kim

État après la remédiation de l'audit du 12 septembre 2026. Ce document décrit ce qui protège
réellement l'application, et ce qui reste à la charge de l'exploitant.

## Modèle

Le navigateur est public : il ne détient aucun secret. Toute autorisation est vérifiée par la
base de données (politiques RLS) ou par une fonction serverless Vercel.

| Acteur | Preuve d'identité | Ce qu'il peut faire |
|---|---|---|
| Visiteur anonyme | Rien | Lire les galeries, photos, favoris et commentaires. Vérifier un mot de passe de galerie (RPC). |
| Visiteur identifié | Jeton secret aléatoire dans son navigateur, envoyé en en-tête `x-user-token` ; `user_id = sha256(jeton)` | Créer, modifier et supprimer **ses** favoris et commentaires. |
| Admin (Kim, Jeremy) | Session Supabase Auth (e-mail + mot de passe) et présence dans `admin_users` | Tout : galeries, photos, storage, modèles de consignes, mots de passe de galerie, effacement des sélections. |

Fonctions Postgres : `is_admin_user()` (membre de `admin_users` pour `auth.uid()`),
`request_user_id()` (hash de l'en-tête), `verify_gallery_password()` et `set_gallery_password()`
(hachage bcrypt dans `gallery_secrets`, table sans aucune politique de lecture).

## Ce qui est en place

- RLS activée sur toutes les tables ; écritures `galleries`, `photos`, `instruction_templates`
  réservées à `is_admin_user()` ; écritures `favorites`/`comments` limitées au propriétaire du
  jeton ou à un admin ; `admin_users`, `gallery_secrets`, `app_config` illisibles pour les clients.
- Storage `photos` : lecture publique (les galeries sont partagées par lien), écriture et suppression
  réservées aux admins. Aucun upload anonyme.
- Mots de passe de galerie hachés (bcrypt), jamais renvoyés au client ; `galleries.has_password`
  ne dit que « protégée ou non ».
- E-mail : `api/notify-selection.js` fixe le destinataire côté serveur (`NOTIFY_TO`, sinon
  `GMAIL_USER`), construit le message lui-même, joint le fichier de sélection, limite à 30 requêtes
  par 10 minutes et par adresse IP, TLS strict. Rien n'est stocké dans le bucket.
- Aucune variable `VITE_*` sensible : seules l'URL et la clé anon Supabase (publiques par nature)
  sont dans le bundle.
- Comptes admin : créés à la main dans le tableau de bord Supabase (inscriptions désactivées),
  puis inscrits dans `admin_users`. Verrouillage, expiration et réinitialisation de mot de passe
  gérés par Supabase Auth.

## Limites connues

- Les lectures restent publiques par conception : quiconque a le lien d'une galerie voit ses
  photos, les prénoms des personnes qui ont sélectionné et leurs commentaires.
- La vérification d'un mot de passe de galerie n'est pas limitée en débit côté base ; un mot de
  passe faible reste devinable. Choisir des mots de passe longs.
- La limite de débit de l'endpoint e-mail est en mémoire, donc approximative sur Vercel.
- `is_admin()` (ancien mécanisme par en-tête) existe encore pendant la transition ; à supprimer
  avec la migration `security_finalize` une fois la connexion des admins vérifiée.

## Variables d'environnement

Frontend (Vite) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Vercel (fonctions) : `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NOTIFY_TO` (optionnel), `SITE_URL` (optionnel).
Obsolètes, à supprimer : `VITE_ADMIN_SECRET`, `VITE_ADMIN_PASSWORD`, `VITE_GMAIL_API_SECRET`, `GMAIL_API_SECRET`.

## Procédures

- **Ajouter un admin** : Supabase → Authentication → Users → Add user (auto-confirm), puis
  `insert into admin_users (user_id, email) values ('<uuid>', '<email>')`.
- **Retirer un admin** : supprimer la ligne dans `admin_users` (et l'utilisateur Auth).
- **Incident e-mail** : révoquer le mot de passe d'application Gmail, en générer un nouveau, mettre
  à jour `GMAIL_APP_PASSWORD` sur Vercel.
- **Vérifier** : `curl -X POST https://<site>/api/notify-selection -d '{}'` doit répondre 400 sans
  rien envoyer ; un `DELETE` sur `favorites` avec la clé anon sans jeton ne doit toucher aucune ligne.
