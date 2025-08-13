# 📧 Configuration Gmail SMTP

Guide simple pour configurer l'envoi automatique d'emails via Gmail.

## 🔐 Étape 1 : Préparer votre compte Gmail

### 1. Activer la validation en 2 étapes
1. Allez sur [myaccount.google.com](https://myaccount.google.com)
2. Cliquez sur **"Sécurité"** dans le menu de gauche
3. Trouvez **"Validation en 2 étapes"**
4. Activez-la si ce n'est pas déjà fait

### 2. Générer un mot de passe d'application
1. Toujours dans **"Sécurité"**
2. Cliquez sur **"Mots de passe des applications"**
3. Sélectionnez **"Autre (nom personnalisé)"**
4. Tapez : `Galerie Photo`
5. Cliquez **"Générer"**
6. **📋 Copiez le mot de passe généré** (16 caractères comme `abcd-efgh-ijkl-mnop`)

## ⚙️ Étape 2 : Configuration Vercel

### Variables d'environnement requises

Dans votre projet Vercel, allez dans **Settings > Environment Variables** et ajoutez :

```bash
GMAIL_USER=votre-email@gmail.com
GMAIL_APP_PASSWORD=abcd-efgh-ijkl-mnop
```

**⚠️ Important :** 
- Utilisez votre **email Gmail complet**
- Utilisez le **mot de passe d'application** (pas votre mot de passe Gmail normal)

## 🚀 Étape 3 : Configuration dans l'interface

1. Allez dans l'**Admin Panel** de votre galerie
2. Cliquez sur **"Gmail Config"**
3. Remplissez :
   - **Email du photographe** : L'email qui recevra les notifications
   - **Nom du photographe** : Votre nom (optionnel)
   - **Notifications activées** : Coché
4. Cliquez **"Tester Gmail"** pour vérifier
5. **Sauvegardez** la configuration

## ✅ Étape 4 : Test complet

### Test de configuration
1. Dans l'interface, cliquez **"Tester Gmail"**
2. Vérifiez votre boîte de réception
3. Vous devriez recevoir un email de test

### Test de sélection complète
1. Créez une galerie de test
2. Sélectionnez quelques photos
3. Soumettez la sélection
4. Vérifiez l'email automatique reçu

## 🔧 Dépannage

### ❌ "Gmail configuration missing"
**Cause** : Variables d'environnement manquantes
**Solution** :
1. Vérifiez que `GMAIL_USER` et `GMAIL_APP_PASSWORD` sont bien définies dans Vercel
2. Redéployez l'application après ajout des variables

### ❌ "Authentication failed"
**Cause** : Problème d'authentification Gmail
**Solutions** :
1. Vérifiez que la validation en 2 étapes est activée
2. Regénérez un nouveau mot de passe d'application
3. Vérifiez que vous utilisez le mot de passe d'application (pas le mot de passe Gmail)

### ❌ "Gmail email error"
**Cause** : Problème d'envoi
**Solutions** :
1. Vérifiez la connexion internet
2. Essayez avec un autre email de destination
3. Consultez les logs Vercel pour plus de détails

## 📊 Fonctionnement

### Envoi automatique
Quand un client soumet sa sélection :
1. Le fichier de sélection est créé automatiquement
2. Un email est envoyé via Gmail SMTP
3. L'email contient :
   - Détails de la sélection
   - Informations client
   - Lien de téléchargement du fichier
   - Liste des photos sélectionnées

### Format de l'email
- **Expéditeur** : `"Galerie Photo" <votre-gmail@gmail.com>`
- **Destinataire** : Email configuré dans l'interface
- **Sujet** : `📸 Nouvelle sélection - [Nom de la galerie] (X photos)`
- **Contenu** : HTML professionnel avec tous les détails

## 💡 Conseils

### ✅ Bonnes pratiques
- Utilisez un Gmail dédié pour la galerie si possible
- Testez régulièrement l'envoi d'emails
- Gardez le mot de passe d'application en sécurité
- Vérifiez les spams si vous ne recevez pas les emails

### ✅ Sécurité
- Ne partagez jamais votre mot de passe d'application
- Supprimez les mots de passe d'application non utilisés
- Surveillez l'activité de votre compte Gmail

---

## 🎉 Résultat

Avec cette configuration :
- ✅ **Envoi automatique** d'emails professionnels
- ✅ **Aucune action manuelle** requise
- ✅ **Notifications instantanées** des sélections clients
- ✅ **Format professionnel** avec toutes les informations
- ✅ **Fiabilité** de Gmail SMTP

Votre galerie photo enverra automatiquement des notifications par Gmail à chaque sélection client ! 📧✨