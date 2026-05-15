# Implémentation du Filtre Multi-Critère et Arbre de Catégories

Ce document explique l'approche technique choisie pour la recherche multi-critères, le filtrage imbriqué parent/enfant, ainsi que l'interface de sélection au survol.

## 1. Concept Global : Approche Hybride API / Client

En raison de la rigidité de l'API XML de PrestaShop (difficulté d'appliquer des filtres de type "supérieur à", "inférieur à", ou des requêtes conditionnelles "OU"), la décision a été prise de faire de la **récupération de masse et du filtrage client-side**.

1. **Service API (`Product.js`) :** Effectue une requête avec `limit=500` et inclut certains filtres de base via l'API (comme le nom `%LIKE%`).
2. **Filtrage Post-Fetch :** Le reste des filtres complexes (prix, catégories imbriquées) s'exécute directement en JavaScript après parsing du XML.

## 2. Filtrage par Catégorie (Logique Parent/Enfant)

L'un des défis majeurs fut la gestion des produits assignés à différentes catégories dans PrestaShop. Interroger uniquement le champ `id_category_default` empêchait de trouver des produits (exemple : un T-Shirt assigné à la catégorie fille "Homme" n'apparaissait pas en filtrant sur la catégorie mère "Vêtements").

### La construction de la requête
Lorsqu'un utilisateur sélectionne une catégorie (parent ou enfant), le composant `ProductSearch` génère une chaîne associant les identifiants concernés via le séparateur `|`.
*Ex: Si "Vêtements" (ID 3) a pour enfants "Homme" (ID 4) et "Femme" (ID 5), la valeur envoyée au service sera : `3|4|5`.*

### Le traitement côté Service (`getAllProducts`)
1. On décode la chaîne avec `.split('|')`.
2. Pour chaque produit, on itère sur `.associations.categories.category` pour extraire tous les identifiants auxquels le produit est rattaché (au lieu de se limiter à `id_category_default`).
3. Si un seul des identifiants des catégories demandées (ex: 3, 4 ou 5) est trouvé dans le tableau des associations du produit, le produit est conservé.

## 3. Filtrage par Différence de Prix

Les limites min et max de prix sont appliquées strictement via Javascript après la récupération des données :
```javascript
if (filters.minPrice) products = products.filter(p => parseFloat(p.price) >= parseFloat(filters.minPrice));
if (filters.maxPrice) products = products.filter(p => parseFloat(p.price) <= parseFloat(filters.maxPrice));
```

## 4. Affichage UI (Survol et Menu Déroulant)

Le composant `ProductSearch.jsx` inclut un menu déroulant pour les catégories filles qui apparaît au survol de la catégorie mère.

### Logique d'affichage de l'arbre
Le service `getCategories` retourne toutes les catégories. Le code construit un arbre (`categoriesTree`), excluant les catégories "Root" ou "Accueil", et liant chaque enfant à son `id_parent`.

### Persistance du Survol (CSS)
Afin d'éviter que le menu enfant ne disparaisse dès que la souris quitte le bouton parent (cette zone flottante entre le bouton et le sous-menu) :
Le fichier `ProductSearch.css` gère le `.dropdown` de cette manière :
```css
.dropdown {
  position: relative;
  display: inline-block;
  padding-bottom: 12px; /* Étend physiquement le bloc pour couvrir le vide */
  margin-bottom: -12px; /* Compense le padding pour ne pas abîmer la mise en page */
}
```
L'état local React (`openDropdown`) gère ensuite le déclenchement des survols `onMouseEnter` et `onMouseLeave`, avec en prime une vérification permettant de fermer le menu lors d'un clic extérieur (via `useRef` et `handleClickOutside`).

## Résumé
L'architecture actuelle garantit que tous les produits associés à des sous-catégories sont bien récupérés lorsque le parent est appelé, et offre une interface fluide et sans "zones mortes" pour l'utilisateur.