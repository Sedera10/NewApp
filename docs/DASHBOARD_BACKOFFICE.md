# Création et Calcul du Tableau de Bord (Dashboard)

Ce document explique la mise en place du tableau de bord (Dashboard) pour l'espace administrateur (Back-Office), ainsi que la logique mathématique et algorithmique utilisée pour générer les statistiques de la boutique.

## 1. Architecture et Intégration

Le tableau de bord a été intégré au back-office existant pour permettre aux administrateurs de suivre les performances de ventes de la boutique.

- **Composant principal :** `src/pages/backoffice/dashboard/Dashboard.jsx`
- **Style :** `src/pages/backoffice/dashboard/Dashboard.css`
- **Routage (`App.jsx`) :** Ajout de la route sécurisée `/mystore/admin/dashboard` dans la structure du `Layout` d'administration.
- **Navigation (`Sidebar.jsx`) :** Ajout d'un lien "Tableau de bord" dans le menu latéral sous une nouvelle rubrique "Vue d'ensemble".

## 2. Récupération des Données

Toutes les données sont extraites directement depuis l'API PrestaShop via le service de commandes existant :
```javascript
const orders = await commandeService.getCommandes();
```
Cela permet de s'appuyer sur la même source de vérité que la liste des commandes administratives, garantissant la cohérence des chiffres.

## 3. Logique des Calculs

Une fois les commandes récupérées, le composant exécute une seule boucle sur les données pour calculer toutes les statistiques afin d'optimiser les performances (Complexité **O(N)**).

### A. Statistiques Globales (Total Général)
Deux variables accumulent les données globales :
- **Total des commandes (`totalCmd`) :** Incrémenté de `1` pour chaque commande trouvée.
- **Montant Total (`totalAmt`) :** Additionne la valeur brute de `total_paid_tax_incl` (Montant payé taxes incluses).

### B. Statistiques Par Jour (Regroupement)
Pour afficher un suivi journalier, les commandes sont regroupées dans un objet Map (`jourMap`) sous forme de dictionnaire dont la clé est la date :

1. **Extraction de la date :** 
   Le champ `date_add` de PrestaShop est au format `YYYY-MM-DD HH:MM:SS`. La date est extraite en coupant la chaîne au premier espace (ex: `2026-05-14`).
   
2. **Construction du groupe :**
   Si la date n'existe pas encore dans `jourMap`, elle est initialisée avec 0 commande et 0 montant.
   Ensuite, pour la commande en cours :
   - On incrémente le compte de commandes de cette journée.
   - On ajoute le montant (`total_paid_tax_incl`) au total de la journée.

3. **Tri chronologique :**
   Une fois l'itération terminée, l'objet Map est converti en tableau (`Object.values()`), puis trié du plus récent au plus ancien en utilisant l'objet `Date` de JavaScript :
   ```javascript
   Object.values(jourMap).sort((a, b) => new Date(b.date) - new Date(a.date));
   ```

## 4. Affichage et Formatage (UI)

- **Gestion du chargement :** Un indicateur de chargement (`Conteneur Spinner`) est affiché pendant le temps de calcul et d'appel réseau.
- **Total Général :** Affiché sous forme de Cartes (Cards) mises en avant en haut de la page.
- **Formatage des Prix :** Définition stricte avec `.toFixed(2)` pour garantir un formatage propre des monnaies (ex: `125.50 €`).
- **Tableau par jour :** Les dates de type `YYYY-MM-DD` sont transformées en format fr-FR lisible (ex: "jeudi 14 mai 2026") via l'API Intl standard (`toLocaleDateString`).

## Résumé
L'approche favorise le traitement des informations brutes côté client (Front-End) plutôt que de multiplier les requêtes complexes côté API. Cela offre un affichage quasi-instantané du tableau de bord une fois les commandes chargées dans la mémoire locale du navigateur.