# 🛠️ Guide de Résolution des Problèmes

Ce document liste les problèmes courants et leurs solutions pour le système de galerie photo.

## 📧 Problèmes d'Email

### ❌ Erreur: "A server error occurred"
**Symptôme**: `POST /api/send-email 500 (Internal Server Error)`
**Cause**: Configuration Resend manquante ou incorrecte

**Solutions**:
1. **Vérifier la variable d'environnement**:
   - Assurez-vous que `RESEND_API_KEY` est définie côté serveur
   - Pour Vercel: Settings > Environment Variables
   - Pour local: fichier `.env` à la racine

2. **Vérifier la configuration Resend**:
   - Domaine vérifié dans Resend
   - API key valide et active
   - Email expéditeur appartenant au domaine vérifié

3. **Fallback vers mailto**:
   - Désactivez le switch Resend dans la configuration
   - Utilisez le mode traditionnel comme alternative

### ❌ Erreur: "Unexpected token 'A'"
**Symptôme**: `SyntaxError: Unexpected token 'A', "A server e"... is not valid JSON`
**Cause**: L'API route retourne du HTML au lieu de JSON

**Solution**: ✅ Corrigé dans cette version
- Utilisation correcte de `res.setHeader()` au lieu de `res.setHeaders()`
- Gestion d'erreur appropriée avec retour JSON

## 📁 Problèmes de Sélection/Upload

### ❌ Erreur: "new row violates row-level security policy"
**Symptôme**: Échec de soumission de sélection avec erreur RLS
**Cause**: Politiques de sécurité Supabase restrictives pour le bucket photos

**Solution**: ✅ Corrigé dans cette version
- Upload dans le dossier `selections/` avec politiques adaptées
- Système de fallback avec blob URLs locaux
- Rétrocompatibilité avec l'ancien système

**Code de résolution**:
```typescript
// Utilisation du dossier selections avec fallback
const filePath = `selections/${galleryId}/${fileName}`;

if (!uploadResult.success) {
  // Fallback vers blob URL local
  const blob = new Blob([textContent], { type: 'text/plain' });
  const downloadUrl = URL.createObjectURL(blob);
  return { success: true, fileName, downloadUrl, isTemporary: true };
}
```

### ❌ Erreur: "Photos sans nom" ou données manquantes
**Symptôme**: Fichier de sélection avec des données "undefined"
**Cause**: Problème de déduplication ou de récupération des données photos

**Solution**: ✅ Corrigé dans version précédente
- Regroupement correct des photos par ID
- Récupération des données réelles depuis galleryService
- Attribution correcte des commentaires

## 🔧 Configuration et Déploiement

### ❌ API Route non trouvée
**Symptôme**: `404 Not Found` sur `/api/send-email`
**Solutions**:
1. **Vérifier l'emplacement du fichier**:
   - Doit être dans `/api/send-email.ts` (racine du projet)
   - Pas dans `/src/api/`

2. **Redéployment requis**:
   - Les API routes nécessitent un nouveau déploiement
   - Vérifier que le fichier est bien inclus dans le build

### ❌ Variables d'environnement non accessibles
**Symptôme**: `RESEND_API_KEY environment variable not configured`
**Solutions**:
1. **Vérifier le déploiement**:
   - Variables ajoutées dans la plateforme (Vercel, Netlify, etc.)
   - Redéployment après ajout des variables

2. **Vérifier le nom exact**:
   - Doit être exactement `RESEND_API_KEY`
   - Respecter la casse

## 🌐 Problèmes CORS

### ❌ Erreur CORS
**Symptôme**: Blocage par la politique CORS
**Solution**: ✅ Corrigé dans cette version
- Headers CORS appropriés ajoutés à l'API route
- Support des requêtes préflight OPTIONS

## 📊 Monitoring et Debug

### 🔍 Logs utiles
**Console du navigateur**:
```javascript
// Vérifier la configuration Resend
console.log('Resend configured:', resendEmailService.isConfigured());

// Logs d'upload
console.log('Upload result:', uploadResult);

// Logs d'email
console.log('Email result:', emailResult);
```

**Logs serveur** (Vercel Functions):
- Onglet "Functions" dans le dashboard Vercel
- Voir les logs en temps réel
- Erreurs Resend API visibles ici

### 🧪 Tests de validation
**Test de configuration email**:
1. Admin Panel > Email Config
2. Configurer les paramètres
3. Cliquer "Tester l'email"
4. Vérifier réception

**Test de sélection complète**:
1. Créer une galerie test
2. Sélectionner quelques photos
3. Ajouter des commentaires
4. Soumettre la sélection
5. Vérifier l'email reçu et le fichier téléchargé

## 🚀 Bonnes Pratiques

### ✅ Configuration recommandée
1. **Mode Resend pour production**:
   - Plus fiable que mailto
   - Pas de dépendance au client email
   - Logs et métriques

2. **Mode mailto pour développement**:
   - Pas de configuration externe requise
   - Test immédiat
   - Pas de coût

### ✅ Surveillance
1. **Dashboard Resend**:
   - Surveiller le taux de livraison
   - Vérifier les bounces
   - Analyser les erreurs

2. **Logs application**:
   - Console navigateur pour debug client
   - Logs serveur pour erreurs API
   - Métriques Supabase pour storage

## 📞 Support

### 🔗 Ressources externes
- [Documentation Resend](https://resend.com/docs)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/row-level-security)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

### 🐛 Signaler un problème
Si vous rencontrez un problème non documenté ici:
1. Vérifier les logs navigateur et serveur
2. Tester avec la configuration minimale
3. Documenter les étapes de reproduction
4. Inclure les messages d'erreur exacts

---

Cette documentation sera mise à jour au fur et à mesure des corrections et améliorations. 📸✨