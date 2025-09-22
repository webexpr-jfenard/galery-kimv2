# 🔐 Sécurité des API Supabase

## Configuration sécurisée

Vos clés API Supabase sont maintenant protégées via des variables d'environnement.

### Fichiers concernés
- `.env.local` : Contient vos vraies clés (JAMAIS commité sur Git)
- `.gitignore` : Empêche le commit des fichiers sensibles

### Variables d'environnement
```
VITE_SUPABASE_URL=https://ugfkyfmthbwqoeauyqlz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ⚠️ Sécurité importante

### Côté client (Frontend)
- Les clés `anon` Supabase sont visibles côté client
- Elles sont protégées par les RLS (Row Level Security) de Supabase
- **JAMAIS** mettre de clés `service_role` côté client

### Recommandations supplémentaires

1. **RLS (Row Level Security)**
   - Activez RLS sur toutes vos tables Supabase
   - Définissez des politiques strictes

2. **Rotation des clés**
   - Changez régulièrement vos clés Supabase
   - Mettez à jour le `.env.local` correspondant

3. **Environnements multiples**
   - `.env.local` : Développement local
   - `.env.production` : Production (si nécessaire)

4. **Monitoring**
   - Surveillez l'usage API dans votre dashboard Supabase
   - Alertes en cas d'utilisation anormale

## 🚨 En cas de fuite

Si vos clés sont exposées :
1. Régénérez immédiatement dans Supabase
2. Mettez à jour `.env.local`
3. Redémarrez l'application
4. Vérifiez les logs d'accès Supabase

## 📋 Checklist sécurité

- [x] Clés déplacées vers `.env.local`
- [x] `.env.local` ajouté au `.gitignore`
- [x] Services modifiés pour utiliser `import.meta.env`
- [ ] RLS activé sur tables Supabase
- [ ] Politiques RLS définies
- [ ] Monitoring configuré