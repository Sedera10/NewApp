# Étapes de l’import de données

## `importFile1(csvFile, onProgress)`
Importe les **produits de base**.

### Étapes
1. **Parsing CSV**
   - Lit le fichier CSV avec `Papa.parse`.
   - Vérifie qu’il n’est pas vide.

2. **Création des catégories**
   - Extrait les catégories uniques depuis la colonne `categorie`.
   - Génère le XML de catégorie.
   - Crée chaque catégorie via l’API PrestaShop.
   - Construit une map `categorie -> id`.

3. **Création des taxes**
   - Extrait les taux de taxe depuis la colonne `Taxe`.
   - Génère le XML de taxe.
   - Crée chaque taxe via l’API.
   - Construit une map `taux -> id`.

4. **Création des groupes de règles de taxe**
   - Crée un groupe de taxe pour chaque taux.
   - Construit une map `taux -> tax_rule_group_id`.

5. **Création des règles de taxe**
   - Associe chaque taxe à son groupe.
   - Crée les règles dans PrestaShop.

6. **Création des produits**
   - Pour chaque ligne du CSV :
     - récupère la catégorie et la taxe,
     - vérifie les IDs dans les maps,
     - génère le XML produit,
     - crée le produit via l’API,
     - stocke `id`, `priceHT`, `taxRate`, etc.

7. **Résumé**
   - Compte les créations réussies et les erreurs.
   - Retourne `results`.

---

## `importFile2(csvFile, file1Results, onProgress)`
Importe les **variantes / attributs / stocks**.

### Étapes
1. **Parsing CSV**
   - Lit le CSV.
   - Vérifie qu’il n’est pas vide.

2. **Préparation des produits**
   - Construit une map des produits de `importFile1` : `reference -> id_product`.

3. **Création des groupes d’attributs**
   - Extrait les valeurs uniques de `specificité`.
   - Crée les groupes d’attributs dans PrestaShop.
   - Construit une map `groupe -> id`.

4. **Création des attributs**
   - Extrait les valeurs uniques de `karazany` par groupe.
   - Crée les valeurs d’attribut.
   - Construit une map `groupe:valeur -> id`.

5. **Création des combinaisons**
   - Pour chaque ligne :
     - récupère la référence produit,
     - récupère l’attribut correspondant,
     - calcule l’impact de prix si besoin,
     - génère le XML de combinaison,
     - crée la combinaison via l’API.
   - Prépare ensuite les stocks à mettre à jour.

6. **Mise à jour des stocks**
   - Récupère tous les `stock_availables`.
   - Pour chaque stock à mettre à jour :
     - retrouve le bon enregistrement,
     - construit un XML complet,
     - met à jour la quantité.

7. **Résumé**
   - Retourne les groupes, attributs, combinaisons, stocks et erreurs.

---

## `importFile3(file, file1Results, file2Results, onProgress)`
Importe les **clients, adresses, paniers et commandes**.

### Étapes
1. **Parsing CSV**
   - Lit le fichier CSV.
   - Vérifie qu’il n’est pas vide.

2. **Préparation des maps**
   - Construit une map des produits depuis `file1Results`.
   - Construit une map des combinaisons depuis `file2Results`.

3. **Chargement des données PrestaShop**
   - Récupère les `order_states`.
   - Récupère les transporteurs (`carriers`).
   - Récupère les clients existants pour éviter les doublons.

4. **Traitement ligne par ligne**
   - Lit :
     - `email`
     - `nom`
     - `pwd`
     - `adresse`
     - `achat`
     - `etat`
     - `date`

5. **Création ou récupération du client**
   - Si le client existe déjà :
     - réutilise son `id`, `secure_key`, `id_shop_group`.
   - Sinon :
     - génère le XML client,
     - crée le client,
     - ajoute le client au cache local.

6. **Création de l’adresse**
   - Génère le XML adresse.
   - Crée l’adresse via l’API.
   - Récupère `addressId`.

7. **Calcul des totaux**
   - Parse le champ `achat`.
   - Pour chaque article :
     - retrouve le produit,
     - calcule le prix HT / TTC,
     - calcule le total de commande.

8. **Création du panier**
   - Prépare les lignes de panier (`cartItems`).
   - Génère le XML `cart`.
   - Crée le panier via l’API.
   - Récupère `cartId`.

9. **Création de la commande**
   - Si `etat !== "dans le panier"` :
     - génère le XML de commande,
     - crée la commande via l’API,
     - récupère `orderId`.
   - Si l’API renvoie une erreur mais que la commande existe quand même :
     - cherche la commande via `id_cart`,
     - reprend le flux avec cette commande.

10. **Mise à jour des dates**
   - Récupère la commande fraîchement créée.
   - Recrée un XML de mise à jour.
   - Met à jour la commande.
   - Dans le flux actuel, l’objectif est de corriger les dates **sans toucher au statut**.

11. **Enregistrement côté application**
   - Ajoute les détails de commande dans `results.orderDetails`.
   - Ajoute éventuellement l’historique d’annulation si l’état est annulé.

12. **Cas “dans le panier”**
   - Si `etat === "dans le panier"` :
     - crée seulement le panier,
     - n’insère pas de commande.

13. **Résumé**
   - Retourne clients, adresses, commandes, détails et erreurs.

---

## `importFile4(imageFiles, file1Results, onProgress)`
Importe les **images de produits**.

### Étapes
1. **Validation d’entrée**
   - Vérifie qu’au moins une image est fournie.
   - Vérifie que `file1Results.products` existe.

2. **Préparation des produits**
   - Construit une map `reference -> id produit`.

3. **Filtrage des fichiers**
   - Garde seulement les extensions autorisées :
     - `.png`
     - `.jpg`
     - `.jpeg`

4. **Import image par image**
   - Pour chaque fichier :
     - extrait la référence depuis le nom du fichier,
     - cherche le produit correspondant,
     - upload l’image via l’API,
     - enregistre le résultat.

5. **Résumé**
   - Retourne les images importées et les erreurs.

---

## `rollbackAllImports()`
Annule tout si une erreur survient.

### Étapes
1. Affiche un message de rollback.
2. Appelle `resetAllData(...)`.
3. Supprime les données importées.
4. Retourne un message de fin.
5. En cas d’échec, remonte l’erreur.

---

## Flux global
1. `importFile1` → produits de base
2. `importFile2` → attributs, variantes, stocks
3. `importFile3` → clients, adresses, paniers, commandes
4. `importFile4` → images
5. En cas d’erreur à une étape :
   - `rollbackAllImports()`

## Principe
- **Tout ou rien**
- Si une étape échoue, on annule l’import complet.