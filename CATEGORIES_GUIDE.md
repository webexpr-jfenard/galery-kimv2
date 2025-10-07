# Guide d'utilisation des Catégories de Galeries

## Vue d'ensemble

La fonctionnalité de catégories vous permet d'organiser vos galeries par client ou par type de projet. C'est particulièrement utile lorsque vous avez plusieurs galeries pour un même client ou lorsque vous souhaitez regrouper vos galeries de manière logique.

## Installation

### 1. Mise à jour de la base de données

Avant d'utiliser cette fonctionnalité, vous devez exécuter le script SQL pour ajouter le champ `category` à votre table Supabase :

1. Connectez-vous à votre projet Supabase
2. Allez dans l'éditeur SQL
3. Ouvrez le fichier `SUPABASE_ADD_CATEGORY.sql`
4. Exécutez le script SQL

Le script va :
- Ajouter une colonne `category` à la table `galleries`
- Créer un index pour améliorer les performances de recherche par catégorie

## Utilisation

### Créer une galerie avec une catégorie

1. Dans le panneau admin, cliquez sur **"Créer une galerie"**
2. Remplissez le nom de la galerie
3. Dans le champ **"Catégorie (nom du client)"**, vous pouvez :
   - Sélectionner une catégorie existante dans la liste déroulante
   - Créer une nouvelle catégorie en cliquant sur **"Créer une nouvelle catégorie..."**
4. Complétez les autres champs et cliquez sur **"Créer la galerie"**

### Modifier la catégorie d'une galerie existante

1. Dans la liste des galeries, cliquez sur **"Modifier"** pour la galerie concernée
2. Utilisez le sélecteur de catégorie pour choisir ou créer une catégorie
3. Cliquez sur **"Enregistrer"**

### Visualiser les galeries par catégorie

Dans le panneau admin, vous avez deux modes d'affichage :

#### Mode Liste (par défaut)
- Affiche toutes les galeries dans une liste unique
- La catégorie est affichée comme un badge bleu à côté du nom de la galerie
- Vous pouvez rechercher par catégorie dans la barre de recherche

#### Mode Par Catégorie
1. Cliquez sur le bouton **"Par catégorie"** dans l'en-tête
2. Les galeries sont regroupées par catégorie
3. Chaque catégorie affiche :
   - Le nom de la catégorie
   - Le nombre de galeries dans cette catégorie
   - Une grille compacte des galeries

## Fonctionnalités

### Recherche intelligente
La barre de recherche prend en compte les catégories. Vous pouvez rechercher :
- Par nom de galerie
- Par ID de galerie
- Par dossier bucket
- **Par catégorie**

### Tri automatique
Les catégories sont triées alphabétiquement, avec "Sans catégorie" toujours en dernier.

### Badge visuel
Dans la vue liste, chaque galerie avec une catégorie affiche un badge bleu avec l'icône de tag et le nom de la catégorie.

### Gestion des catégories
- Les catégories sont créées automatiquement lorsque vous les utilisez pour la première fois
- Une catégorie vide n'apparaît pas dans le sélecteur
- Vous pouvez réutiliser les catégories existantes pour de nouvelles galeries

## Exemples d'utilisation

### Exemple 1 : Organisation par client
```
Catégorie : "Dupont"
  - Mariage Dupont - 15 juin 2024
  - Baby shower Dupont - 1er juillet 2024

Catégorie : "Martin"
  - Anniversaire 50 ans Martin
  - Réunion famille Martin
```

### Exemple 2 : Organisation par type d'événement
```
Catégorie : "Mariages"
  - Mariage Jean & Marie
  - Mariage Paul & Sophie

Catégorie : "Entreprise"
  - Séminaire 2024
  - Soirée de Noël
```

## Conseils d'utilisation

1. **Nommage cohérent** : Utilisez des noms de catégories cohérents (ex: "Dupont" plutôt que "M. Dupont" ou "dupont")

2. **Catégories réutilisables** : Les catégories apparaissent automatiquement dans le sélecteur pour les galeries futures

3. **Recherche rapide** : Utilisez la barre de recherche pour filtrer rapidement par catégorie

4. **Vue adaptée** :
   - Utilisez la vue "Liste" pour un accès rapide à toutes les galeries
   - Utilisez la vue "Par catégorie" pour une vision d'ensemble organisée

5. **Flexibilité** : Vous pouvez changer la catégorie d'une galerie à tout moment

## Notes techniques

- Le champ catégorie est optionnel
- Les galeries sans catégorie sont regroupées dans "Sans catégorie"
- La catégorie est stockée dans la base de données Supabase
- Un index est créé pour optimiser les recherches par catégorie
