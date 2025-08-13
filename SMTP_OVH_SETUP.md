# 📧 Configuration SMTP OVH pour l'envoi d'emails automatique

Ce guide explique comment configurer l'envoi automatique d'emails via SMTP OVH (ou autres fournisseurs SMTP) pour les notifications de sélection client.

## 🎯 Avantages du SMTP vs Resend

| Critère | SMTP (OVH) | Resend |
|---------|------------|--------|
| **Coût** | Inclus avec hébergement | 100 emails/mois gratuits |
| **Configuration** | Variables d'env + interface | Domaine vérifié + API key |
| **Simplicité** | Plus technique | Plus simple |
| **Contrôle** | Total sur votre serveur | Service externe |

## ⚙️ Configuration OVH

### 1. Obtenir vos paramètres SMTP OVH

Dans votre **espace client OVH** :

1. Allez dans **"Web Cloud" > "Emails"**
2. Sélectionnez votre nom de domaine
3. Cliquez sur l'email que vous voulez utiliser
4. Notez les paramètres SMTP :

```
Serveur SMTP: ssl0.ovh.net
Port: 587 (STARTTLS) ou 465 (SSL)
Sécurité: STARTTLS ou SSL/TLS
Authentification: Oui
Nom d'utilisateur: votre-email@votre-domaine.com
Mot de passe: mot de passe de l'email
```

### 2. Variables d'environnement

Ajoutez ces variables dans votre `.env` (ou variables d'environnement de votre plateforme) :

```bash
# Configuration SMTP OVH
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@votre-domaine.com
SMTP_PASS=votre-mot-de-passe-email
```

**Notes importantes :**
- `SMTP_SECURE=false` pour le port 587 (STARTTLS)
- `SMTP_SECURE=true` pour le port 465 (SSL)
- Utilisez un email dédié comme `noreply@` ou `photo@`

## 🚀 Configuration dans l'interface

### 1. Ouvrir la configuration email

1. Allez dans l'**Admin Panel** de votre galerie
2. Cliquez sur **"Email Config"**
3. Sélectionnez **"SMTP (OVH)"** dans les méthodes d'envoi

### 2. Remplir les paramètres

- **Serveur SMTP** : `ssl0.ovh.net`
- **Port SMTP** : `587`
- **Email expéditeur** : `noreply@votre-domaine.com` (même que SMTP_USER)
- **Email du photographe** : `photographe@votre-domaine.com`
- **Nom du photographe** : `Votre Nom`
- **Connexion sécurisée** : Décoché (pour port 587)

### 3. Tester la configuration

1. Cliquez **"Tester l'email"**
2. Vérifiez la réception dans votre boîte email
3. Sauvegardez la configuration si le test fonctionne

## 🌐 Déploiement

### Vercel

1. Dans votre projet Vercel : **Settings > Environment Variables**
2. Ajoutez chaque variable SMTP :
   ```
   SMTP_HOST = ssl0.ovh.net
   SMTP_PORT = 587
   SMTP_SECURE = false
   SMTP_USER = noreply@votre-domaine.com
   SMTP_PASS = votre-mot-de-passe
   ```
3. Redéployez votre application

### Autres plateformes

- **Netlify** : Site settings > Build & deploy > Environment variables
- **Railway** : Variables tab dans votre projet  
- **Heroku** : Config Vars dans les settings

## 🔧 Autres fournisseurs SMTP

### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=mot-de-passe-application  # Pas votre mot de passe normal !
```

**Important** : Pour Gmail, utilisez un "mot de passe d'application" généré dans votre compte Google.

### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@outlook.com
SMTP_PASS=votre-mot-de-passe
```

### Free
```bash
SMTP_HOST=smtp.free.fr
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-login-free
SMTP_PASS=votre-mot-de-passe-free
```

## 🛠️ Dépannage

### ❌ "SMTP connection failed"
**Solutions** :
1. Vérifiez le serveur SMTP et le port
2. Testez avec un client email (Thunderbird, Mail)
3. Vérifiez que l'email existe côté OVH
4. Essayez le port 465 avec `SMTP_SECURE=true`

### ❌ "Authentication failed"
**Solutions** :
1. Vérifiez le nom d'utilisateur (email complet)
2. Vérifiez le mot de passe
3. Assurez-vous que l'email est actif dans OVH

### ❌ "Certificate error"
**Solutions** :
1. Vérifiez `SMTP_SECURE` (false pour 587, true pour 465)
2. Essayez avec l'autre port
3. Contactez le support OVH si persistant

### ❌ Variables d'environnement non trouvées
**Cause** : Variables non définies côté serveur
**Solutions** :
1. Vérifiez que toutes les variables SMTP sont définies
2. Redémarrez l'application après ajout des variables
3. Consultez les logs de votre plateforme de déploiement

## 📊 Test complet

### 1. Test de configuration
```bash
# Dans l'interface admin
1. Configurez SMTP avec vos paramètres OVH
2. Cliquez "Tester l'email"
3. Vérifiez la réception
```

### 2. Test de sélection complète
```bash
1. Créez une galerie de test
2. Sélectionnez quelques photos
3. Soumettez la sélection  
4. Vérifiez l'email automatique reçu
```

## 💡 Bonnes pratiques

### ✅ Sécurité
- Utilisez un email dédié (`noreply@`, `galerie@`)
- Ne partagez jamais vos mots de passe SMTP
- Changez le mot de passe périodiquement

### ✅ Performance
- SMTP est généralement plus rapide que Resend pour OVH
- Moins de dépendances externes
- Fonctionne même si Resend a des problèmes

### ✅ Fiabilité
- Surveillez les bounces dans votre webmail OVH
- Gardez une configuration mailto en backup
- Testez régulièrement l'envoi

## 📈 Monitoring

### Logs côté serveur
- Consultez les logs de votre plateforme (Vercel Functions, etc.)
- Recherchez les erreurs SMTP
- Vérifiez les connexions réussies

### Côté OVH
- Consultez votre webmail pour les emails envoyés
- Vérifiez les quotas d'envoi
- Surveillez les emails en quarantaine

## 🆚 Comparaison avec les autres méthodes

| Méthode | Simplicité | Fiabilité | Coût | Contrôle |
|---------|------------|-----------|------|----------|
| **SMTP OVH** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Resend** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Mailto** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

## 🔗 Liens utiles

- [Documentation SMTP OVH](https://docs.ovh.com/fr/emails/generalites-sur-les-emails-mutualises/)
- [Paramètres serveurs OVH](https://docs.ovh.com/fr/emails/mail-mutualise-guide-de-configuration-sur-thunderbird/)
- [Troubleshooting général](./TROUBLESHOOTING.md)

---

Avec cette configuration, votre système de galerie photo enverra automatiquement des notifications professionnelles via votre serveur SMTP OVH à chaque sélection client ! 📧✨